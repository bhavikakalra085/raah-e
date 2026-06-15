import React from "react";
import Lottie from "lottie-react";

/**
 * FeatureCardLottieSimple
 * - animationData: imported JSON or null
 * - title, desc: strings (already translated by caller)
 * - size: number px for icon (defaults to 56)
 * - accentClass: tailwind gradient classes for icon background
 */
export default function FeatureCardLottieSimple({
  animationData,
  title = "Title",
  desc = "Description",
  size = 56,
  accentClass = "from-indigo-50 to-indigo-100",
}) {
  // inline style for dynamic size (Tailwind can't handle dynamic w-[${size}px])
  const iconBoxStyle = { width: size + 8, height: size + 8 }; // a bit of padding inside the gradient box
  const lottieInnerStyle = { width: size, height: size, overflow: "hidden", borderRadius: 8 };

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition flex gap-4 items-start">
      {/* icon area */}
      <div
        className={`flex-shrink-0 rounded-lg flex items-center justify-center bg-gradient-to-br ${accentClass}`}
        style={iconBoxStyle}
        aria-hidden
      >
        <div style={lottieInnerStyle}>
          {animationData ? (
            <Lottie
              animationData={animationData}
              loop
              autoplay
              style={{ width: "100%", height: "100%", display: "block" }}
            />
          ) : (
            // simple fallback square to keep layout stable
            <div style={{ width: "100%", height: "100%", background: "rgba(255,255,255,0.8)", borderRadius: 8 }} />
          )}
        </div>
      </div>

      {/* text area - allow wrapping */}
      <div className="min-w-0"> {/* important for flex wrapping */}
        <h3 className="font-semibold text-gray-900 leading-tight break-words">{title}</h3>
        <p className="mt-1 text-sm text-gray-600 leading-snug">{desc}</p>
      </div>
    </div>
  );
}
