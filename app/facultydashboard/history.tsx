"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateReportPDF } from "./pdfGenerator";

/* ============================================================
   API CONFIG
============================================================ */

const RAW_BACKEND_API =
  process.env.NEXT_PUBLIC_BACKEND_API ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

const API_BASE = RAW_BACKEND_API.replace(/\/+$/, "").endsWith("/api/v1")
  ? RAW_BACKEND_API.replace(/\/+$/, "")
  : `${RAW_BACKEND_API.replace(/\/+$/, "")}/api/v1`;

const PAGE_SIZE = 10;

/* ============================================================
   AUTH TYPES
============================================================ */

export interface AuthContext {
  userId: string;
  token: string;
}

/* ============================================================
   STORAGE HELPERS
============================================================ */

function readStorageValue(key: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return (
      localStorage.getItem(key) ||
      sessionStorage.getItem(key) ||
      ""
    );
  } catch {
    return "";
  }
}

/* ============================================================
   JWT HELPERS
============================================================ */

function decodeJwtPayload(
  token: string
): Record<string, unknown> | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = base64.padEnd(
      base64.length +
        ((4 - (base64.length % 4)) % 4),
      "="
    );

    const decoded = atob(padded);

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getUserIdFromToken(token: string): string {
  if (!token) {
    return "";
  }

  const payload = decodeJwtPayload(token);

  if (!payload) {
    return "";
  }

  const possibleIds = [
    payload.user_id,
    payload.userId,
    payload.uid,
    payload.sub,
    payload.id,
  ];

  for (const value of possibleIds) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function getUserIdFromStoredUser(): string {
  const possibleKeys = [
    "user",
    "current_user",
    "currentUser",
    "auth_user",
    "authUser",
    "intellipaper_user",
    "user_data",
    "userData",
  ];

  for (const key of possibleKeys) {
    const raw = readStorageValue(key);

    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw);

      if (
        !parsed ||
        typeof parsed !== "object"
      ) {
        continue;
      }

      const possibleIds = [
        parsed.user_id,
        parsed.userId,
        parsed.uid,
        parsed.id,
      ];

      for (const value of possibleIds) {
        if (
          typeof value === "string" &&
          value.trim()
        ) {
          return value.trim();
        }

        if (typeof value === "number") {
          return String(value);
        }
      }
    } catch {
      // Ignore invalid JSON.
    }
  }

  return "";
}

/* ============================================================
   AUTH CONTEXT
============================================================ */

export function getAuthContext(
  userIdProp?: string,
  tokenProp?: string
): AuthContext {
  if (typeof window === "undefined") {
    return {
      userId: userIdProp || "",
      token: tokenProp || "",
    };
  }

  const token =
    tokenProp ||
    readStorageValue("intellipaper_token") ||
    readStorageValue("access_token") ||
    readStorageValue("accessToken") ||
    readStorageValue("token") ||
    readStorageValue("auth_token") ||
    readStorageValue("authToken");

  let userId =
    userIdProp ||
    readStorageValue("intellipaper_uid") ||
    readStorageValue("user_id") ||
    readStorageValue("userId") ||
    readStorageValue("uid") ||
    readStorageValue("intellipaper_user_id") ||
    readStorageValue("current_user_id");

  if (!userId) {
    userId = getUserIdFromStoredUser();
  }

  if (!userId && token) {
    userId = getUserIdFromToken(token);
  }

  return {
    userId: userId.trim(),
    token: token.trim(),
  };
}

/* ============================================================
   AUTH HEADERS
============================================================ */

function authHeaders(
  token: string,
  includeJson = false
): HeadersInit {
  return {
    ...(includeJson
      ? {
          "Content-Type": "application/json",
        }
      : {}),
    Authorization: `Bearer ${token}`,
  };
}

/* ============================================================
   API ERROR HELPER
============================================================ */

async function getApiErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await response.json();

    if (
      data &&
      typeof data.detail === "string" &&
      data.detail.trim()
    ) {
      return data.detail;
    }

    if (
      data &&
      typeof data.message === "string" &&
      data.message.trim()
    ) {
      return data.message;
    }
  } catch {
    // Response may not contain JSON.
  }

  return fallback;
}

/* ============================================================
   TYPES
============================================================ */

