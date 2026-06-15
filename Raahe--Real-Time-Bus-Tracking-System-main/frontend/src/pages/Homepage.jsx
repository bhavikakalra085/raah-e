// src/pages/HomePage.jsx
import React from "react";
import Header from "../components/Header";
import { useI18n } from "../i18n/I18nProvider";

import FeatureCard from "../components/FeatureCard";

import { MdDirectionsBus } from "react-icons/md";
import { BiSupport } from "react-icons/bi";

import FeatureCardLottieSimple from "../components/FeatureCardLottieSimple";

import userIcon from "../assets/lottie/Profile user card.json"
import driverIcon from "../assets/lottie/bus vehicle.json"
import adminIcon from "../assets/lottie/Admin CRM.json"
import TrackingIcon from "../assets/lottie/Order tracking.json";
import SecureIcon from "../assets/lottie/Lock.json";
import EasyIcon from "../assets/lottie/Technology.json";

export default function HomePage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white text-gray-800">
      {/* Header */}
      {/* <Header /> */}

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <section className="text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-orange-600">
            {t("home.heroTitle")}
          </h1>

          <p className="mt-4 max-w-2xl mx-auto text-sm md:text-base text-gray-600">
            {t("home.heroDesc")}
          </p>

          {/* <div className="mt-8">
            <a
              href="#track"
              className="inline-block px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-semibold shadow"
            >
              {t("home.trackNow")}
            </a>
          </div> */}
        </section>

        {/* Portal cards */}
        <section className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* <div className="p-6 max-w-4xl mx-auto"> */}
      <FeatureCardLottieSimple
        animationData={userIcon}
        title={t("home.portals.userTitle")}
        desc={t("home.portals.userDesc")}
        accentClass="from-indigo-50 to-indigo-100"
      />
    {/* </div> */}

            <FeatureCardLottieSimple
              // icon={MdDirectionsBus}
              // title={t("home.portals.driverTitle")}
              // desc={t("home.portals.driverDesc")}
              // accent="from-orange-50 to-orange-100"
              // icon={DriverIcon}
              animationData={driverIcon}
              title={t("home.portals.driverTitle")}
              desc={t("home.portals.driverDesc")}
              accentClass="from-orange-50 to-orange-100"
            />
            <FeatureCardLottieSimple
              // icon={BiSupport}
              // title={t("home.portals.adminTitle")}
              // desc={t("home.portals.adminDesc")}
              // accent="from-emerald-50 to-emerald-100"
              // icon={AdminIcon}
              animationData={adminIcon}
              title={t("home.portals.adminTitle")}
              desc={t("home.portals.adminDesc")}
              accentClass="from-emerald-50 to-emerald-100"
            />
          </div>
        </section>

        {/* Why choose */}
        <section className="mt-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">{t("home.whyTitle")}</h2>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <FeatureCardLottieSimple
              // title={t("home.why.realTimeTitle")}
              // desc={t("home.why.realTimeDesc")}
              // icon={TrackingIcon}
              animationData={TrackingIcon}
              title={t("home.why.realTimeTitle")}
              desc={t("home.why.realTimeDesc")}
              assentClass="from-indigo-50 to-indigo-100"
            />
            <FeatureCardLottieSimple
              // title={t("home.why.secureTitle")}
              // desc={t("home.why.secureDesc")}
              // icon={SecureIcon}
              animationData={SecureIcon}
              title={t("home.why.secureTitle")}
              desc={t("home.why.secureDesc")}
              accentClass="from-green-50 to-green-100"
            />
            <FeatureCardLottieSimple
              // title={t("home.why.easyTitle")}
              // desc={t("home.why.easyDesc")}
              // icon={EasyIcon}
              animationData={EasyIcon}
              title={t("home.why.easyTitle")}
              desc={t("home.why.easyDesc")}
              accentClass="from-orange-50 to-orange-100"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

/* Generic card used in portals */
function Card({ title, desc, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 flex gap-4 items-start">
      <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center">
        <Icon className="w-6 h-6 text-indigo-600" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{desc}</p>
      </div>
    </div>
  );
}

/* Feature card for 'Why choose' */
// function FeatureCard({ title, desc, icon: Icon }) {
//   return (
//     <div className="bg-white rounded-xl shadow-sm border p-6 text-left">
//       <div className="flex items-center gap-4">
//         <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
//           <Icon className="w-6 h-6 text-green-600" />
//         </div>
//         <div>
//           <h4 className="font-semibold">{title}</h4>
//           <p className="mt-1 text-sm text-gray-600">{desc}</p>
//         </div>
//       </div>
//     </div>
//   );
// }

/* --- Simple inline SVG icons --- */
function UserIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 20a8 8 0 0116 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function DriverIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="2" y="7" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 17v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M17 17v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function AdminIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 8v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
function TrackingIcon2(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 2v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
function SecureIcon2(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 2l7 4v6a7 7 0 11-14 0V6l7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function EasyIcon2(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
