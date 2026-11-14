import { useEffect, useMemo, useState } from "react";
import { api, ApiError, authStore } from "./api/client";
import type { AuthResponse, AuthUser, BillingStatus, PlanRecord } from "./api/types";
import { AuthPage } from "./components/AuthPage";
import { BillingPage } from "./components/BillingPage";
import { BrandLogo } from "./components/BrandLogo";
import { CompletePage } from "./components/CompletePage";
import { DashboardPage } from "./components/DashboardPage";
import { Icon } from "./components/Icon";
import { LandingPage } from "./components/LandingPage";
import { Onboarding } from "./components/Onboarding";
import { PlanPage } from "./components/PlanPage";
import type { AppView, TrainingProfile } from "./types";
import { SUBSCRIPTION_REQUIRED } from "./utils/billing";
import { clearDraft, createEmptyProfile, loadDraft, saveDraft, STORAGE_KEY } from "./utils/profile";

function getInitialProfile() {
  return loadDraft() ?? createEmptyProfile();
}

interface InitialRoute {
  view: AppView;
  planId?: string;
  register?: boolean;
  /** Stripe Checkout session id when the browser returns from a successful payment. */
  checkoutSessionId?: string;
}

function initialRoute(): InitialRoute {
  const hash = window.location.hash;
  const query = new URLSearchParams(window.location.search);
  const checkout = query.get("checkout");
  const sessionId = query.get("session_id") ?? undefined;
  if (checkout === "success" && sessionId) return { view: "dashboard", checkoutSessionId: sessionId };
  if (checkout === "cancel") return { view: "billing" };
  if (hash === "#registrieren") return { view: "auth", register: true };
  if (hash === "#profil") return { view: "onboarding" };
  if (hash === "#fertig") return { view: "complete" };
  if (hash === "#anmelden") return { view: "auth" };
  if (hash === "#konto") return { view: "dashboard" };
  if (hash === "#abo") return { view: "billing" };
  if (hash.startsWith("#plan/")) return { view: "plan", planId: hash.slice("#plan/".length) };
  return { view: "landing" };
}

const isSubscriptionError = (reason: unknown) =>
  reason instanceof ApiError && (reason.status === 402 || reason.code === SUBSCRIPTION_REQUIRED);

