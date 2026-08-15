interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return <img className={compact ? "brand-logo brand-logo--compact" : "brand-logo"} src="/main_logo.png" alt="trainingsprofil" />;
}
