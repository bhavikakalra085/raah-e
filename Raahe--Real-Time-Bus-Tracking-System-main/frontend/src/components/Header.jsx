// src/components/Header.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nProvider";



/* ---------- small utilities ---------- */
function safeParseUser(raw) {
  try {
    if (!raw || raw === "null" || raw === "undefined") return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

function displayNameFromUser(u) {
  if (!u || typeof u !== "object") return "User";
  return (
    u.fullName?.trim() ||
    u.name?.trim() ||
    u.email?.trim() ||
    u.phoneNumber?.trim() ||
    "User"
  );
}

function getRole(u) {
  return (u?.role || "").toString().toLowerCase(); // "user" | "driver" | "admin" | ""
}

/* ---------- component ---------- */
export default function Header({
  showAbout = true,
  onToggleDark = null,
}) {
  const { t, lang, setLang } = useI18n();
  const logoText = t("header.logoText");
  const tagline = t("header.tagline");

  // Build links with translated labels
  const links = [
    { to: "/", label: t("header.nav.home") },
    { to: "/passenger", label: t("header.nav.user") },
    { to: "/drivercontrol", label: t("header.nav.driver") },
    { to: "/admin", label: t("header.nav.admin") },
    { to: "/womensafety", label: t("header.nav.womenSafety") },
    { to: "/lostnfound", label: t("header.nav.lostFound") },
  ];

  const { isLoggedIn, setIsLoggedIn } = useAuth();
  const [user, setUser] = useState(() => safeParseUser(localStorage.getItem("user")));
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [lowBandwidth, setLowBandwidth] = useState(false);

  useEffect(() => {
    function computeLow() {
      try {
        const nav = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!nav) return false;
        const et = (nav.effectiveType || "").toLowerCase();
        const dl = Number(nav.downlink || 10);
        // Heuristic: slow-2g/2g or very low downlink => low bandwidth
        return et.includes("2g") || et === "slow-2g" || dl < 1.5;
      } catch {
        return false;
      }
    }

    setLowBandwidth(computeLow());

    const nav = navigator.connection;
    if (nav && typeof nav.addEventListener === "function") {
      const onChange = () => setLowBandwidth(computeLow());
      nav.addEventListener("change", onChange);
      return () => nav.removeEventListener("change", onChange);
    }
    return;
  }, []);


  /* ---------- bootstrap auth + user ---------- */
  useEffect(() => {
    const sync = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
      setUser(safeParseUser(localStorage.getItem("user")));
    };

    // run once on mount
    sync();

    // cross-tab changes
    const handleStorageChange = (e) => {
      if (e.key === "token" || e.key === "user" || e.key === "isLoggedIn") {
        sync();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // same-tab immediate updates from login page
    window.addEventListener("auth-updated", sync);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth-updated", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- role-based link filtering ---------- */
  const HIDE_BY_ROLE = {
    driver: new Set([
      "/passenger",
      "/admin",
      "/womensafety",
      "/lostnfound",
    ]),
    user: new Set([
      "/admin",
      "/drivercontrol",
    ]),
    admin: new Set([
      "/passenger",
      "/drivercontrol",
      "/womensafety",
    ]),
  };

  const role = getRole(user); // "", "user", "driver", "admin"
  const filteredLinks = useMemo(() => {
    let out = [...links];

    const hideByRole = HIDE_BY_ROLE[role] || null;
    if (hideByRole) {
      out = out.filter((l) => !hideByRole.has(l.to));
    }

    if (!isLoggedIn) {
      out = out.filter((l) => l.to !== "/lostnfound");
    }

    return out;
  }, [links, role, isLoggedIn]);

  /* ---------- misc ---------- */
  const userLabel = displayNameFromUser(user);
  const activeClass = (to) =>
    location.pathname === to
      ? "text-orange-600 font-semibold"
      : "text-gray-700 hover:text-orange-600";

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("isLoggedIn");
    } finally {
      setUser(null);
      setIsLoggedIn(false);
      navigate("/");
    }
  };

  return (
    <header className="mx-2 bg-gradient-to-b from-white to-orange-50 backdrop-blur border-1 border-gray-300 rounded-2xl shadow-md mt-2">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* logo */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
            aria-hidden
          >
            <div className="w-10 h-10 rounded-md bg-orange-700 flex items-center justify-center text-white font-bold">
              {/* <img src="/homeLogo.jpg" alt="R" /> */}
              {/*
                If lowBandwidth => show plain orange box with letter (no image).
                Otherwise try to show image (lazy loaded). If image fails to load, the background fallback will show.
              */}
              {lowBandwidth ? (
                <div className="w-10 h-10 rounded-md bg-orange-500 flex items-center justify-center text-white font-bold">
                  {logoText && logoText[0] ? logoText[0] : "R"}
                </div>
              ) : (
                // show image but keep the orange bg as a fallback; image covers the box
                <div className="w-10 h-10 rounded-md bg-orange-500">
                  <img
                    src="/homeLogo.jpg"
                    alt={logoText || "R"}
                    loading="lazy"
                    className="w-full h-full object-cover rounded-md"
                    onError={(e) => {
                      // fallback to letter if image can't load
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-bold text-lg">{logoText}</span>
              <span className="text-xs text-gray-500">{tagline}</span>
            </div>
          </div>

          {/* nav (desktop) */}
          <nav className="hidden md:flex items-center gap-6">
            {filteredLinks.map((l) => (
              <Link key={l.to} to={l.to} className={`text-sm ${activeClass(l.to)}`}>
                {l.label}
              </Link>
            ))}

            {showAbout && (
              <Link
                to="/about"
                className="ml-2 px-3 py-1 rounded-full bg-orange-500 text-white text-sm hover:bg-orange-600"
              >
                {t("header.nav.about")}
              </Link>
            )}

            {/* Language selector */}
            <div className="ml-3 flex items-center gap-2">
              <label className="text-xs text-gray-500">{t("header.langLabel")}:</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="text-sm border rounded px-2 py-1 bg-white"
                aria-label={t("header.langLabel")}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="pa">ਪੰਜਾਬੀ</option>
              </select>
            </div>

            {typeof onToggleDark === "function" && (
              <button
                onClick={onToggleDark}
                className="ml-3 p-1 rounded hover:bg-gray-100 text-sm"
                title="Toggle dark mode"
              >
                🌙
              </button>
            )}

            {/* session / auth area */}
            {isLoggedIn ? (
              <div className="flex items-center gap-3 ml-3 border border-gray-100 rounded-xl p-2 shadow-sm">
                <div className="text-sm text-gray-700">{userLabel}</div>
                <button
                  onClick={handleLogout}
                  className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
                >
                  {t("header.nav.logout")}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-sm px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
              >
                {t("header.nav.login")}
              </Link>
            )}
          </nav>

          {/* mobile controls */}
          <div className="md:hidden flex items-center gap-2">
            {/* Language on mobile */}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="text-sm border rounded px-2 py-1 bg-white"
              aria-label={t("header.langLabel")}
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
              <option value="pa">PA</option>
            </select>

            {typeof onToggleDark === "function" && (
              <button
                onClick={onToggleDark}
                className="p-1 rounded hover:bg-gray-100"
                title="Toggle dark mode"
              >
                🌙
              </button>
            )}
            <button
              onClick={() => setOpen((s) => !s)}
              className="p-2 rounded-md inline-flex items-center justify-center text-gray-700 hover:bg-gray-100"
              aria-expanded={open}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                {open ? (
                  <path
                    d="M6 18L18 6M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M4 6h16M4 12h16M4 18h16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-white/95">
          <div className="px-4 py-3 space-y-2">
            {filteredLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`block rounded px-3 py-2 text-sm ${
                  location.pathname === l.to
                    ? "bg-orange-50 text-orange-600 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {l.label}
              </Link>
            ))}

            {showAbout && (
              <Link
                to="/about"
                onClick={() => setOpen(false)}
                className="block rounded px-3 py-2 text-sm text-white bg-orange-500"
              >
                {t("header.nav.about")}
              </Link>
            )}

            <div className="pt-2 border-t">
              {isLoggedIn ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-700">{userLabel}</div>
                  <button
                    onClick={() => {
                      setOpen(false);
                      handleLogout();
                    }}
                    className="text-sm px-3 py-1 bg-gray-100 rounded"
                  >
                    {t("header.nav.logout")}
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded px-3 py-2 text-sm bg-gray-100"
                >
                  {t("header.nav.login")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}