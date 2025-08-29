"use client";

import { useState } from "react";

type StarRatingProps = {
  value: number;                 // 1..max
  onChange: (v: number) => void; // callback
  max?: number;                  // default 10
  size?: number;                 // px, default 30
  readOnly?: boolean;            // view-only mode
  className?: string;
};

export default function StarRating({
  value,
  onChange,
  max = 10,
  size = 30,
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
            style={{ fontSize: size, lineHeight: 1 }}
          >
            {filled ? "★" : "☆"}
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
