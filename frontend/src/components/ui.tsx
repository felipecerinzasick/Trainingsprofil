import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

interface ChoiceCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
  title: string;
  description?: string;
  icon?: string;
  compact?: boolean;
}

export function ChoiceCard({ selected, title, description, icon, compact, className = "", ...props }: ChoiceCardProps) {
  return (
    <button
      type="button"
      className={`choice-card ${selected ? "is-selected" : ""} ${compact ? "is-compact" : ""} ${className}`}
      aria-pressed={selected}
      {...props}
    >
      {icon && <span className="choice-card__icon"><Icon name={icon} size={22} /></span>}
      <span className="choice-card__copy">
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
      <span className="choice-card__check"><Icon name="check" size={15} /></span>
    </button>
  );
}

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean;
  children: ReactNode;
  icon?: string;
}

export function Chip({ selected, children, icon, className = "", ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={`chip ${selected ? "is-selected" : ""} ${className}`}
      aria-pressed={selected}
      {...props}
    >
      {icon && <Icon name={icon} size={17} />}
      <span>{children}</span>
      {selected && <Icon name="check" size={14} />}
    </button>
  );
}

export function SectionHeading({ eyebrow, title, text }: { eyebrow?: string; title: string; text?: string }) {
  return (
    <div className="section-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

export function Field({ label, hint, optional, children, htmlFor }: { label: string; hint?: string; optional?: boolean; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <div className="field__label-row">
        <label htmlFor={htmlFor}>{label}</label>
        {optional && <span>Optional</span>}
      </div>
      {hint && <p className="field__hint">{hint}</p>}
      {children}
    </div>
  );
}

export function Notice({ tone = "info", icon, children }: { tone?: "info" | "warning" | "success"; icon?: string; children: ReactNode }) {
  return (
    <div className={`notice notice--${tone}`}>
      <Icon name={icon ?? (tone === "warning" ? "alert" : tone === "success" ? "check-circle" : "info")} size={20} />
      <div>{children}</div>
    </div>
  );
}

export function RangeField({ value, min, max, step = 1, onChange, labelLeft, labelRight, valueLabel, ariaLabel }: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  labelLeft: string;
  labelRight: string;
  valueLabel: string;
  ariaLabel: string;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <div className="range-field">
      <div className="range-field__value">{valueLabel}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        style={{ "--range-progress": `${percentage}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="range-field__labels"><span>{labelLeft}</span><span>{labelRight}</span></div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" className={`toggle-row ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
      <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
      <span className="toggle"><span /></span>
    </button>
  );
}
