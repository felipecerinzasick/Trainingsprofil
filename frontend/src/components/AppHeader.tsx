import type { ReactNode } from "react";
import type { AuthUser } from "../api/types";
import { Icon } from "./Icon";

interface AppHeaderProps {
  user?: AuthUser | null;
  onHome: () => void;
  onDashboard?: () => void;
  onLogout?: () => void;
  action?: ReactNode;
}

export function AppHeader({ user, onHome, onDashboard, onLogout, action }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="page-shell app-header__inner">
        <button type="button" className="brand" onClick={onHome}>
          <span className="brand__mark"><Icon name="leaf" size={22} /></span>
          <span>trainingsprofil</span>
        </button>
        <div className="app-header__actions">
          {action}
          {user && onDashboard && (
            <button type="button" className="button button--ghost button--small" onClick={onDashboard}>
              <Icon name="user" size={17} />
              <span>{user.firstName || "Mein Bereich"}</span>
            </button>
          )}
          {user && onLogout && (
            <button type="button" className="text-button app-header__logout" onClick={onLogout}>Abmelden</button>
          )}
        </div>
      </div>
    </header>
  );
}