function StatusScreen({ title, text, onHome }: { title: string; text: string; onHome: () => void }) {
  return (
    <div className="status-screen page-shell">
      <button type="button" className="brand" onClick={onHome}><BrandLogo /></button>
      <span className="loading-orb" />
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}

export default function App() {
  const route = initialRoute();
  const [profile, setProfile] = useState<TrainingProfile>(getInitialProfile);
  const [view, setView] = useState<AppView>(route.view);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [hasStoredDraft, setHasStoredDraft] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)));
  const [selectedPlan, setSelectedPlan] = useState<PlanRecord | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [pendingDuration, setPendingDuration] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingNotice, setBillingNotice] = useState("");
  // A completed Stripe Checkout that still has to be confirmed with the API (e.g. the
  // visitor had to sign in again after returning from Stripe).
  const [pendingCheckout, setPendingCheckout] = useState<string | null>(route.checkoutSessionId ?? null);
  // Visitors arriving via "#registrieren" (e.g. from the blog) create an account
  // first and continue straight into the Trainings-Check.
  const [registerFirst, setRegisterFirst] = useState(Boolean(route.register));

  const profileHasContent = useMemo(() => Boolean(
    profile.goals.primaryGoal
    || profile.identity.firstName
    || profile.environment.locations.length
    || profile.health.painFree !== null,
  ), [profile]);

  const refreshBilling = async () => {
    try {
      setBilling(await api.billingStatus());
    } catch {
      // Access is enforced by the API; the UI simply falls back to showing no banner.
    }
  };

  /** Load the billing status and, if the browser just came back from Stripe, confirm the checkout. */
  const syncBilling = async (checkoutSessionId: string | null) => {
    if (checkoutSessionId) {
      try {
        const status = await api.completeCheckout(checkoutSessionId);
        setBilling(status);
        setBillingNotice("Vielen Dank! Dein Abo ist aktiv und du kannst sofort weitermachen.");
        setPendingCheckout(null);
        return;
      } catch (reason) {
        setPendingCheckout(null);
        setBillingNotice(reason instanceof ApiError && reason.status !== 403
          ? "Deine Zahlung wird gerade verarbeitet. Dein Abo wird in Kürze automatisch freigeschaltet."
          : "");
      }
    }
    await refreshBilling();
  };

  useEffect(() => {
    if (!profileHasContent) return;
    const timeout = window.setTimeout(() => {
      saveDraft(profile);
      setHasStoredDraft(true);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [profile, profileHasContent]);

  useEffect(() => {
    const restoreSession = async () => {
      const token = authStore.getToken();
      if (!token) {
        setAuthReady(true);
        if (view === "dashboard" || view === "plan" || view === "billing") setView("auth");
        return;
      }
      try {
        const [currentUser, storedProfile] = await Promise.all([api.me(), api.getProfile()]);
        setUser(currentUser);
        await syncBilling(route.checkoutSessionId ?? null);
        if (storedProfile) {
          setProfile(storedProfile);
          saveDraft(storedProfile);
          setHasStoredDraft(true);
        }
        if (route.register) {
          // Already signed in: skip the form and continue where the link intended.
          setRegisterFirst(false);
          setView(storedProfile ? "dashboard" : "onboarding");
        }
        if (route.planId) await openPlan(route.planId, currentUser);
      } catch {
        authStore.clear();
        setUser(null);
        if (view === "dashboard" || view === "plan" || view === "billing") setView("auth");
      } finally {
        setAuthReady(true);
      }
    };
    void restoreSession();
    // Route and view are intentionally read only once during initial restoration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hash = view === "onboarding"
      ? "#profil"
      : view === "complete"
        ? "#fertig"
        : view === "auth"
          ? "#anmelden"
          : view === "dashboard"
            ? "#konto"
            : view === "billing"
              ? "#abo"
              : view === "plan" && selectedPlan
                ? `#plan/${selectedPlan.id}`
                : "";
    // Always rewrite the full path so Stripe's return query parameters disappear.
    window.history.replaceState(null, "", `${window.location.pathname}${hash}`);

    const titles: Record<AppView, string> = {
      landing: "Trainingsprofil – dein Plan beginnt mit dir",
      onboarding: "Trainings-Check · Trainingsprofil",
      complete: "Profil bereit · Trainingsprofil",
      auth: "Anmelden · Trainingsprofil",
      dashboard: "Meine Trainingspläne · Trainingsprofil",
      plan: selectedPlan ? `${selectedPlan.title} · Trainingsprofil` : "Trainingsplan · Trainingsprofil",
      billing: "Abo · Trainingsprofil",
    };
    document.title = titles[view];
  }, [view, selectedPlan]);

  const goHome = () => {
    setGenerationError("");
    setView("landing");
  };

  const start = () => {
    setGenerationError("");
    setView("onboarding");
  };

  const reset = () => {
    clearDraft();
    localStorage.removeItem("trainingsprofil-current-step-v1");
    setProfile(createEmptyProfile());
    setHasStoredDraft(false);
    setGenerationError("");
    setView("landing");
  };

  const completeProfile = async () => {
    saveDraft(profile);
    setHasStoredDraft(true);
    setGenerationError("");
    setView("complete");
    if (user) {
      try {
        await api.saveProfile(profile);
      } catch {
        // Generation also saves the current profile; do not interrupt the user here.
      }
    }
  };

  const createPlan = async (durationWeeks: number) => {
    setGenerating(true);
    setGenerationError("");
    try {
      const plan = await api.generatePlan(profile, durationWeeks);
      setSelectedPlan(plan);
      setPendingDuration(null);
      setView("plan");
    } catch (reason) {
      if (isSubscriptionError(reason)) {
        await refreshBilling();
        setView("billing");
        return;
      }
      if (reason instanceof ApiError) {
        const extra = reason.notices.length ? ` ${reason.notices.join(" ")}` : "";
        setGenerationError(`${reason.message}${extra}`);
      } else {
        setGenerationError("Der Trainingsplan konnte nicht erstellt werden.");
      }
      setView("complete");
    } finally {
      setGenerating(false);
    }
  };

  const requestPlan = (durationWeeks: number) => {
    if (!user) {
      setPendingDuration(durationWeeks);
      setView("auth");
      return;
    }
    if (billing && !billing.hasAccess) {
      setView("billing");
      return;
    }
    void createPlan(durationWeeks);
  };

  const finishAuth = async (result: AuthResponse) => {
    setUser(result.user);
    await syncBilling(pendingCheckout);
    const duration = pendingDuration;
    if (duration !== null) {
      await createPlan(duration);
      return;
    }
    let hasProfile = profileHasContent;
    try {
      if (profileHasContent) {
        const savedProfile = await api.saveProfile(profile);
        setProfile(savedProfile);
        saveDraft(savedProfile);
        setHasStoredDraft(true);
      } else {
        const storedProfile = await api.getProfile();
        if (storedProfile) {
          setProfile(storedProfile);
          saveDraft(storedProfile);
          setHasStoredDraft(true);
          hasProfile = true;
        }
      }
    } catch {
      try {
        const storedProfile = await api.getProfile();
        if (storedProfile) {
          setProfile(storedProfile);
          saveDraft(storedProfile);
          setHasStoredDraft(true);
          hasProfile = true;
        }
      } catch {
        // The dashboard can still open and display a useful API error.
      }
    }
    const startCheck = registerFirst && !hasProfile;
    setRegisterFirst(false);
    setView(startCheck ? "onboarding" : "dashboard");
  };
  async function openPlan(id: string, currentUser = user) {
    if (!currentUser) {
      setView("auth");
      return;
    }
    setLoadingPlan(true);
    try {
      const plan = await api.getPlan(id);
      setSelectedPlan(plan);
      setView("plan");
    } catch (reason) {
      if (isSubscriptionError(reason)) {
        await refreshBilling();
        setView("billing");
        return;
      }
      setGenerationError(reason instanceof ApiError ? reason.message : "Der Trainingsplan konnte nicht geladen werden.");
      setView("dashboard");
    } finally {
      setLoadingPlan(false);
    }
  }

  const editSavedProfile = async () => {
    if (user) {
      try {
        const stored = await api.getProfile();
        if (stored) setProfile(stored);
      } catch {
        // Keep the locally stored draft as fallback.
      }
    }
    setView("onboarding");
  };

  const logout = () => {
    authStore.clear();
    setUser(null);
    setSelectedPlan(null);
    setPendingDuration(null);
    setBilling(null);
    setBillingNotice("");
    setView("landing");
  };

  const openBilling = () => {
    setGenerationError("");
    setView("billing");
  };

  if (!authReady || loadingPlan) {
    return <StatusScreen title="Dein Trainingsbereich wird vorbereitet." text="Profil und gespeicherte Pläne werden geladen." onHome={goHome} />;
  }

  if (view === "onboarding") {
    return (
      <Onboarding
        profile={profile}
        setProfile={setProfile}
        onExit={() => setView("landing")}
        onComplete={() => void completeProfile()}
      />
    );
  }

  if (view === "complete") {
    return (
      <CompletePage
        profile={profile}
        onEdit={start}
        onReset={reset}
        onGenerate={requestPlan}
        generating={generating}
        generationError={generationError}
        accountReady={Boolean(user)}
        onAccount={() => setView("dashboard")}
      />
    );
  }

  if (view === "auth") {
    return (
      <AuthPage
        defaultMode={pendingDuration !== null || registerFirst ? "register" : "login"}
        firstName={profile.identity.firstName}
        profileReady={pendingDuration !== null || profileHasContent}
        onSuccess={finishAuth}
        onBack={() => setView(pendingDuration !== null ? "complete" : "landing")}
      />
    );
  }

  if (view === "billing" && !user) {
    return (
      <AuthPage
        defaultMode="login"
        firstName={profile.identity.firstName}
        profileReady={profileHasContent}
        onSuccess={finishAuth}
        onBack={() => setView("landing")}
      />
    );
  }

  // Paywall: once the free trial is over and no subscription is active, the personal
  // area and plans are replaced by the subscription page. Profile editing stays open.
  const locked = Boolean(user && billing && !billing.hasAccess);
  if (user && (view === "billing" || (locked && (view === "dashboard" || view === "plan")))) {
    return (
      <BillingPage
        user={user}
        status={billing}
        notice={billingNotice}
        onHome={goHome}
        onDashboard={() => { setBillingNotice(""); setView("dashboard"); }}
        onLogout={logout}
        onRefresh={refreshBilling}
      />
    );
  }

  if (view === "dashboard" && user) {
    return (
      <DashboardPage
        user={user}
        profile={profile}
        billing={billing}
        notice={billingNotice}
        onBilling={openBilling}
        onHome={goHome}
        onEditProfile={() => void editSavedProfile()}
        onOpenPlan={(id) => void openPlan(id)}
        onGenerate={requestPlan}
        onLogout={logout}
        generating={generating}
        generationError={generationError}
      />
    );
  }

  if (view === "plan" && user && selectedPlan) {
    return (
      <PlanPage
        user={user}
        record={selectedPlan}
        onHome={goHome}
        onDashboard={() => setView("dashboard")}
        onEditProfile={() => void editSavedProfile()}
        onLogout={logout}
      />
    );
  }

  return (
    <LandingPage
      onStart={start}
      onResume={start}
      hasDraft={hasStoredDraft && profileHasContent}
      onAccount={() => setView(user ? "dashboard" : "auth")}
      accountLabel={user ? user.firstName || "Mein Bereich" : "Anmelden"}
    />
  );
}
