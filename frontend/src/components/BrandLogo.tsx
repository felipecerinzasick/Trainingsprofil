type BrandLogoVariant = "horizontal" | "mark" | "compact";
type BrandLogoTone = "dark" | "light";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  tone?: BrandLogoTone;
  slogan?: string;
}

export function BrandLogo({ variant = "horizontal", tone = "dark", slogan }: BrandLogoProps) {
  const showWordmark = variant !== "mark";

  return (
    <span className={`brand-logo brand-logo--${variant} brand-logo--${tone}`} aria-label="trainingsprofil">
      <img className="brand-logo__mark" src="/logo_new2.png" alt="" aria-hidden="true" />
      {showWordmark && (
        <span className="brand-logo__wordmark" aria-hidden="true">
          <span className="brand-logo__wordmark-strong">Trainings</span>
          <span className="brand-logo__wordmark-light">profil</span>
        </span>
      )}
      {slogan && <span className="brand-logo__slogan">{slogan}</span>}
    </span>
  );
}
