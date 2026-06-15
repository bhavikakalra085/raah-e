// src/pages/About.jsx
import React from "react";
import Header from "../components/Header";
import { useI18n } from "../i18n/I18nProvider";
import FeatureCardLottieSimple from "../components/FeatureCardLottieSimple";

import safetyIcon from "../assets/lottie/Lock.json";
import timelinessIcon from "../assets/lottie/Order tracking.json";
import communityIcon from "../assets/lottie/Get in touch with us  Online managers (1).json";
import lostfoundicon from "../assets/lottie/Searching.json";
import routes from "../assets/lottie/Checkpoints.json"
import mapicon from "../assets/lottie/Order tracking.json"
import adminIcon from "../assets/lottie/Admin CRM.json"

export default function About() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white text-gray-800">
      {/* <Header /> */}

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <svg className="w-full h-64 text-orange-100" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path
              fill="currentColor"
              d="M0,64L48,96C96,128,192,192,288,213.3C384,235,480,213,576,170.7C672,128,768,64,864,48C960,32,1056,64,1152,96C1248,128,1344,160,1392,176L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
            />
          </svg>
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-12 pb-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border shadow-sm text-xs text-orange-600">
              <SparkIcon className="w-4 h-4" />
              {t("about.badge")}
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight">
              {t("about.title")}
            </h1>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">{t("about.subtitle")}</p>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      {/* <section className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <StatCard label={t("about.stats.cities")} value="23+" />
          <StatCard label={t("about.stats.routes")} value="180+" />
          <StatCard label={t("about.stats.users")} value="12k+" />
          <StatCard label={t("about.stats.uptime")} value="99.9%" />
        </div>
      </section> */}

      {/* Why we built it */}
      <section className="max-w-6xl mx-auto px-6 mt-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">{t("about.why.title")}</h2>
            <p className="mt-3 text-gray-600">{t("about.why.p1")}</p>
            <p className="mt-3 text-gray-600">{t("about.why.p2")}</p>
            <ul className="mt-4 space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-1 w-5 h-5 text-green-600" />
                <span>{t("about.why.points.safe")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-1 w-5 h-5 text-green-600" />
                <span>{t("about.why.points.reliable")}</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon className="mt-1 w-5 h-5 text-green-600" />
                <span>{t("about.why.points.accessible")}</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">{t("about.mission.title")}</h2>
            <p className="mt-3 text-gray-600">{t("about.mission.p1")}</p>
            <div className="mt-5 grid sm:grid-cols-3 gap-4">
              
              <Pillar
                icon={ShieldIcon}
                title={t("about.mission.pillars.safety.title")}
                desc={t("about.mission.pillars.safety.desc")}
              />
              <Pillar
                icon={TimerIcon}
                title={t("about.mission.pillars.timeliness.title")}
                desc={t("about.mission.pillars.timeliness.desc")}
              />
              <Pillar
                icon={HeartIcon}
                title={t("about.mission.pillars.community.title")}
                desc={t("about.mission.pillars.community.desc")}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-6xl mx-auto px-6 mt-12">
        <h2 className="text-2xl font-bold text-gray-900 text-center">{t("about.features.title")}</h2>
        <p className="mt-2 text-center text-gray-600">{t("about.features.subtitle")}</p>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <FeatureCardLottieSimple
        animationData={mapicon}
        title={("about.features.items.live.title","Live Tracking")}
        desc={t("about.features.items.live.desc")}
        accentClass="from-indigo-50 to-indigo-100"
        />
        <FeatureCardLottieSimple
        animationData={routes}
        title={("about.features.items.routes.title","Route Planning")}
        desc={t("about.features.items.routes.desc")}
        accentClass="from-orange-50 to-orange-100"
        />
        <FeatureCardLottieSimple
        animationData={lostfoundicon}
        title={("about.features.items.alerts.title","Lost & Found")}
        desc={t("about.features.items.alerts.desc")}
        accentClass="from-green-50 to-green-100"
        />
        <FeatureCardLottieSimple
        animationData={safetyIcon}
        title={("about.features.items.sos.title","SOS Alerts")}
        desc={t("about.features.items.sos.desc")}
        accentClass="from-red-50 to-red-100"
        />
        <FeatureCardLottieSimple
        animationData={communityIcon}
        title={("about.features.items.portals.title","User & Admin Portals")}
        desc={t("about.features.items.portals.desc")}
        accentClass="from-green-50 to-green-100"
        />
        <FeatureCardLottieSimple
        animationData={adminIcon}
        title={("about.features.items.admin.title","Admin Dashboard")}
        desc={t("about.features.items.admin.desc", "Manage routes, users, and system settings with ease.")}
        accentClass="from-green-50 to-green-100"
        />

          {/* <Feature icon={MapPinIcon} title={t("about.features.items.live.title")} desc={t("about.features.items.live.desc")} /> */}
          {/* <Feature icon={RouteIcon} title={t("about.features.items.routes.title")} desc={t("about.features.items.routes.desc")} /> */}
          {/* <Feature icon={BellIcon} title={t("about.features.items.alerts.title")} desc={t("about.features.items.alerts.desc")} /> */}
          {/* <Feature icon={ShieldIcon} title={t("about.features.items.sos.title")} desc={t("about.features.items.sos.desc")} /> */}
          {/* <Feature icon={UsersIcon} title={t("about.features.items.portals.title")} desc={t("about.features.items.portals.desc")} /> */}
          {/* <Feature icon={CogIcon} title={t("about.features.items.admin.title")} desc={t("about.features.items.admin.desc")} /> */}
        </div>
      </section>

      {/* Timeline */}
      {/* <section className="max-w-6xl mx-auto px-6 mt-12">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">{t("about.timeline.title")}</h2>
          <div className="mt-6 space-y-6">
            <TimelineItem
              title={t("about.timeline.items.idea.title")}
              date="2024"
              desc={t("about.timeline.items.idea.desc")}
            />
            <TimelineItem
              title={t("about.timeline.items.pilot.title")}
              date="2025 Q1"
              desc={t("about.timeline.items.pilot.desc")}
            />
            <TimelineItem
              title={t("about.timeline.items.launch.title")}
              date="2025 Q2"
              desc={t("about.timeline.items.launch.desc")}
            />
          </div>
        </div>
      </section> */}

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 mt-12 mb-16">
        <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white p-8 md:p-10 shadow-lg">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
            <div className="flex-1">
              <h3 className="text-2xl md:text-3xl font-bold">{t("about.cta.title")}</h3>
              <p className="mt-2 text-orange-50">{t("about.cta.desc")}</p>
            </div>
            <div className="flex gap-3">
              <a
                href="/passenger"
                className="px-5 py-3 bg-white text-orange-600 font-semibold rounded-lg shadow hover:bg-orange-50"
              >
                {t("about.cta.buttons.passenger")}
              </a>
              <a
                href="/drivercontrol"
                className="px-5 py-3 bg-orange-700/50 text-white font-semibold rounded-lg shadow hover:bg-orange-700/70"
              >
                {t("about.cta.buttons.driver")}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Components ---------- */

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border p-5 shadow-sm flex items-center justify-between">
      <div>
        <div className="text-2xl font-extrabold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600 mt-1">{label}</div>
      </div>
      <SparkIcon className="w-6 h-6 text-orange-500" />
    </div>
  );
}

