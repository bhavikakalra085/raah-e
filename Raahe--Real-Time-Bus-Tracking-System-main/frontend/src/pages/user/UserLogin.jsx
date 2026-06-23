// src/pages/auth/UserLoginPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";

/* demo session setter - replace in production */
function setSession(session) {
  try {
    localStorage.setItem("session", JSON.stringify(session));
  } catch (e) {
    console.warn("Failed to set session", e);
  }
}

export default function UserLoginPage() {
  const { t } = useTranslation("common");

  const { setIsLoggedIn } = useAuth();
  const [role, setRole] = useState("user"); // user | driver | admin

  // identifiers
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // only used for driver login

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP state for driver
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef(null);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [prefillIdentifier, setPrefillIdentifier] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState(""); // success message after register

  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE || "";
  const DEMO_FALLBACK = true;

  function validateEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  function validatePhone(p) {
    // simple international-friendly phone check: digits, optional +, length 7-15
    return /^\+?\d{7,15}$/.test(p);
  }

  useEffect(() => {
    // when a registration happens we may prefill the appropriate identifier
    if (!prefillIdentifier) return;
    if (role === "driver") {
      setPhone(prefillIdentifier || "");
    } else {
      setEmail(prefillIdentifier || "");
    }
  }, [prefillIdentifier, role]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  async function sendOtpRequest() {
    setError("");
    if (!validatePhone(phone.trim())) {
      setError(
        "Please enter a valid phone number (digits only, 7-15 chars). e.g. +911234567890"
      );
      return false;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), role: "driver" }),
      });

      if (res.ok) {
        setOtpSent(true);
        setSecondsLeft(60);
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
          setSecondsLeft((s) => {
            if (s <= 1) {
              if (timerRef.current) window.clearInterval(timerRef.current);
              return 0;
            }
            return s - 1;
          });
        }, 1000);
        return true;
      }

      const errData = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (DEMO_FALLBACK) {
          console.warn(
            "send-otp failed, demo fallback — pretending otp sent",
            errData
          );
          setOtpSent(true);
          setSecondsLeft(60);
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = window.setInterval(() => {
            setSecondsLeft((s) => {
              if (s <= 1) {
                if (timerRef.current) window.clearInterval(timerRef.current);
                return 0;
              }
              return s - 1;
            });
          }, 1000);
          return true;
        } else {
          throw new Error(errData.message || "Failed to send OTP");
        }
      }
    } catch (err) {
      if (DEMO_FALLBACK) {
        console.warn("send-otp request failed, using demo fallback.", err);
        setOtpSent(true);
        setSecondsLeft(60);
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
          setSecondsLeft((s) => {
            if (s <= 1) {
              if (timerRef.current) window.clearInterval(timerRef.current);
              return 0;
            }
            return s - 1;
          });
        }, 1000);
        return true;
      } else {
        setError(err.message || "Failed to send OTP. Try again.");
        return false;
      }
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtpRequest() {
    setError("");
    if (!validatePhone(phone.trim())) {
      setError("Please enter a valid phone number.");
      return false;
    }
    if (otp.trim().length < 4) {
      setError("Enter the OTP you received.");
      return false;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          otp: otp.trim(),
          role: "driver",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setIsLoggedIn(true);
      
        // 🔔 notify header in this tab
        window.dispatchEvent(new Event("auth-updated"));
      
        navigate("/drivercontrol");
        return true;
      }

    } catch (err) {
      if (DEMO_FALLBACK) {
        console.warn("verify-otp request failed, demo fallback.", err);
        setSession({
          role: "driver",
          identifier: phone.trim(),
          ts: Date.now(),
        });
        navigate("/driver");
        return true;
      } else {
        setError(err.message || "OTP verification failed. Try again.");
        return false;
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    // role-aware validation
    if (role === "driver") {
      if (!otpSent) {
        await sendOtpRequest();
        return;
      }
      await verifyOtpRequest();
      return;
    }

    // email/password path for user/admin
    setError("");
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, role }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setIsLoggedIn(true);
      
        // 🔔 notify header in this tab
        window.dispatchEvent(new Event("auth-updated"));
      
        if (role === "admin") navigate("/admin");
        else navigate("/passenger");
        return;
      }
      else {
        const errData = await res.json().catch(() => ({}));
        setError(errData?.message || "Login failed.");
      }
    } catch (err) {
      if (DEMO_FALLBACK) {
        console.warn("Login request failed, using demo fallback.", err);
      } else {
        setError(err.message || "Login failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function openRegister() {
    setError("");
    setPrefillIdentifier(role === "driver" ? phone.trim() : email.trim());
    setIsRegisterOpen(true);
  }

  function handleRegisterSuccess({ identifier = "", registeredRole = "user" }) {
    setIsRegisterOpen(false);
    setError("");
    setPassword("");
    setOtp("");
    setOtpSent(false);
    setRegisterSuccess(
      "Registration successful — please login with your credentials."
    );

    setRole(registeredRole || "user");
    if (registeredRole === "driver") setPhone(identifier || "");
    else setEmail(identifier || "");

    setTimeout(() => setRegisterSuccess(""), 6000);
  }

  function handleRegisterClose() {
    setIsRegisterOpen(false);
    setError("");
  }

  async function handleResend() {
    if (secondsLeft > 0) return;
    await sendOtpRequest();
  }

  return (
    <>
      {/* <Header /> */}
      <main className="mx-auto max-w-md px-4 py-8 mt-18">
        <h1 className="text-2xl font-serif font-semibold">(User Login)</h1>
        <p className="text-sm text-gray-500">Sign in with your credentials.</p>

        {registerSuccess && (
          <div className="mt-4 p-3 rounded bg-green-50 border border-green-200 text-green-800 text-sm">
            {registerSuccess}
          </div>
        )}

        <div className="mt-4 bg-white rounded-lg shadow">
          <div className="p-4">
            {/* role chooser */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Login as:</p>
              <div className="flex gap-3">
                <RoleCard
                  role="user"
                  selected={role === "user"}
                  onClick={() => setRole("user")}
                  label="User"
                  sub="Passenger"
                />
                <RoleCard
                  role="driver"
                  selected={role === "driver"}
                  onClick={() => setRole("driver")}
                  label="Driver"
                  sub="Login by phone (OTP)"
                />
                <RoleCard
                  role="admin"
                  selected={role === "admin"}
                  onClick={() => setRole("admin")}
                  label="Admin"
                  sub="Admin portal"
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              {/* identifier field depends on role */}
              {role === "driver" ? (
                <label className="grid gap-1">
                  <span className="text-sm font-medium">Phone</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+911234567890"
                    inputMode="tel"
                    className="border rounded px-3 py-2"
                    autoComplete="tel"
                  />
                </label>
              ) : (
                <label className="grid gap-1">
                  <span className="text-sm font-medium">Email</span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    inputMode="email"
                    className="border rounded px-3 py-2"
                    autoComplete="email"
                  />
                </label>
              )}

              {/* password shown only for user/admin */}
              {role !== "driver" && (
                <label className="grid gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Password</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="text-xs text-gray-500"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    type={showPassword ? "text" : "password"}
                    className="border rounded px-3 py-2"
                    autoComplete="current-password"
                    minLength={6}
                  />
                </label>
              )}

              {/* OTP input shown only when otpSent is true */}
              {role === "driver" && otpSent && (
                <label className="grid gap-1">
                  <span className="text-sm font-medium">Enter OTP</span>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    className="border rounded px-3 py-2"
                    autoComplete="one-time-code"
                    maxLength={8}
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                    <div>
                      {secondsLeft > 0
                        ? `Resend in ${secondsLeft}s`
                        : "Didn't receive it?"}
                    </div>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={loading || secondsLeft > 0}
                      className="text-blue-600 hover:underline"
                    >
                      Resend
                    </button>
                  </div>
                </label>
              )}

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="flex flex-col items-center justify-center gap-4">
                <div className="flex gap-2 w-full justify-center">
                  {/* For drivers: primary action sends OTP or verifies OTP depending on state */}
                  {role === "driver" ? (
                    <>
                      <button
                        type="button"
                        onClick={otpSent ? verifyOtpRequest : sendOtpRequest}
                        disabled={loading}
                        className={`flex-1 px-4 py-2 rounded text-white ${
                          loading
                            ? "bg-gray-400"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {loading
                          ? otpSent
                            ? "Verifying..."
                            : "Sending OTP..."
                          : otpSent
                          ? "Verify OTP & Login"
                          : "Send OTP"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp("");
                          setSecondsLeft(0);
                        }}
                        className="px-3 py-2 rounded border"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-4 py-2 rounded text-white ${
                        loading
                          ? "bg-gray-400"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {loading ? "Signing in..." : "Login"}
                    </button>
                  )}
                </div>

                <div className="text-sm text-gray-600">
                  Not registered?{" "}
                  <button
                    onClick={openRegister}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Register
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      {isRegisterOpen && (
        <RegisterModal
          onClose={handleRegisterClose}
          prefillIdentifier={prefillIdentifier}
          DEMO_FALLBACK={DEMO_FALLBACK}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}
    </>
  );
}

/* ------------------ RegisterModal component ------------------ */
/* Role selection first, then render role-specific form */
function RegisterModal({
  onClose,
  prefillIdentifier = "",
  API_BASE = "",
  DEMO_FALLBACK = true,
  onRegisterSuccess,
}) {
  const [step, setStep] = useState("choose"); // "choose" | "form"
  const [role, setRole] = useState("user"); // admin | user | driver
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // common fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // for drivers we now collect phone
  const [password, setPassword] = useState("");
  const [contacts, setContacts] = useState([
    { label: "Mother", phone: "" },
    { label: "Friend", phone: "" },
  ]);
  const [confirm, setConfirm] = useState("");

  // driver-specific
  const [license, setLicense] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");

  // admin-specific
  const [adminCode, setAdminCode] = useState(""); // optional admin secret code

  useEffect(() => {
    if (!prefillIdentifier) return;
    if (prefillIdentifier.includes("@")) setEmail(prefillIdentifier);
    else setPhone(prefillIdentifier);
  }, [prefillIdentifier]);

  // if user switches away from "user", clear contacts UI state (optional nicety)
  useEffect(() => {
    if (role !== "user") {
      setContacts([
        { label: "Mother", phone: "" },
        { label: "Friend", phone: "" },
      ]);
    }
  }, [role]);

  function updateContact(i, key, val) {
    setContacts((s) =>
      s.map((c, idx) => (idx === i ? { ...c, [key]: val } : c))
    );
  }

  function addContact() {
    setContacts((s) => [...s, { label: "", phone: "" }]);
  }

  function normalizePhone(raw) {
    if (!raw) return "";
    const s = String(raw).replace(/[^\d+]/g, "");
    if (/^\d{10}$/.test(s)) return "+91" + s;
    if (/^\+?\d{11,15}$/.test(s)) return s.startsWith("+") ? s : "+" + s;
    return s;
  }

  function validateCommon() {
    if (!name.trim()) return "Name is required.";
    if (role !== "driver" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Valid email is required.";
    if (role === "driver" && !/^\+?\d{7,15}$/.test(phone))
      return "Valid phone is required for drivers (7-15 digits).";
    if (role !== "driver" && password.length < 6)
      return "Password must be at least 6 characters.";
    if (role !== "driver" && password !== confirm)
      return "Passwords do not match.";
    return null;
  }

  function validateRoleSpecific() {
    if (role === "driver") {
      if (!license.trim()) return "License number is required for drivers.";
      if (!vehicleNo.trim()) return "Vehicle number is required for drivers.";
    }
    if (role === "admin") {
      if (!adminCode.trim()) return "Admin code is required.";
    }
    return null;
  }

  async function handleRegister(e) {
    e.preventDefault();
    setErr("");
    const commonErr = validateCommon();
    if (commonErr) {
      setErr(commonErr);
      return;
    }
    const roleErr = validateRoleSpecific();
    if (roleErr) {
      setErr(roleErr);
      return;
    }

    // Prepare emergency contacts ONLY for 'user'
    const includeContacts = role === "user";
    const contactsClean = includeContacts
      ? (Array.isArray(contacts) ? contacts : [])
          .map((c) => ({
            label: (c.label || "").trim(),
            phone: normalizePhone(c.phone || ""),
          }))
          .filter((c) => c.phone)
      : [];

    // Shape payload per role
    const payload = {
      role,
      fullName: name.trim(),
      ...(role !== "driver" ? { email: email.trim(), password } : {}),
      ...(role === "driver"
        ? {
            phoneNumber: phone.trim(),
            licenseNumber: license.trim(),
            vehicleNumber: vehicleNo.trim(),
          }
        : {}),
      ...(role === "admin" ? { adminSecret: adminCode.trim() } : {}),
      ...(includeContacts ? { emergencyContacts: contactsClean } : {}),
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        onRegisterSuccess({
          identifier: role === "driver" ? payload.phoneNumber : payload.email,
          registeredRole: role,
          user: data.user,
        });
        return;
      }

      const dataErr = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (DEMO_FALLBACK) {
          console.warn("Register endpoint failed, demo fallback:", dataErr);
          onRegisterSuccess({
            identifier: role === "driver" ? payload.phoneNumber : payload.email,
            registeredRole: role,
          });
          return;
        } else {
          throw new Error(dataErr.message || "Registration failed");
        }
      }
    } catch (e) {
      if (DEMO_FALLBACK) {
        console.warn("Registration failed, using demo fallback", e);
        onRegisterSuccess({
          identifier: role === "driver" ? payload.phoneNumber : payload.email,
          registeredRole: role,
        });
      } else {
        setErr(e.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Register</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {step === "choose" ? (
            <>
              <p className="mb-4 text-sm text-gray-600">
                Choose your role to continue:
              </p>
              <div className="flex gap-4 mb-6">
                <RoleCard
                  role="user"
                  selected={role === "user"}
                  onClick={() => setRole("user")}
                  label="User"
                  sub="Normal passenger"
                />
                <RoleCard
                  role="driver"
                  selected={role === "driver"}
                  onClick={() => setRole("driver")}
                  label="Driver"
                  sub="Driver with vehicle details"
                />
                <RoleCard
                  role="admin"
                  selected={role === "admin"}
                  onClick={() => setRole("admin")}
                  label="Admin"
                  sub="Platform administrator"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-3 py-2 bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep("form")}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-600">
                Register as <strong>{role}</strong>
              </p>

              <form onSubmit={handleRegister} className="grid gap-3">
                <label className="grid gap-1">
                  <span className="text-sm font-medium">Full name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </label>

                {/* Email: only for user/admin */}
                {role !== "driver" && (
                  <label className="grid gap-1">
                    <span className="text-sm font-medium">Email</span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                  </label>
                )}

                {/* Phone: only for driver */}
                {role === "driver" && (
                  <label className="grid gap-1">
                    <span className="text-sm font-medium">Phone</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+911234567890"
                      inputMode="tel"
                      className="border rounded px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Phone is required for drivers and will be used to login
                      via OTP.
                    </p>
                  </label>
                )}

                {/* Passwords: only for user/admin */}
                {role !== "driver" && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">Password</span>
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        className="border rounded px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">
                        Confirm Password
                      </span>
                      <input
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        type="password"
                        className="border rounded px-3 py-2"
                      />
                    </label>
                  </div>
                )}

                {/* Emergency contacts: ONLY for user */}
                {role === "user" && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">
                        Emergency contacts (optional)
                      </div>
                      <button
                        type="button"
                        onClick={addContact}
                        className="text-sm text-blue-600"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {contacts.map((c, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            value={c.label}
                            onChange={(e) =>
                              updateContact(idx, "label", e.target.value)
                            }
                            placeholder="Label (e.g. Mother)"
                            className="w-1/3 border rounded p-2"
                          />
                          <input
                            value={c.phone}
                            onChange={(e) =>
                              updateContact(idx, "phone", e.target.value)
                            }
                            placeholder="+9198xxxxxxxx"
                            className="flex-1 border rounded p-2"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setContacts((s) => s.filter((_, i) => i !== idx))
                            }
                            className="px-2 bg-red-100 rounded"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* role-specific fields */}
                {role === "driver" && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">
                        License Number
                      </span>
                      <input
                        value={license}
                        onChange={(e) => setLicense(e.target.value)}
                        className="border rounded px-3 py-2"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">
                        Vehicle Number
                      </span>
                      <input
                        value={vehicleNo}
                        onChange={(e) => setVehicleNo(e.target.value)}
                        className="border rounded px-3 py-2"
                      />
                    </label>
                  </div>
                )}

                {role === "admin" && (
                  <label className="grid gap-1">
                    <span className="text-sm font-medium">
                      Admin secret code
                    </span>
                    <input
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      className="border rounded px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Provide your admin authorization code.
                    </p>
                  </label>
                )}

                {err && <div className="text-red-500 text-sm">{err}</div>}

                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={() => setStep("choose")}
                    className="px-3 py-2 bg-gray-100 rounded"
                  >
                    Back
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3 py-2 bg-white border rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className={`px-4 py-2 rounded text-white ${
                        loading
                          ? "bg-gray-400"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {loading ? "Registering..." : "Register"}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* Small role selection card */
function RoleCard({ role, label, sub, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 p-3 rounded-lg border text-left ${
        selected ? "border-blue-500 bg-blue-50" : "hover:border-gray-300"
      }`}
    >
      <div className="font-semibold">{label}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </button>
  );
}
