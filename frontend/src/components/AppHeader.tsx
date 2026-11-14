import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "../api/types";
import { BrandLogo } from "./BrandLogo";
import { Icon } from "./Icon";

interface AppHeaderProps {
  user?: AuthUser | null;
  onHome: () => void;
  onDashboard?: () => void;
  onBilling?: () => void;
  onLogout?: () => void;
  action?: ReactNode;
}

/** Profile button that opens a small account menu; the only place to sign out on phones. */
function UserMenu({ user, onDashboard, onBilling, onLogout }: { user: AuthUser; onDashboard?: () => void; onBilling?: () => void; onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = (callback?: () => void) => () => {
    setOpen(false);
    callback?.();
  };

  return (
    <div className={`user-menu ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="button button--ghost button--small user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Kontomenü schliessen" : `Kontomenü für ${user.firstName || user.email} öffnen`}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="user" size={17} />
        <span>{user.firstName || "Mein Bereich"}</span>
        <Icon name="chevron-down" size={14} className="user-menu__chevron" />
      </button>
      {open && (
        <div className="user-menu__panel" id={menuId} role="menu">
          <div className="user-menu__identity">
            <strong>{user.firstName || "Dein Konto"}</strong>
            <small>{user.email}</small>
          </div>
          {onDashboard && (
            <button type="button" role="menuitem" className="user-menu__item" onClick={run(onDashboard)}>
              <Icon name="calendar" size={17} /> Mein Bereich
            </button>
          )}
          {onBilling && (
            <button type="button" role="menuitem" className="user-menu__item" onClick={run(onBilling)}>
              <Icon name="spark" size={17} /> Tarif &amp; Abo
            </button>
          )}
          {onLogout && (
            <button type="button" role="menuitem" className="user-menu__item user-menu__item--logout" onClick={run(onLogout)}>
              <Icon name="arrow-right" size={17} /> Abmelden
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AppHeader({ user, onHome, onDashboard, onBilling, onLogout, action }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="page-shell app-header__inner">
        <button type="button" className="brand" onClick={onHome}>
          <BrandLogo />
        </button>
        <div className="app-header__actions">
          {action}
          {user && (onDashboard || onBilling || onLogout) && (
            <UserMenu user={user} onDashboard={onDashboard} onBilling={onBilling} onLogout={onLogout} />
          )}
        </div>
      </div>
    </header>
  );
}
