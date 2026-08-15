import { useId } from "react";

type BrandLogoVariant = "horizontal" | "mark" | "compact";
type BrandLogoTone = "dark" | "light";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  tone?: BrandLogoTone;
  slogan?: string;
}

export function BrandLogo({ variant = "horizontal", tone = "dark", slogan }: BrandLogoProps) {
  const gradientId = useId().replace(/:/g, "");
  const showWordmark = variant !== "mark";

  return (
    <span className={`brand-logo brand-logo--${variant} brand-logo--${tone}`} aria-label="trainingsprofil">
      <svg className="brand-logo__mark" viewBox="0 0 64 64" role="img" aria-hidden="true">
        <defs>
          <linearGradient id={`${gradientId}-leaf`} x1="7" y1="56" x2="53" y2="8" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0f6e54" />
            <stop offset="0.52" stopColor="#34a65d" />
            <stop offset="1" stopColor="#b9ed78" />
          </linearGradient>
          <linearGradient id={`${gradientId}-deep`} x1="16" y1="49" x2="49" y2="14" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#093b39" />
            <stop offset="1" stopColor="#08735c" />
          </linearGradient>
        </defs>
        <path
          d="M8 45c8-7 17-9 27-5 9 4 16 1 21-8-2 12-10 22-23 24-10 1-18-3-25-11Z"
          fill={`url(#${gradientId}-leaf)`}
        />
        <path
          d="M10 39C7 25 16 14 32 12c-3 9-10 18-22 27Z"
          fill={`url(#${gradientId}-leaf)`}
          opacity=".92"
        />
        <path
          d="M14 53c10-19 23-34 40-45-7 16-19 31-40 45Z"
          fill={`url(#${gradientId}-deep)`}
        />
        <path
          d="M19 41c11-3 20-11 27-25-2 18-11 30-27 25Z"
          fill="#b9ed78"
          opacity=".88"
        />
        <circle cx="35" cy="13" r="5" fill="#7fd34e" />
      </svg>
      {showWordmark && <span className="brand-logo__wordmark">trainingsprofil</span>}
      {slogan && <span className="brand-logo__slogan">{slogan}</span>}
    </span>
  );
}