export interface ApiHistoryReport {
  id: string;
  session_id?: string;
  cis_link?: string;
  paper_link?: string;
  paper_type?: string;
  report_type?: string;
  course_code?: string;
  title?: string;
  ai_score?: string;
  status?:
    | "completed"
    | "pending"
    | "failed"
    | string;
  preview?: string;
  report_md?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ApiHistoryListResponse {
  total: number;
  reports: ApiHistoryReport[];
}

export interface HistoryEntry {
  id: string;
  courseName: string;
  courseCode: string;
  paperType: string;
  date: string;
  aiScore: string;
  status: string;
  reportType: string;
  report?: string;
  preview?: string;
  sessionId?: string;
  cisLink?: string;
  paperLink?: string;
  metadata?: Record<string, unknown>;
}

/* ============================================================
   API → FRONTEND MAPPING
============================================================ */

function mapApiReport(
  r: ApiHistoryReport
): HistoryEntry {
  return {
    id: r.id,
    courseName: r.title || "",
    courseCode: r.course_code || "",
    paperType: r.paper_type || "final",
    date: r.created_at,
    aiScore: r.ai_score || "",
    status: r.status || "completed",
    reportType: r.report_type || "Final Report",
    report: r.report_md,
    preview: r.preview,
    sessionId: r.session_id,
    cisLink: r.cis_link,
    paperLink: r.paper_link,
    metadata: r.metadata,
  };
}

/* ============================================================
   FORMATTING
============================================================ */

function parseIsoSafe(iso?: string): Date | null {
  if (!iso) {
    return null;
  }

  const dateOnlyMatch = iso.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(iso?: string) {
  const date = parseIsoSafe(iso);

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso?: string) {
  const date = parseIsoSafe(iso);

  if (!date) {
    return "";
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso ?? "");

  if (isDateOnly) {
    return "";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ============================================================
   API — LIST HISTORY
============================================================ */

async function apiFetchHistoryList(
  userId: string,
  token: string,
  opts: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ApiHistoryListResponse> {
  if (!userId) {
    throw new Error("USER_ID_REQUIRED");
  }

  if (!token) {
    throw new Error("TOKEN_REQUIRED");
  }

  const params = new URLSearchParams({
    user_id: userId,
    limit: String(
      opts.limit ?? PAGE_SIZE
    ),
    offset: String(
      opts.offset ?? 0
    ),
  });

  params.set(
    "report_type",
    "Final Report"
  );

  if (opts.search?.trim()) {
    params.set(
      "search",
      opts.search.trim()
    );
  }

  if (opts.status) {
    params.set(
      "status",
      opts.status
    );
  }

  const response = await fetch(
    `${API_BASE}/analyzer/history?${params.toString()}`,
    {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store",
    }
  );

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (response.status === 403) {
    throw new Error("FORBIDDEN");
  }

  if (response.status === 429) {
    throw new Error("RATE_LIMITED");
  }

  if (!response.ok) {
    const message =
      await getApiErrorMessage(
        response,
        `Failed to load history (${response.status})`
      );

    throw new Error(message);
  }

  return response.json();
}

/* ============================================================
   API — GET FULL REPORT
============================================================ */

async function apiFetchHistoryDetail(
  id: string,
  userId: string,
  token: string
): Promise<ApiHistoryReport> {
  if (!userId) {
    throw new Error("USER_ID_REQUIRED");
  }

  if (!token) {
    throw new Error("TOKEN_REQUIRED");
  }

  const response = await fetch(
    `${API_BASE}/analyzer/history/${encodeURIComponent(
      id
    )}?user_id=${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store",
    }
  );

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (response.status === 403) {
    throw new Error("FORBIDDEN");
  }

  if (response.status === 404) {
    throw new Error("REPORT_NOT_FOUND");
  }

  if (response.status === 429) {
    throw new Error("RATE_LIMITED");
  }

  if (!response.ok) {
    const message =
      await getApiErrorMessage(
        response,
        `Failed to load report (${response.status})`
      );

    throw new Error(message);
  }

  const report =
    await response.json();

  return report;
}

/* ============================================================
   API — DELETE REPORT
============================================================ */

async function apiDeleteHistoryReport(
  id: string,
  userId: string,
  token: string
): Promise<void> {
  if (!userId) {
    throw new Error("USER_ID_REQUIRED");
  }

  if (!token) {
    throw new Error("TOKEN_REQUIRED");
  }

  const response = await fetch(
    `${API_BASE}/analyzer/history/${encodeURIComponent(
      id
    )}?user_id=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      headers: authHeaders(token),
    }
  );

  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (response.status === 403) {
    throw new Error("FORBIDDEN");
  }

  if (response.status === 404) {
    throw new Error("REPORT_NOT_FOUND");
  }

  if (response.status === 429) {
    throw new Error("RATE_LIMITED");
  }

  if (!response.ok) {
    const message =
      await getApiErrorMessage(
        response,
        `Failed to delete report (${response.status})`
      );

    throw new Error(message);
  }

  const data =
    await response.json();

  if (
    !data ||
    data.status !== "deleted"
  ) {
    throw new Error(
      "Delete did not complete"
    );
  }
}

/* ============================================================
   API — SAVE FINAL REPORT
============================================================ */

export async function saveToHistory(entry: {
  userId: string;
  token: string;
  sessionId?: string;
  cisLink?: string;
  paperLink?: string;
  paperType?: string;
  courseCode?: string;
  title: string;
  aiScore?: string;
  status?: string;
  reportMd: string;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  try {
    if (!entry.userId) {
      console.error(
        "saveToHistory: userId is missing"
      );

      return null;
    }

    if (!entry.token) {
      console.error(
        "saveToHistory: access token is missing"
      );

      return null;
    }

    if (!entry.reportMd?.trim()) {
      console.error(
        "saveToHistory: reportMd is empty"
      );

      return null;
    }

    const sessionId =
      entry.sessionId ||
      (typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"
        ? crypto.randomUUID()
        : `session-${Date.now()}`);

    const response = await fetch(
      `${API_BASE}/analyzer/history/save`,
      {
        method: "POST",
        headers: authHeaders(
          entry.token,
          true
        ),
        body: JSON.stringify({
          user_id: entry.userId,
          session_id: sessionId,
          cis_link: entry.cisLink || "",
          paper_link: entry.paperLink || "",
          paper_type: entry.paperType || "final",
          report_type: "Final Report",
          course_code: entry.courseCode || "",
          title: entry.title || "",
          ai_score: entry.aiScore || "",
          status: entry.status || "completed",
          report_md: entry.reportMd,
          created_at: new Date().toISOString(),
          metadata: entry.metadata || {},
        }),
      }
    );

    if (response.status === 401) {
      console.error(
        "saveToHistory: unauthorized"
      );

      return null;
    }

    if (response.status === 403) {
      console.error(
        "saveToHistory: forbidden"
      );

      return null;
    }

    if (response.status === 429) {
      console.error(
        "saveToHistory: rate limited"
      );

      return null;
    }

    if (!response.ok) {
      const message =
        await getApiErrorMessage(
          response,
          `Save failed (${response.status})`
        );

      console.error(
        "saveToHistory:",
        message
      );

      return null;
    }

    const data =
      await response.json();

    if (
      !data ||
      typeof data.report_id !==
        "string"
    ) {
      console.error(
        "saveToHistory: backend did not return report_id"
      );

      return null;
    }

    return data.report_id;
  } catch (error) {
    console.error(
      "saveToHistory error:",
      error
    );

    return null;
  }
}

/* ============================================================
   CLIENT-SIDE MARKDOWN DOWNLOAD
============================================================ */

function downloadReportMarkdown(
  reportMd: string,
  title: string,
  id: string
) {
  if (!reportMd?.trim()) {
    throw new Error(
      "Report content is empty"
    );
  }

  const safeTitle =
    (title || "Final_Report")
      .trim()
      .replace(
        /[<>:"/\\|?*\x00-\x1F]/g,
        ""
      )
      .replace(/\s+/g, "_")
      .slice(0, 100) ||
    "Final_Report";

  const shortId =
    id?.slice(0, 8) ||
    "report";

  const blob = new Blob(
    [reportMd],
    {
      type: "text/markdown;charset=utf-8",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;

  anchor.download =
    `${safeTitle}_${shortId}.md`;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  document.body.removeChild(
    anchor
  );

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* ============================================================
   PDF DOWNLOAD
============================================================ */

async function downloadReportPDF(
  entry: HistoryEntry
) {
  const date = parseIsoSafe(entry.date);

  const dateStr = date
    ? `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`
    : "report";

  await generateReportPDF({
    report:
      entry.report ||
      entry.preview ||
      "",
    courseName:
      entry.courseName,
    courseCode:
      entry.courseCode,
    paperType:
      entry.paperType ||
      "Final",
    fileName:
      `IntelliPaper_${
        entry.courseCode ||
        "Report"
      }_${
        entry.paperType ||
        "Final"
      }_${dateStr}.pdf`,
  });
}

/* ============================================================
   SHARED SKELETON PRIMITIVE
   ------------------------------------------------------------
   Used across the header stats, the results list, and anywhere
   else on this page that needs a loading placeholder, so every
   pulse matches in color, radius, and timing.
============================================================ */

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-white/10 ${className}`}
    />
  );
}

/* ============================================================
   DELETE CONFIRMATION MODAL (PORTAL)
   ------------------------------------------------------------
   Rendered via createPortal to document.body so it escapes any
   parent stacking context (sidebar z-index, transforms, filters,
   backdrop-blur on a parent wrapper, etc). Without this, a modal
   rendered inside the page content could appear BEHIND a sidebar
   that has its own z-index/stacking context — which is exactly
   the "sidebar doesn't blur" symptom.
============================================================ */

function DeleteConfirmModal({
  entry,
  deleting,
  onCancel,
  onConfirm,
}: {
  entry: HistoryEntry;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Lock body scroll while the modal is open.
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
      setMounted(false);
    };
  }, []);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* Backdrop — covers the ENTIRE viewport, including sidebar. */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md dark:bg-black/80"
        onClick={() => !deleting && onCancel()}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/[0.08] dark:bg-[#0B0F14] sm:p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 sm:h-14 sm:w-14">
            <span className="material-symbols-outlined text-[24px] sm:text-[28px]">
              delete_forever
            </span>
          </div>

          <h3
            id="delete-modal-title"
            className="mt-4 text-base font-bold text-slate-900 dark:text-white sm:mt-5 sm:text-lg"
          >
            Delete this report?
          </h3>

          <p className="mt-2 max-w-sm text-xs leading-6 text-slate-500 dark:text-slate-400 sm:text-sm">
            This will permanently remove the vetting report from your moderation history. This action cannot be undone.
          </p>

          <div className="mt-5 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left dark:border-white/[0.07] dark:bg-white/[0.03]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Report
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-white">
              {entry.courseCode || "N/A"} ·{" "}
              {entry.courseName || "Untitled Report"}
            </p>
          </div>

          <div className="mt-6 flex w-full gap-3">
            <button
              onClick={onCancel}
              disabled={deleting}
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.06]"
            >
              Cancel
            </button>

            <button
              onClick={onConfirm}
              disabled={deleting}
              className="h-11 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
            >
              {deleting ? "Deleting…" : "Delete Report"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ============================================================
   COMPONENT
============================================================ */

export function HistoryDashboard({
  onBack,
  onChanged,
  userId: userIdProp,
  token: tokenProp,
}: {
  onBack: () => void;
  onChanged?: () => void;
  userId?: string;
  token?: string;
}) {
  /* ============================================================
     AUTH STATE
  ============================================================ */

  const [auth, setAuth] =
    useState<AuthContext>({
      userId: userIdProp || "",
      token: tokenProp || "",
    });

  const [authReady, setAuthReady] =
    useState(false);

  useEffect(() => {
    const resolveAuth = () => {
      const resolved =
        getAuthContext(
          userIdProp,
          tokenProp
        );

      setAuth(resolved);
      setAuthReady(true);

      console.log(
        "History auth resolved:",
        {
          hasUserId:
            Boolean(resolved.userId),
          hasToken:
            Boolean(resolved.token),
          userId: resolved.userId
            ? `${resolved.userId.slice(0, 6)}...`
            : "",
        }
      );
    };

    resolveAuth();

    const handleStorage = () => {
      resolveAuth();
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "intellipaper-auth-changed",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "intellipaper-auth-changed",
        handleStorage
      );
    };
  }, [userIdProp, tokenProp]);

  const { userId, token } = auth;

  /* ============================================================
     HISTORY STATE
  ============================================================ */

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("");

  const [entries, setEntries] =
    useState<HistoryEntry[]>([]);

  const [total, setTotal] =
    useState(0);

  const [page, setPage] =
    useState(0);

  const [loading, setLoading] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  /* ============================================================
     VIEW STATE
  ============================================================ */

  const [viewing, setViewing] =
    useState<HistoryEntry | null>(null);

  const [viewLoadingId, setViewLoadingId] =
    useState<string | null>(null);

  /* ============================================================
     DOWNLOAD STATE
  ============================================================ */

  const [downloading, setDownloading] =
    useState<string | null>(null);

  const [
    downloadingMarkdown,
    setDownloadingMarkdown,
  ] = useState<string | null>(null);

  /* ============================================================
     DELETE STATE
  ============================================================ */

  const [
    confirmDelete,
    setConfirmDelete,
  ] =
    useState<HistoryEntry | null>(null);

  const [deleting, setDeleting] =
    useState(false);

  /* ============================================================
     LOAD HISTORY
  ============================================================ */

  const loadHistory =
    useCallback(
      async () => {
        if (!authReady) {
          return;
        }

        if (!userId) {
          setLoadError(
            "You need to be signed in to view history."
          );

          setEntries([]);
          setTotal(0);

          return;
        }

        if (!token) {
          setLoadError(
            "Your authentication token is missing. Please sign in again."
          );

          setEntries([]);
          setTotal(0);

          return;
        }

        setLoading(true);
        setLoadError(null);

        try {
          const data =
            await apiFetchHistoryList(
              userId,
              token,
              {
                search:
                  search.trim() ||
                  undefined,
                status:
                  filter ||
                  undefined,
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE,
              }
            );

          setEntries(
            Array.isArray(data.reports)
              ? data.reports.map(mapApiReport)
              : []
          );

          setTotal(
            Number(data.total || 0)
          );
        } catch (error) {
          console.error(
            "History loading error:",
            error
          );

          const message =
            error instanceof Error
              ? error.message
              : "";

          if (message === "UNAUTHORIZED") {
            setLoadError(
              "Your session has expired. Please sign in again."
            );
          } else if (message === "FORBIDDEN") {
            setLoadError(
              "You do not have permission to view this history."
            );
          } else if (message === "RATE_LIMITED") {
            setLoadError(
              "Too many history requests. Please wait about one minute and try again."
            );
          } else if (message === "TOKEN_REQUIRED") {
            setLoadError(
              "Authentication token is missing. Please sign in again."
            );
          } else {
            setLoadError(
              message ||
                "Couldn't load history. Please try again."
            );
          }

          setEntries([]);
          setTotal(0);
        } finally {
          setLoading(false);
        }
      },
      [
        authReady,
        userId,
        token,
        search,
        filter,
        page,
      ]
    );

  /* ============================================================
     DEBOUNCED LOAD
  ============================================================ */

  useEffect(() => {
    if (!authReady) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        loadHistory();
      }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    authReady,
    userId,
    token,
    search,
    filter,
    page,
    loadHistory,
  ]);

  /* ============================================================
     RESET PAGE WHEN SEARCH/FILTER CHANGES
  ============================================================ */

  useEffect(() => {
    setPage(0);
  }, [search, filter]);

  /* ============================================================
     VIEW REPORT
  ============================================================ */

  const handleView =
    async (entry: HistoryEntry) => {
      if (!userId) {
        alert(
          "You need to be signed in to view this report."
        );

        return;
      }

      if (!token) {
        alert(
          "Your authentication session is missing. Please sign in again."
        );

        return;
      }

      setViewLoadingId(entry.id);

      try {
        const full =
          await apiFetchHistoryDetail(
            entry.id,
            userId,
            token
          );

        setViewing(mapApiReport(full));
      } catch (error) {
        console.error(
          "View report error:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "";

        if (message === "UNAUTHORIZED") {
          alert(
            "Your session has expired. Please sign in again."
          );
        } else if (message === "FORBIDDEN") {
          alert(
            "You do not have permission to view this report."
          );
        } else if (message === "REPORT_NOT_FOUND") {
          alert("Report not found.");

          setEntries((previous) =>
            previous.filter(
              (item) => item.id !== entry.id
            )
          );

          setTotal((previous) =>
            Math.max(0, previous - 1)
          );
        } else if (message === "RATE_LIMITED") {
          alert(
            "Too many requests. Please wait about one minute and try again."
          );
        } else {
          alert(
            message ||
              "Couldn't load this report. Please try again."
          );
        }
      } finally {
        setViewLoadingId(null);
      }
    };

  /* ============================================================
     DELETE REPORT
  ============================================================ */

  const handleDelete =
    async (entry: HistoryEntry) => {
      if (!userId) {
        alert(
          "You need to be signed in to delete this report."
        );

        return;
      }

      if (!token) {
        alert(
          "Your authentication session is missing. Please sign in again."
        );

        return;
      }

      setDeleting(true);

      try {
        await apiDeleteHistoryReport(
          entry.id,
          userId,
          token
        );

        const remainingEntries =
          entries.filter(
            (item) => item.id !== entry.id
          );

        setEntries(remainingEntries);

        setTotal((previous) =>
          Math.max(0, previous - 1)
        );

        if (viewing?.id === entry.id) {
          setViewing(null);
        }

        if (
          remainingEntries.length === 0 &&
          page > 0
        ) {
          setPage((previous) =>
            Math.max(0, previous - 1)
          );
        }

        onChanged?.();
      } catch (error) {
        console.error(
          "Delete report error:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "";

        if (message === "UNAUTHORIZED") {
          alert(
            "Your session has expired. Please sign in again."
          );
        } else if (message === "FORBIDDEN") {
          alert(
            "You do not have permission to delete this report."
          );
        } else if (message === "REPORT_NOT_FOUND") {
          alert(
            "Report not found. It may already have been deleted."
          );

          await loadHistory();
        } else if (message === "RATE_LIMITED") {
          alert(
            "Too many requests. Please wait about one minute and try again."
          );
        } else {
          alert(
            message ||
              "Couldn't delete this report. Please try again."
          );
        }
      } finally {
        setDeleting(false);
        setConfirmDelete(null);
      }
    };

  /* ============================================================
     DOWNLOAD MARKDOWN
  ============================================================ */

  const handleDownloadMarkdown =
    async (entry: HistoryEntry) => {
      if (!userId) {
        alert(
          "You need to be signed in to download this report."
        );

        return;
      }

      if (!token) {
        alert(
          "Your authentication session is missing. Please sign in again."
        );

        return;
      }

      setDownloadingMarkdown(entry.id);

      try {
        let full = entry;

        if (!full.report?.trim()) {
          const detail =
            await apiFetchHistoryDetail(
              entry.id,
              userId,
              token
            );

          full = mapApiReport(detail);
        }

        if (!full.report?.trim()) {
          throw new Error(
            "The report content is empty."
          );
        }

        downloadReportMarkdown(
          full.report,
          full.courseName ||
            full.courseCode ||
            "Final_Report",
          full.id
        );
      } catch (error) {
        console.error(
          "Markdown download error:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "";

        if (message === "UNAUTHORIZED") {
          alert(
            "Your session has expired. Please sign in again."
          );
        } else if (message === "REPORT_NOT_FOUND") {
          alert("Report not found.");
        } else if (message === "RATE_LIMITED") {
          alert(
            "Too many requests. Please wait about one minute and try again."
          );
        } else {
          alert(
            message ||
              "Markdown download failed. Please try again."
          );
        }
      } finally {
        setDownloadingMarkdown(null);
      }
    };

  /* ============================================================
     DOWNLOAD PDF
  ============================================================ */

  const handleDownload =
    async (entry: HistoryEntry) => {
      if (!userId) {
        alert(
          "You need to be signed in to download this report."
        );

        return;
      }

      if (!token) {
        alert(
          "Your authentication session is missing. Please sign in again."
        );

        return;
      }

      setDownloading(entry.id);

      try {
        let full = entry;

        if (!full.report?.trim()) {
          const detail =
            await apiFetchHistoryDetail(
              entry.id,
              userId,
              token
            );

          full = mapApiReport(detail);
        }

        if (!full.report?.trim()) {
          throw new Error(
            "The report content is empty."
          );
        }

        await downloadReportPDF(full);
      } catch (error) {
        console.error(
          "PDF download error:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "";

        if (message === "UNAUTHORIZED") {
          alert(
            "Your session has expired. Please sign in again."
          );
        } else if (message === "REPORT_NOT_FOUND") {
          alert("Report not found.");
        } else if (message === "RATE_LIMITED") {
          alert(
            "Too many requests. Please wait about one minute and try again."
          );
        } else {
          alert(
            message ||
              "PDF download failed. Please try again."
          );
        }
      } finally {
        setDownloading(null);
      }
    };

  /* ============================================================
     SCORE
  ============================================================ */

  const getScore =
    useCallback(
      (entry: HistoryEntry) => {
        if (entry.aiScore) {
          const match =
            entry.aiScore.match(/(\d{1,3})/);

          if (match) {
            const value = parseInt(
              match[1],
              10
            );

            if (value >= 0 && value <= 100) {
              return value;
            }
          }
        }

        const text =
          entry.report ||
          entry.preview ||
          "";

        const match =
          text.match(/(\d{1,3})\s*%/);

        if (!match) {
          return null;
        }

        const value = parseInt(
          match[1],
          10
        );

        return value >= 0 && value <= 100
          ? value
          : null;
      },
      []
    );

  const scoreFor =
    useCallback(
      (entry: HistoryEntry) => {
        const score = getScore(entry);

        if (score === null) {
          return {
            score: null,
            label: "Not scored",
            color: "bg-slate-400",
            text: "text-slate-500",
            badge:
              "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
          };
        }

        if (score >= 85) {
          return {
            score,
            label: "Excellent",
            color: "bg-emerald-500",
            text:
              "text-emerald-600 dark:text-emerald-400",
            badge:
              "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
          };
        }

        if (score >= 70) {
          return {
            score,
            label: "Good",
            color: "bg-amber-500",
            text:
              "text-amber-600 dark:text-amber-400",
            badge:
              "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
          };
        }

        return {
          score,
          label: "Needs Review",
          color: "bg-red-500",
          text: "text-red-600 dark:text-red-400",
          badge:
            "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
        };
      },
      [getScore]
    );

  /* ============================================================
     STATISTICS
  ============================================================ */

  const statistics =
    useMemo(() => {
      const scores =
        entries
          .map((entry) => getScore(entry))
          .filter(
            (score): score is number =>
              score !== null
          );

      const average =
        scores.length > 0
          ? Math.round(
              scores.reduce(
                (sum, score) =>
                  sum + score,
                0
              ) / scores.length
            )
          : 0;

      const excellent = scores.filter(
        (score) => score >= 80
      ).length;

      const needsReview = scores.filter(
        (score) => score < 80
      ).length;

      return {
        total,
        average,
        excellent,
        needsReview,
      };
    }, [entries, total, getScore]);

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  );

  /* ============================================================
     LOADING STATE FOR STAT TILES
     ------------------------------------------------------------
     Only treat this as a "first load" skeleton state — once any
     data has arrived, further background refreshes (search,
     filter, pagination) don't blank the tiles out again.
  ============================================================ */

  const statsLoading =
    (!authReady || loading) && entries.length === 0 && !loadError;

  /* ============================================================
     AUTH LOADING
  ============================================================ */

  if (!authReady) {
    return (
      <div className="w-full min-w-0 px-3 sm:px-0">
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Checking your session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <>
      {/* ============================================================
          DELETE MODAL — rendered via Portal to document.body so it
          sits ABOVE everything (including the sidebar) in the top
          stacking context. The backdrop blurs the entire viewport.
      ============================================================ */}

      {confirmDelete && (
        <DeleteConfirmModal
          entry={confirmDelete}
          deleting={deleting}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}

      {/* ============================================================
          MAIN CONTENT
      ============================================================ */}

      <div className="w-full min-w-0 space-y-4 overflow-x-hidden px-2 min-[300px]:px-2.5 min-[360px]:px-3 min-[360px]:space-y-5 sm:space-y-6 sm:px-0">

        {/* TOP HEADER — now a bordered/white card matching the rest
            of the page (stat tiles, result rows), instead of sitting
            directly on the page background. */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] min-[360px]:rounded-2xl min-[360px]:p-4 sm:p-5 lg:p-6">
          {/* subtle decorative accent, consistent with the report-detail header */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl" />

          <div className="relative flex flex-col gap-3 min-[360px]:gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-2.5 min-[360px]:gap-3 sm:gap-4">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-1.5 min-[360px]:gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 min-[360px]:h-7 min-[360px]:w-7 sm:h-8 sm:w-8">
                    <span className="material-symbols-outlined text-[14px] min-[360px]:text-[16px] sm:text-[18px]">
                      history
                    </span>
                  </span>

                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-600 dark:text-emerald-400 min-[360px]:text-[11px] min-[360px]:tracking-[0.14em] sm:text-xs">
                    IntelliPaper
                  </span>
                </div>

                <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 dark:text-white min-[360px]:text-xl sm:text-2xl sm:whitespace-normal lg:text-3xl">
                  {viewing
                    ? "Vetting Report"
                    : "Moderation History"}
                </h1>

                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 min-[360px]:text-xs sm:text-sm">
                  {viewing
                    ? "Review the complete AI-generated academic assessment."
                    : "Review, search and manage previously vetted papers."}
                </p>
              </div>
            </div>

            {viewing && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  onClick={() =>
                    handleDownloadMarkdown(viewing)
                  }
                  disabled={
                    downloadingMarkdown === viewing.id
                  }
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 text-[11px] font-semibold text-emerald-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-500/20 dark:bg-white/[0.03] dark:text-emerald-400 dark:hover:bg-emerald-500/10 min-[360px]:h-10 min-[360px]:gap-2 min-[360px]:px-4 min-[360px]:text-xs sm:h-11 sm:w-auto sm:px-5 sm:text-sm"
                >
                  <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] sm:text-[19px]">
                    markdown
                  </span>

                  {downloadingMarkdown === viewing.id
                    ? "Preparing..."
                    : "Download .md"}
                </button>

                <button
                  onClick={() => handleDownload(viewing)}
                  disabled={downloading === viewing.id}
                  className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[11px] font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 min-[360px]:h-10 min-[360px]:gap-2 min-[360px]:px-4 min-[360px]:text-xs sm:h-11 sm:w-auto sm:px-5 sm:text-sm"
                >
                  <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] sm:text-[19px]">
                    picture_as_pdf
                  </span>

                  {downloading === viewing.id
                    ? "Preparing PDF..."
                    : "Download PDF"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* DETAIL VIEW */}
        {viewing ? (
          <div className="space-y-5 sm:space-y-6">
            <div className="relative overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-3 shadow-sm dark:border-emerald-500/10 dark:from-emerald-500/[0.08] dark:via-white/[0.02] dark:to-teal-500/[0.06] min-[360px]:rounded-2xl min-[360px]:p-4 sm:p-6">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl" />

              <div className="relative flex flex-col gap-4 min-[360px]:gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="flex min-w-0 items-center gap-2.5 min-[360px]:gap-3 sm:gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 min-[360px]:h-11 min-[360px]:w-11 sm:h-14 sm:w-14">
                    <span className="material-symbols-outlined text-[20px] min-[360px]:text-[24px] sm:text-[30px]">
                      verified
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 min-[360px]:text-[11px]">
                      AI Assessment Complete
                    </p>

                    <h2 className="mt-1 text-base font-bold text-slate-900 dark:text-white min-[360px]:text-lg sm:text-xl">
                      Final Vetting Report
                    </h2>

                    <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400 min-[360px]:text-xs sm:text-sm">
                      {viewing.courseCode || "—"} ·{" "}
                      {viewing.courseName || "Untitled Report"}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 sm:text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 min-[360px]:text-[11px]">
                    Compliance Score
                  </p>

                  <p className="mt-1 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 min-[360px]:text-3xl sm:text-4xl">
                    {scoreFor(viewing).score !== null
                      ? `${scoreFor(viewing).score}%`
                      : "—"}
                  </p>

                  <span
                    className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold min-[360px]:text-xs ${
                      scoreFor(viewing).badge
                    }`}
                  >
                    {scoreFor(viewing).label}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
              {[
                {
                  icon: "menu_book",
                  label: "Course",
                  value: viewing.courseName || "—",
                },
                {
                  icon: "tag",
                  label: "Course Code",
                  value: viewing.courseCode || "—",
                },
                {
                  icon: "description",
                  label: "Exam Type",
                  value:
                    (viewing.paperType || "Final")
                      .charAt(0)
                      .toUpperCase() +
                    (viewing.paperType || "Final").slice(1),
                },
                {
                  icon: "calendar_today",
                  label: "Date Vetted",
                  value: formatDate(viewing.date),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.025] min-[360px]:rounded-2xl min-[360px]:p-3.5 sm:p-4"
                >
                  <div className="flex min-w-0 items-start gap-2 min-[360px]:gap-2.5 sm:gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300 min-[360px]:h-9 min-[360px]:w-9 sm:h-10 sm:w-10">
                      <span className="material-symbols-outlined text-[15px] min-[360px]:text-[17px] sm:text-[19px]">
                        {item.icon}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 min-[360px]:text-[10px] sm:text-[11px]">
                        {item.label}
                      </p>

                      <p className="mt-1 truncate text-xs font-semibold text-slate-800 dark:text-white min-[360px]:text-sm">
                        {item.value}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025]">
              <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3.5 dark:border-white/[0.07] sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                    Assessment Details
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Complete Final Report from history API
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 dark:bg-white/[0.04] dark:text-slate-400 sm:self-auto sm:py-2">
                  <span className="material-symbols-outlined text-[16px]">
                    schedule
                  </span>

                  {formatDate(viewing.date)}{" "}
                  {formatTime(viewing.date)}
                </div>
              </div>

              <div className="min-w-0 overflow-x-auto p-4 sm:p-7">
                <div className="markdown-content prose prose-sm prose-slate max-w-none dark:prose-invert sm:prose-base">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                  >
                    {viewing.report || viewing.preview || ""}
                  </ReactMarkdown>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={() => setViewing(null)}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06] sm:justify-start"
              >
                <span className="material-symbols-outlined text-[18px]">
                  arrow_back
                </span>

                Back to history
              </button>

              <button
                onClick={() => setConfirmDelete(viewing)}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <span className="material-symbols-outlined text-[18px]">
                  delete
                </span>

                Delete Report
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* STATISTICS */}
            <div className="grid grid-cols-2 gap-2 min-[360px]:gap-3 sm:gap-4 xl:grid-cols-4">
              <StatCard
                icon="description"
                label="Total Reports"
                value={statistics.total}
                description="Final Reports in history"
                iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                isLoading={statsLoading}
              />

              <StatCard
                icon="verified"
                label="Excellent"
                value={statistics.excellent}
                description="80% or higher"
                iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                isLoading={statsLoading}
              />

              <StatCard
                icon="analytics"
                label="Average Score"
                value={
                  statistics.average
                    ? `${statistics.average}%`
                    : "—"
                }
                description="Across scored reports"
                iconClass="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                isLoading={statsLoading}
              />

              <StatCard
                icon="warning"
                label="Needs Review"
                value={statistics.needsReview}
                description="Below 80%"
                iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                isLoading={statsLoading}
              />
            </div>

            {/* SEARCH / FILTER */}
            <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] min-[360px]:rounded-2xl min-[360px]:p-3.5 sm:p-4">
              <div className="flex min-w-0 flex-col gap-2.5 min-[360px]:gap-3 lg:flex-row">
                <div className="relative min-w-0 flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-slate-400 min-[360px]:left-3.5 min-[360px]:text-[19px] sm:left-4 sm:text-[20px]">
                    search
                  </span>

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search course, code or type..."
                    className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-white dark:focus:bg-white/[0.05] min-[360px]:h-11 min-[360px]:pl-10 min-[360px]:text-sm sm:pl-11 sm:pr-4"
                  />
                </div>

                <div className="relative w-full min-w-0 lg:w-52">
                  <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[17px] text-slate-400 min-[360px]:left-3 min-[360px]:text-[19px]">
                    filter_list
                  </span>

                  <select
                    value={filter}
                    onChange={(event) =>
                      setFilter(event.target.value)
                    }
                    className="h-10 w-full min-w-0 max-w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-8 text-xs font-medium text-slate-700 outline-none transition-all focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-200 min-[360px]:h-11 min-[360px]:pl-10 min-[360px]:pr-9 min-[360px]:text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>

                  <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-slate-400 min-[360px]:right-3 min-[360px]:text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* RESULTS HEADER */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                  Recent Final Reports
                </h2>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {loading
                    ? "Loading…"
                    : `${entries.length} of ${total} shown`}
                </p>
              </div>

              {(search || filter) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setFilter("");
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-white sm:px-3"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    close
                  </span>

                  <span className="hidden sm:inline">
                    Clear filters
                  </span>
                </button>
              )}
            </div>

            {/* ERROR */}
            {loadError && (
              <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 sm:flex-row sm:items-center sm:justify-between">
                <span>{loadError}</span>

                <button
                  onClick={() => loadHistory()}
                  disabled={loading}
                  className="shrink-0 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50 dark:bg-red-500/20 dark:text-red-300"
                >
                  Retry
                </button>
              </div>
            )}

            {/* LIST */}
            {loading && entries.length === 0 ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-white/[0.07] dark:bg-white/[0.025] sm:p-4"
                  >
                    <div className="flex flex-col gap-3.5 sm:gap-4 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                        <SkeletonBlock className="h-10 w-10 shrink-0 rounded-xl sm:h-11 sm:w-11" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex gap-1.5">
                            <SkeletonBlock className="h-4 w-16 rounded-md" />
                            <SkeletonBlock className="h-4 w-20 rounded-full" />
                          </div>
                          <SkeletonBlock className="h-4 w-3/5" />
                          <SkeletonBlock className="h-3 w-2/5" />
                        </div>
                      </div>

                      <div className="w-full lg:w-52 space-y-2">
                        <div className="flex items-center justify-between">
                          <SkeletonBlock className="h-3 w-16" />
                          <SkeletonBlock className="h-3 w-8" />
                        </div>
                        <SkeletonBlock className="h-2 w-full rounded-full" />
                      </div>

                      <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 dark:border-white/[0.06] lg:flex lg:shrink-0 lg:items-center lg:border-t-0 lg:pt-0">
                        {[0, 1, 2, 3].map((btn) => (
                          <SkeletonBlock
                            key={btn}
                            className="h-10 w-full rounded-xl lg:w-10"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center dark:border-white/[0.1] dark:bg-white/[0.02] sm:px-6 sm:py-16">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-slate-500 sm:h-16 sm:w-16">
                  <span className="material-symbols-outlined text-[26px] sm:text-[30px]">
                    history
                  </span>
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-white sm:mt-5 sm:text-base">
                  No reports found
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                  {search || filter
                    ? "Try changing your search term or status filter."
                    : "Final Reports generated by the VET system will appear here."}
                </p>

                {(search || filter) && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilter("");
                    }}
                    className="mt-5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => {
                  const score = scoreFor(entry);

                  return (
                    <div
                      key={entry.id}
                      className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.025] dark:hover:border-emerald-500/20 dark:hover:bg-white/[0.035] sm:p-4"
                    >
                      <div className="flex flex-col gap-3.5 sm:gap-4 lg:flex-row lg:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 sm:h-11 sm:w-11">
                            <span className="material-symbols-outlined text-[19px] sm:text-[21px]">
                              description
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-white/[0.06] dark:text-slate-300 sm:py-1 sm:text-[11px]">
                                {entry.courseCode || "N/A"}
                              </span>

                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 sm:py-1 sm:text-[10px]">
                                Final Report
                              </span>

                              {entry.status &&
                                entry.status !== "completed" && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:py-1 sm:text-[10px] ${
                                      entry.status === "failed"
                                        ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                                        : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                                    }`}
                                  >
                                    {entry.status}
                                  </span>
                                )}
                            </div>

                            <h3 className="mt-1.5 truncate text-sm font-bold text-slate-900 dark:text-white">
                              {entry.courseName || "Untitled Report"}
                            </h3>

                            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                              {(entry.paperType || "Final")
                                .charAt(0)
                                .toUpperCase() +
                                (entry.paperType || "Final").slice(1)}{" "}
                              · {formatDate(entry.date)}
                            </p>
                          </div>
                        </div>

                        <div className="w-full lg:w-52">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 sm:text-[11px]">
                              AI Score
                            </span>

                            <span
                              className={`text-sm font-bold ${score.text}`}
                            >
                              {score.score !== null
                                ? `${score.score}%`
                                : "—"}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.08]">
                            <div
                              className={`h-full rounded-full transition-all ${score.color}`}
                              style={{
                                width: `${Math.min(
                                  score.score ?? 0,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 dark:border-white/[0.06] lg:flex lg:shrink-0 lg:items-center lg:border-t-0 lg:pt-0">
                          <button
                            onClick={() => handleView(entry)}
                            disabled={viewLoadingId === entry.id}
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 sm:gap-2 sm:px-3.5 sm:text-xs"
                          >
                            <span className="material-symbols-outlined text-[16px] sm:text-[17px]">
                              visibility
                            </span>

                            <span>
                              {viewLoadingId === entry.id
                                ? "Loading…"
                                : "View"}
                            </span>
                          </button>

                          <button
                            onClick={() =>
                              handleDownloadMarkdown(entry)
                            }
                            disabled={
                              downloadingMarkdown === entry.id
                            }
                            className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 lg:w-10"
                            title="Download Markdown"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              markdown
                            </span>
                          </button>

                          <button
                            onClick={() => handleDownload(entry)}
                            disabled={downloading === entry.id}
                            className="flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 lg:w-10"
                            title="Download PDF"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              picture_as_pdf
                            </span>
                          </button>

                          <button
                            onClick={() => setConfirmDelete(entry)}
                            className="flex h-10 w-full items-center justify-center rounded-xl border border-transparent bg-red-50 text-red-500 transition-all hover:bg-red-100 hover:text-red-600 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/15 lg:w-10"
                            title="Delete report"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PAGINATION */}
            {total > 0 && (
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-xs text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <span>
                  Showing{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {page * PAGE_SIZE + 1}
                    {"–"}
                    {Math.min(
                      (page + 1) * PAGE_SIZE,
                      total
                    )}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-slate-700 dark:text-slate-200">
                    {total}
                  </strong>{" "}
                  reports
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPage((previous) =>
                        Math.max(0, previous - 1)
                      )
                    }
                    disabled={page === 0 || loading}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300"
                  >
                    Prev
                  </button>

                  <span>
                    Page {page + 1} of {totalPages}
                  </span>

                  <button
                    onClick={() =>
                      setPage((previous) =>
                        Math.min(
                          totalPages - 1,
                          previous + 1
                        )
                      )
                    }
                    disabled={
                      page >= totalPages - 1 || loading
                    }
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  icon,
  label,
  value,
  description,
  iconClass,
  isLoading = false,
}: {
  icon: string;
  label: string;
  value: string | number;
  description: string;
  iconClass: string;
  isLoading?: boolean;
}) {
  return (
    <div className="group min-w-0 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/[0.07] dark:bg-white/[0.025] min-[360px]:rounded-2xl min-[360px]:p-3.5 sm:p-4">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl min-[360px]:h-9 min-[360px]:w-9 sm:h-10 sm:w-10 ${iconClass}`}
        >
          <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] sm:text-[20px]">
            {icon}
          </span>
        </div>

        <span className="material-symbols-outlined hidden text-[18px] text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600 sm:inline-block">
          arrow_forward
        </span>
      </div>

      <div className="mt-2.5 min-[360px]:mt-3 sm:mt-4">
        <p className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400 min-[360px]:text-[11px] sm:text-xs">
          {label}
        </p>

        {isLoading ? (
          <SkeletonBlock className="mt-1.5 h-5 w-12 min-[360px]:h-6 min-[360px]:w-14 sm:h-7 sm:w-16" />
        ) : (
          <p className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white min-[360px]:text-xl sm:text-2xl">
            {value}
          </p>
        )}

        <p className="mt-1 hidden text-[11px] text-slate-400 dark:text-slate-500 sm:block">
          {description}
        </p>
      </div>
    </div>
  );
}