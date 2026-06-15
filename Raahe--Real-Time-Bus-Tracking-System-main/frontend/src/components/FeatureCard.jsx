import React from "react";
import { motion } from "framer-motion";

/**
 * props:
 *  - icon: React component (SVG)
 *  - title: string
 *  - desc: string
 *  - accent: tailwind color class for circle background (e.g. "from-green-100 to-green-50")
 */
export default function FeatureCard({ icon: Icon, title, desc, accent = "from-indigo-50 to-indigo-25" }) {
  return (
    <motion.div
      className="bg-white rounded-xl shadow-sm border p-6 flex gap-4 items-start hover:shadow-md transition-shadow"
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex-shrink-0">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br ${accent} ring-1 ring-black/5`}>
          <div className="bg-white rounded p-1">
            <Icon className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{desc}</p>
      </div>
    </motion.div>
  );
}
