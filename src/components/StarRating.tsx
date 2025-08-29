"use client";

import { useState } from "react";

type StarRatingProps = {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  size?: number;
  readOnly?: boolean;
  className?: string;
};

export default function StarRating({
  value,
  onChange,
  max = 10,
  size = 34,
  readOnly = false,
  className = "",
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
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ display: "block" }}
            >
              <path
                d="M12 17.27l-5.4 3.22 1.44-6.19-4.69-4.07 6.24-.53L12 3l2.41 6.7 6.24.53-4.69 4.07 1.44 6.19z"
                fill={filled ? "#10b981" : "transparent"}         // green when selected
                stroke={filled ? "#10b981" : "#9ca3af"}           // gray stroke when empty
                strokeWidth="1.8"
              />
            </svg>
          </button>
        );
      })}
      {!readOnly && (
        <span className="ml-2 text-sm opacity-80 tabular-nums">
          {current}/{max}
        </span>
      )}
    </div>
  );
}
