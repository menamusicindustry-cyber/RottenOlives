"use client";

import { useState } from "react";

/**
 * Accessible star rating (1..max). Filled stars are green (#10b981).
 * Background is transparent; no borders, no box.
 */
type StarRatingProps = {
  value: number;                 // 1..max
  onChange: (v: number) => void; // callback
  max?: number;                  // default 10
  size?: number;                 // px, default 30
  readOnly?: boolean;            // view-only mode
  className?: string;
  color?: string;                // hex/rgb, default Tailwind emerald-500 (#10b981)
};

export default function StarRating({
  value,
  onChange,
  max = 10,
  size = 30,
  readOnly = false,
  className = "",
  color = "#10b981",
}: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const current = hover ?? value ?? 0;

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      role={readOnly ? undefined : "radiogroup"}
      aria-label="Star rating"
      style={{ background: "transparent" }}
    >
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const filled = n <= current;
        return (
          <button
            key={n}
            type="button"
            role={readOnly ? undefined : "radio"}
            aria-checked={n === value}
            aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
            disabled={readOnly}
            onMouseEnter={() => !readOnly && setHover(n)}
            onMouseLeave={() => !readOnly && setHover(null)}
            onFocus={() => !readOnly && setHover(n)}
            onBlur={() => !readOnly && setHover(null)}
            onClick={() => !readOnly && onChange(n)}
            className={`select-none leading-none transition-transform ${
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
            }`}
            style={{
              fontSize: 0,
              lineHeight: 1,
              background: "transparent",
              border: "none",
              padding: 0,
            }}
          >
            {/* SVG star so we can style fill/stroke exactly */}
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ display: "block" }}
            >
              <path
                d="M12 17.27l-5.4 3.22 1.44-6.19-4.69-4.07 6.24-.53L12 3l2.41 6.7 6.24.53-4.69 4.07 1.44 6.19z"
                fill={filled ? color : "transparent"}
                stroke={filled ? color : "currentColor"}
                strokeWidth="1.5"
              />
            </svg>
          </button>
        );
      })}
      {!readOnly && (
        <span className="ml-2 text-sm opacity-70 tabular-nums">
          {current}/{max}
        </span>
      )}
    </div>
  );
}
