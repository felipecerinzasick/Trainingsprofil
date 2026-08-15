import type { TrainingProfile } from "../types";
import type { ApiProblem, AuthResponse, AuthUser, PlanListItem, PlanRecord } from "./types";

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://127.0.0.1:8000/api";
const normalizedApiUrl = configuredApiUrl.replace(/\/+$/, "");
const API_BASE = normalizedApiUrl.endsWith("/api") ? normalizedApiUrl : `${normalizedApiUrl}/api`;
const TOKEN_KEY = "trainingsplan-access-token-v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  notices: string[];

  constructor(problem: ApiProblem) {
    super(problem.message);
    this.name = "ApiError";
    this.status = problem.status;
    this.code = problem.code;
    this.notices = problem.notices ?? [];
  }
}

export const authStore = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function parseProblem(response: Response): Promise<ApiProblem> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { status: response.status, message: "Die Serverantwort konnte nicht gelesen werden." };
  }

  const detail = (payload as { detail?: unknown })?.detail;
  if (typeof detail === "string") return { status: response.status, message: detail };
  if (detail && typeof detail === "object") {
    const object = detail as { message?: string; code?: string; notices?: string[] };
    return {
      status: response.status,
      message: object.message ?? "Die Anfrage konnte nicht verarbeitet werden.",
      code: object.code,
      notices: object.notices,
    };
  }
  return { status: response.status, message: "Die Anfrage konnte nicht verarbeitet werden." };
}

async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (authenticated) {
    const token = authStore.getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError({
      status: 0,
      message: "Die API ist nicht erreichbar. Prüfe, ob das Backend auf Port 8000 läuft.",
    });
  }

  if (!response.ok) {
    const problem = await parseProblem(response);
    if (response.status === 401) authStore.clear();
    throw new ApiError(problem);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  register: async (input: { email: string; password: string; firstName: string }) => {
    const result = await request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }, false);
    authStore.setToken(result.accessToken);
    return result;
  },

  login: async (input: { email: string; password: string }) => {
    const result = await request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }, false);
    authStore.setToken(result.accessToken);
    return result;
  },

  me: () => request<AuthUser>("/auth/me"),

  getProfile: () => request<TrainingProfile | null>("/profile"),

  saveProfile: (profile: TrainingProfile) => request<TrainingProfile>("/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  }),

  generatePlan: (profile: TrainingProfile, durationWeeks: number, title?: string) => request<PlanRecord>("/plans/generate", {
    method: "POST",
    body: JSON.stringify({ profile, durationWeeks, title: title || undefined }),
  }),

  listPlans: () => request<PlanListItem[]>("/plans"),

  getPlan: (id: string) => request<PlanRecord>(`/plans/${encodeURIComponent(id)}`),

  deletePlan: (id: string) => request<{ message: string }>(`/plans/${encodeURIComponent(id)}`, { method: "DELETE" }),

  downloadPlanPdf: async (id: string, title: string) => {
    const token = authStore.getToken();
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/plans/${encodeURIComponent(id)}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      throw new ApiError({ status: 0, message: "Die API ist nicht erreichbar." });
    }
    if (!response.ok) throw new ApiError(await parseProblem(response));
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.replace(/[^a-z0-9äöüß-]+/gi, "-").replace(/^-|-$/g, "") || "trainingsplan"}.pdf`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  },
};
