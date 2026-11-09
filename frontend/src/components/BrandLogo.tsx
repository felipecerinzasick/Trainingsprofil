type BrandLogoVariant = "horizontal" | "compact";
type BrandLogoTone = "dark" | "light";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  tone?: BrandLogoTone;
  slogan?: string;
}

/** Pure wordmark: "Trainings" slightly heavier than "profil", no pictorial mark. */
export function BrandLogo({ variant = "horizontal", tone = "dark", slogan }: BrandLogoProps) {
  return (
    <span className={`brand-logo brand-logo--${variant} brand-logo--${tone}`} aria-label="Trainingsprofil">
      <span className="brand-logo__wordmark" aria-hidden="true">
        <span className="brand-logo__wordmark-strong">Trainings</span>
        <span className="brand-logo__wordmark-light">profil</span>
      </span>
      {slogan && <span className="brand-logo__slogan">{slogan}</span>}
    </span>
  );
}