function Pillar({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-orange-600" />
        </div>
        <div className="font-semibold">{title}</div>
      </div>
      <p className="mt-2 text-sm text-gray-600">{desc}</p>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
          <Icon className="w-6 h-6 text-orange-600" />
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-gray-600">{desc}</p>
    </div>
  );
}

function TimelineItem({ title, date, desc }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-orange-500 mt-2" />
        <div className="w-px h-full bg-orange-100" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-gray-900">{title}</div>
          <div className="text-xs text-gray-500">{date}</div>
        </div>
        <p className="mt-1 text-sm text-gray-600">{desc}</p>
      </div>
    </div>
  );
}

/* ---------- Inline icons ---------- */
function SparkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 2l2.5 5 5 2.5-5 2.5L12 17l-2.5-5L4 9.5 9.5 7 12 2z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShieldIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 2l7 4v6a7 7 0 11-14 0V6l7-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function TimerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 2h6M12 9v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function HeartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M20.8 8.6a5.5 5.5 0 00-9-3.9l-.8.8-.8-.8a5.5 5.5 0 00-7.8 7.8l8.6 8.6 8.6-8.6a5.5 5.5 0 001.2-3.9z" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
function MapPinIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 22s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
function RouteIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 6h2a4 4 0 014 4v1M6 9v2a4 4 0 004 4h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M15 17H9a4 4 0 01-4-4V9a7 7 0 1114 0v4a4 4 0 01-4 4z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 21h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M16 14a4 4 0 10-8 0M6 20a6 6 0 0112 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
function CogIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M19.4 15a7.97 7.97 0 00.2-1 8 8 0 00-.2-1l2-1.6-2-3.4-2.4.6a7.9 7.9 0 00-1.6-.9L13 2h-2l-.4 3.7c-.6.2-1.1.5-1.6.9L6.6 6l-2 3.4L6 11a8.2 8.2 0 000 2l-1.4 1.6 2 3.4 2.4-.6c.5.4 1 .7 1.6.9L11 22h2l.4-3.7c.6-.2 1.1-.5 1.6-.9l2.4.6 2-3.4L19.4 15z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}
