"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import VetWizard from "./vetwizard";
import Chat from "./chat";
import { HistoryDashboard, getAuthContext, HistoryEntry, ApiHistoryReport } from "./history";

export interface CISItem {
  cis_id: string;
  course_id: string;
  course_name: string;
  department: string;
  semester?: number | null;
  link?: string;
  last_update_time?: string;
}

const SSUET_LOGO_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC_pDKxWLsoyx_K8Hm8X5Hz0yIsVSUNRD0tplkRfChXcYJFJNWmiPwDXvzByjF4_6vcn6tdlQNtnQcoRa7iu3cSn9jwHXLpBkIXDRV0Q2h2G5sDtG_ygiYvOMVh24zIFBalsKznh87V5c9X-sdGr3a6szgTBSzljfy6Yjd9sW9qSNmrSCNxCNGUU3yxEol9ODz1RubfOxJLGEB9ef-OlL1gKyiPvc4I5FidQfosmSAKzSt6JsfFSae3tY4rAff38e5INg";

const PROFILE_FALLBACK_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDALNG9EIxj1WfvhhlCoO_-lzrx4llQVe2C5TI09cG_YK9ibxFGWdkGj1LW-0O9iQ5EVPDXMztuwZEfQFFcvkp4oLDyp78KhjYnrnhqOS4B7rC16jA_D-RLWkhhzQs9zz2YGZPoE6_giCvkUtadhwT3OzRcz3TEI0zqr3U3MEAdYUmr0EDC_SHlY0dvJpI7H7I8OIx-NRrpu8R5v7ieXRvfW7fxYJNGtCgLXdAog4zlj3Crqzl8iFEC";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const token = () => (typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "");

type ActiveView = "dashboard" | "history" | "chat" | "vet";

export default function FacultyDashboard() {
  const router = useRouter();

  /* =========================================================
     USER
     ========================================================= */
  const [userName, setUserName] = useState("Prof. Shahrukh Ahmed");
  const [facultyId, setFacultyId] = useState("FAC-001");
  const [userDepartment, setUserDepartment] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  /* =========================================================
     CIS
     ========================================================= */
  const [allCis, setAllCis] = useState<CISItem[]>([]);
  const [recentCis, setRecentCis] = useState<CISItem[]>([]);
  const [isLoadingCis, setIsLoadingCis] = useState(true);

  /* =========================================================
     HISTORY / VIEW
     ========================================================= */
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [hydrated, setHydrated] = useState(false);

  /* =========================================================
     MODALS
     ========================================================= */
  const [openSettings, setOpenSettings] = useState(false);

  /* =========================================================
     TOAST
     ========================================================= */
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  /* =========================================================
     THEME
     ========================================================= */
  const [isDark, setIsDark] = useState(false);

  /* =========================================================
     CLOCK
     ========================================================= */
  const [now, setNow] = useState(new Date());

  /* =========================================================
     SIDEBAR
     ========================================================= */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkWidth = () => {
      const narrow = window.innerWidth <= 480;
      setIsNarrowScreen(narrow);
      setSidebarCollapsed((prev) => (narrow ? true : prev));
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  /* =========================================================
     HISTORY STATS
     ========================================================= */
  const refreshHistoryStats = useCallback(async () => {
    const { userId, token: authToken } = getAuthContext();
    if (!userId || !authToken) {
      setHistoryEntries([]);
      setIsLoadingHistory(false);
      return;
    }
    try {
      const params = new URLSearchParams({
        user_id: userId,
        limit: "50",
        offset: "0",
        report_type: "Final Report",
      });
      const response = await fetch(`${API_BASE_URL}/api/v1/analyzer/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`History load failed (${response.status})`);
      const data = await response.json();
      const reports: ApiHistoryReport[] = Array.isArray(data?.reports) ? data.reports : [];
      setHistoryEntries(
        reports.map((r) => ({
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
        }))
      );
    } catch {
      // Backend unreachable — keep previous entries rather than wiping the UI.
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated && activeView === "dashboard") {
      refreshHistoryStats();
    }
  }, [activeView, hydrated, refreshHistoryStats]);

  /* =========================================================
     LOAD USER / CIS
     ========================================================= */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const t = localStorage.getItem("access_token");
    if (!t) {
      router.replace("/");
      return;
    }

    const theme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (theme === "dark" || (!("theme" in localStorage) && prefersDark)) {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }

    const load = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (!response.ok) throw new Error("Failed to load user information");

        const userInfo = await response.json();

        if (userInfo?.role === "admin") {
          router.replace("/dashboard");
          return;
        }

        setUserName(userInfo?.name || userInfo?.username || "Prof. Shahrukh Ahmed");
        setFacultyId(userInfo?.faculty_id || "FAC-001");
        setUserDepartment(userInfo?.department || "");
        setProfileImage(userInfo?.user_profile_image_link || null);

        const cisResponse = await fetch(`${API_BASE_URL}/api/v1/cis`, {
          headers: { Authorization: `Bearer ${token()}` },
        });

        if (cisResponse.ok) {
          const cisData = await cisResponse.json();
          const cisList = Array.isArray(cisData) ? cisData : [];
          setAllCis(cisList);
          setRecentCis(cisList.slice(0, 5));
        }
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        router.replace("/");
      } finally {
        setIsLoadingCis(false);
      }
    };

    load();
  }, [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAllModals();
        setSidebarCollapsed(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const closeAllModals = () => {
    setOpenSettings(false);
  };

  /* =========================================================
     HISTORY DATA
     ========================================================= */
  const historyCount = historyEntries.length;

  const vettedThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return historyEntries.filter((entry) => new Date(entry.date).getTime() > weekAgo).length;
  }, [historyEntries]);

  /* =========================================================
     TOAST
     ========================================================= */
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* =========================================================
     THEME TOGGLE
     ========================================================= */
  const toggleDarkMode = () => {
    const dark = !isDark;
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  /* =========================================================
     LOGOUT
     ========================================================= */
  const handleLogout = async () => {
    try {
      if (token()) {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token()}` },
        });
      }
    } catch {
      // Logout should continue even when backend request fails.
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      router.replace("/");
    }
  };

  /* =========================================================
     VET FINISH
     ========================================================= */
  const handleVetFinish = async (result: {
    finalReport: string;
    sessionId: string;
    filePath: string | null;
    courseName: string;
    courseCode: string;
    paperType: string;
  }) => {
    if (result.sessionId) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/analyzer/sessions/${result.sessionId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token()}` },
        });
      } catch {
        // Non-critical cleanup.
      }
    }

    if (result.filePath) {
      try {
        await fetch(`${API_BASE_URL}/api/v1/paper/${result.filePath}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token()}` },
        });
      } catch {
        // Non-critical cleanup.
      }
    }

    refreshHistoryStats();
  };

  /* =========================================================
     FORMATTERS
     ========================================================= */
  const parseDateSafe = (iso?: string): Date | null => {
    if (!iso) return null;

    const dateOnlyMatch = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const formatMonthDay = (iso?: string) => {
    const d = parseDateSafe(iso);
    if (!d) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const clockText = now.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const statusPill = (vetted: boolean) => (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border whitespace-nowrap ${
        vetted
          ? "bg-[#DCFCE7] dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/25 text-[#166534] border-[#BBF7D0]"
          : "bg-[#FEF3C7] dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/25 text-[#92400E] border-[#FDE68A]"
      }`}
    >
      {vetted ? "Vetted" : "Pending Review"}
    </span>
  );

  /* =========================================================
     RECENT PAPERS MAPPING
     ------------------------------------------------------------
     FIXED: previously the title was always
     `${courseName} ${paperType}` — which produced duplicates
     like "Computer Fundamentals & Programming Final Final"
     when courseName already ended with the exam type. Now we
     check whether the course name already contains the exam
     type before appending it.
     ========================================================= */
  const recentPapers = historyEntries.slice(0, 5).map((entry) => {
    const rawName = (entry.courseName || "").trim();
    const typeRaw = (entry.paperType || "Final").trim();
    const paperType =
      typeRaw.charAt(0).toUpperCase() + typeRaw.slice(1).toLowerCase();

    const alreadyHasType = new RegExp(`\\b${paperType}\\b`, "i").test(rawName);
    const title = alreadyHasType
      ? rawName || "Untitled Report"
      : `${rawName} ${paperType}`.trim() || "Untitled Report";

    return {
      code: entry.courseCode || "N/A",
      title,
      date: entry.date,
      vetted: true,
    };
  });

  /* =========================================================
     NAVIGATION
     ========================================================= */
  const runNav = (fn: () => void) => () => {
    fn();
    if (isNarrowScreen) setSidebarCollapsed(true);
  };

  const sidebarIsOverlay = isNarrowScreen && !sidebarCollapsed;

  const navItemClass = `flex items-center ${
    sidebarCollapsed ? "justify-center w-full h-11 px-0" : "justify-start gap-3 px-3 py-2.5 w-full"
  } text-on-surface-variant dark:text-[#94a3b8] hover:bg-panel-tint dark:hover:bg-white/[0.05] hover:text-[#15803D] dark:hover:text-[#4ADE80] hover:border hover:border-black dark:hover:border-white/40 border border-transparent rounded-xl transition-all duration-200 group cursor-pointer relative sidebar-nav-item`;
  const navIconClass =
    "group-hover:text-[#15803D] dark:group-hover:text-[#4ADE80] transition-colors duration-200 flex-shrink-0 text-[22px]";
  const navLabelClass = `font-display text-label-md font-semibold tracking-tight whitespace-nowrap transition-all duration-200 ${
    sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
  }`;

  const sectionLabelWrapClass = `mt-7 mb-3 px-3 whitespace-nowrap transition-all duration-200 ${
    sidebarCollapsed ? "opacity-0 h-0 overflow-hidden mt-0 mb-0" : "opacity-100"
  }`;

  const anyModalOpen = openSettings;

  return (
    <div className="flex min-h-screen bg-[#F0F2F0] dark:bg-[#141416] text-on-surface dark:text-white font-body antialiased overflow-x-hidden transition-colors duration-200">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap");
        .font-display {
          font-family: "Manrope", ui-sans-serif, sans-serif;
        }
        .font-body {
          font-family: "Plus Jakarta Sans", ui-sans-serif, sans-serif;
        }
        .tabular-nums {
          font-variant-numeric: tabular-nums;
        }
        [data-sidebar-collapsed="true"] .sidebar-nav-item {
          justify-content: center;
          padding-left: 0;
          padding-right: 0;
          width: 100%;
        }
      `}</style>

      {sidebarIsOverlay && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm animate-backdrop-enter"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* ── SIDE NAVBAR ── */}
      <aside
        data-sidebar-collapsed={sidebarCollapsed}
        className={`relative flex flex-col bg-white dark:bg-[#242426] border-r border-outline-variant dark:border-white/[0.07] ${
          sidebarCollapsed ? "w-[52px] min-[300px]:w-[60px] min-[360px]:w-[68px]" : "w-[190px] min-[300px]:w-[210px] min-[360px]:w-[240px] sm:w-[280px]"
        } h-screen flex-shrink-0 p-1.5 min-[300px]:p-2 min-[360px]:p-2.5 pt-2.5 min-[300px]:pt-3 gap-2 z-40 transition-[width] duration-300 overflow-y-auto overflow-x-hidden ${
          sidebarIsOverlay ? "fixed inset-y-0 left-0 shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)]" : "sticky top-0"
        }`}
      >
        <div
          className={`flex items-center h-12 mb-2 pb-2.5 border-b border-outline-variant dark:border-white/[0.07] ${
            sidebarCollapsed ? "justify-center px-0" : "justify-between px-1"
          }`}
        >
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-transparent flex items-center justify-center flex-shrink-0">
                <img alt="University Logo" className="h-8 w-8 object-contain" src={SSUET_LOGO_URL} />
              </div>
              <h1 className="font-display text-[13px] min-[360px]:text-[15px] sm:text-[17px] font-extrabold text-[#15803D] dark:text-[#4ADE80] tracking-tight uppercase truncate">
                Faculty Portal
              </h1>
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-on-surface-variant dark:text-[#94a3b8] hover:bg-panel-tint dark:hover:bg-white/[0.06] hover:text-[#15803D] dark:hover:text-[#4ADE80] transition-all flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">
              {sidebarCollapsed ? "left_panel_open" : "left_panel_close"}
            </span>
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-grow mt-2">
          <div
            onClick={runNav(() => setActiveView("dashboard"))}
            className={`flex items-center mt-2 cursor-pointer ${
              sidebarCollapsed ? "justify-center w-full h-11 px-0" : "justify-start gap-3 w-full px-3 py-3"
            } ${
              activeView === "dashboard"
                ? "bg-primary-container dark:bg-[#15803D] dark:border dark:border-emerald-400/25 text-white"
                : "text-on-surface-variant dark:text-[#94a3b8] hover:bg-panel-tint dark:hover:bg-white/[0.05]"
            } rounded-xl font-bold transition-all active:scale-[0.97]`}
            title="Dashboard"
          >
            <span
              className="material-symbols-outlined flex-shrink-0"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              dashboard
            </span>
            <span className={navLabelClass}>Dashboard</span>
          </div>

          <div className={sectionLabelWrapClass}>
            <span className="text-[11px] font-extrabold text-[#15803D] dark:text-[#4ADE80] uppercase tracking-[0.12em]">
              Paper Tools
            </span>
            <span className="block mt-2 h-[3px] w-12 rounded-full bg-[#15803D] dark:bg-[#4ADE80]"></span>
          </div>
          <button
            onClick={runNav(() => setActiveView("vet"))}
            className={`${navItemClass} w-full ${
              activeView === "vet"
                ? "bg-panel-tint dark:bg-white/[0.05] text-[#15803D] dark:text-[#4ADE80] border-black/10 dark:border-white/20"
                : ""
            }`}
            title="Vet a Paper"
          >
            <span className={`material-symbols-outlined ${navIconClass}`}>auto_awesome</span>
            <span className={navLabelClass}>Vet a Paper</span>
          </button>
          <button
            onClick={runNav(() => setActiveView("history"))}
            className={`${navItemClass} w-full ${
              activeView === "history"
                ? "bg-panel-tint dark:bg-white/[0.05] text-[#15803D] dark:text-[#4ADE80] border-black/10 dark:border-white/20"
                : ""
            }`}
            title="History"
          >
            <span className={`material-symbols-outlined ${navIconClass}`}>history</span>
            <span className={navLabelClass}>History</span>
          </button>
        </nav>
      </aside>

      {/* ── RIGHT COLUMN ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* ── TOP HEADER ── */}
        <header className="bg-white dark:bg-[#242426]/90 dark:backdrop-blur-xl border-b border-outline-variant dark:border-white/[0.06] shadow-sm flex items-center justify-end w-full h-[46px] min-[300px]:h-[50px] sm:h-[56px] px-2 min-[300px]:px-2.5 min-[360px]:px-3 sm:px-5 flex-shrink-0 z-50 gap-1 min-[300px]:gap-1.5 min-[360px]:gap-2 sm:gap-4 transition-colors duration-200">
          <div className="flex items-center gap-1 min-[300px]:gap-1.5 min-[360px]:gap-2.5 sm:gap-4 flex-shrink-0 ml-auto">
            <div className="relative cursor-pointer hover:text-primary transition-colors text-on-surface-variant dark:text-[#94a3b8] hidden xs:block">
              <span className="material-symbols-outlined text-outline dark:text-[#94a3b8]">notifications</span>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-on-surface-variant dark:text-[#94a3b8] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
            >
              <span className="material-symbols-outlined text-[19px]">logout</span>
              <span className="text-sm font-semibold">Logout</span>
            </button>

            <button
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              className="flex sm:hidden items-center justify-center w-8 h-8 rounded-lg text-on-surface-variant dark:text-[#94a3b8] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined text-[19px]">logout</span>
            </button>

            <div className="w-px h-6 bg-outline-variant dark:bg-white/10 hidden sm:block"></div>

            <div
              onClick={() => setOpenSettings(true)}
              className="w-8 h-8 min-[360px]:w-9 min-[360px]:h-9 sm:w-10 sm:h-10 bg-primary-container rounded-full flex items-center justify-center border-2 border-white cursor-pointer ring-2 ring-transparent hover:ring-primary-container dark:hover:ring-[#4ADE80]/50 transition-all dark:border-[#242426] flex-shrink-0"
            >
              <img
                alt="Profile"
                className="w-full h-full object-cover rounded-full"
                src={profileImage || PROFILE_FALLBACK_URL}
                onError={(e) => ((e.target as HTMLImageElement).src = PROFILE_FALLBACK_URL)}
              />
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto p-2.5 min-[300px]:p-3 min-[360px]:p-4 sm:p-6 lg:p-8 w-full relative dark:bg-[#1C1C1E]">
          <div className="max-w-[1200px] mx-auto space-y-3 min-[300px]:space-y-4 min-[360px]:space-y-6 sm:space-y-8 relative z-10">
            {activeView === "history" ? (
              <HistoryDashboard onBack={() => setActiveView("dashboard")} onChanged={refreshHistoryStats} />
            ) : activeView === "chat" ? (
              <div className="bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border border-outline-variant dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col min-h-[70vh]">
                <div className="p-4 sm:p-5 border-b border-outline-variant dark:border-white/[0.08] flex items-center gap-3 bg-white dark:bg-transparent">
                  <button
                    onClick={() => setActiveView("dashboard")}
                    aria-label="Back to dashboard"
                    title="Back to dashboard"
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-outline-variant dark:border-white/10 text-on-surface-variant dark:text-[#94a3b8] hover:bg-panel-tint dark:hover:bg-white/[0.06] transition-colors flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  </button>
                  <div className="min-w-0">
                    <h2 className="font-display text-base sm:text-headline-md font-bold tracking-tight text-on-surface dark:text-[#f8fafc]">
                      Ask Assistant
                    </h2>
                    <p className="text-xs sm:text-sm text-on-surface-variant dark:text-[#94a3b8] mt-0.5">
                      Get quick help with vetting, CIS, or portal questions
                    </p>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <Chat onClose={() => setActiveView("dashboard")} />
                </div>
              </div>
            ) : activeView === "vet" ? (
              <div className="bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border border-outline-variant dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col min-h-[70vh]">
                <VetWizard
                  onClose={() => setActiveView("dashboard")}
                  cisItems={allCis}
                  defaultDepartment={userDepartment}
                  onToast={showToast}
                  onFinish={handleVetFinish}
                />
              </div>
            ) : (
              <>
                {/* ── WELCOME / DATE EMBEDDED BOX ── */}
                <div className="bg-white dark:bg-[#242426] border border-[#15803D]/30 dark:border-[#4ADE80]/25 border-l-2 border-l-[#15803D] dark:border-l-[#4ADE80] rounded-2xl px-3 min-[300px]:px-4 min-[360px]:px-5 sm:px-6 py-3 min-[300px]:py-4 sm:py-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex h-3 w-3 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#15803D] dark:bg-[#4ADE80] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#15803D] dark:bg-[#4ADE80]"></span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-body text-sm sm:text-base text-on-surface-variant dark:text-[#94a3b8] truncate">
                          Welcome back,
                          <span className="ml-1 font-display font-extrabold text-[#15803D] dark:text-[#4ADE80]">
                            {userName}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs min-[360px]:text-sm sm:text-base text-on-surface-variant dark:text-[#94a3b8]">
                      <span className="material-symbols-outlined text-[17px] min-[360px]:text-[19px] text-[#15803D] dark:text-[#4ADE80] flex-shrink-0">
                        calendar_today
                      </span>
                      <span className="font-medium whitespace-nowrap">{clockText}</span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border border-outline-variant dark:border-white/[0.08] p-4 sm:p-5 shadow-sm hover:shadow-md dark:hover:border-amber-400/40 transition-all duration-300 dark:hover:-translate-y-0.5">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#FEF3C7] dark:bg-amber-400/15 dark:ring-1 dark:ring-amber-400/20 text-warning dark:text-amber-300 flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-[20px] sm:text-[24px]"
                          style={{ fontVariationSettings: '"FILL" 1' }}
                        >
                          pending_actions
                        </span>
                      </div>
                    </div>
                    <h3 className="font-body text-on-surface-variant dark:text-[#94a3b8] text-[11px] sm:text-label-md font-semibold uppercase tracking-wide mb-1.5">
                      Papers Vetted
                    </h3>
                    <p className="font-display text-3xl sm:text-display-lg font-extrabold tracking-tight tabular-nums text-on-surface dark:text-[#f8fafc] leading-none">
                      {isLoadingHistory ? "…" : historyCount}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border border-outline-variant dark:border-white/[0.08] p-4 sm:p-5 shadow-sm hover:shadow-md dark:hover:border-emerald-400/40 transition-all duration-300 dark:hover:-translate-y-0.5">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#E8F5E9] dark:bg-emerald-400/15 dark:ring-1 dark:ring-emerald-400/20 text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-[20px] sm:text-[24px]"
                          style={{ fontVariationSettings: '"FILL" 1' }}
                        >
                          task_alt
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-[#15803D] dark:text-[#4ADE80] bg-[#DCFCE7] dark:bg-emerald-400/10 dark:border-emerald-400/25 px-2 py-1 rounded-md border border-[#BBF7D0]">
                        This week
                      </span>
                    </div>
                    <h3 className="font-body text-on-surface-variant dark:text-[#94a3b8] text-[11px] sm:text-label-md font-semibold uppercase tracking-wide mb-1.5">
                      Vetted This Week
                    </h3>
                    <p className="font-display text-3xl sm:text-display-lg font-extrabold tracking-tight tabular-nums text-on-surface dark:text-[#f8fafc] leading-none">
                      {vettedThisWeek}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border border-outline-variant dark:border-white/[0.08] p-4 sm:p-5 shadow-sm hover:shadow-md dark:hover:border-emerald-400/40 transition-all duration-300 dark:hover:-translate-y-0.5">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#E6F4F1] dark:bg-teal-400/15 dark:ring-1 dark:ring-teal-400/20 text-primary-container dark:text-teal-300 flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-[20px] sm:text-[24px]"
                          style={{ fontVariationSettings: '"FILL" 1' }}
                        >
                          psychology
                        </span>
                      </div>
                    </div>
                    <h3 className="font-body text-on-surface-variant dark:text-[#94a3b8] text-[11px] sm:text-label-md font-semibold uppercase tracking-wide mb-1.5">
                      Available CIS
                    </h3>
                    <p className="font-display text-3xl sm:text-display-lg font-extrabold tracking-tight tabular-nums text-on-surface dark:text-[#f8fafc] leading-none">
                      {isLoadingCis ? "…" : allCis.length}
                    </p>
                  </div>
                </div>

                {/* Content Grid (Cards) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* ── Left Card: Recent Papers (FIXED) ── */}
                  <div className="lg:col-span-2 bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border border-outline-variant dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 sm:p-5 border-b border-outline-variant dark:border-white/[0.08] flex justify-between items-center bg-white dark:bg-transparent">
                      <h2 className="font-display text-base sm:text-headline-md font-bold tracking-tight text-on-surface dark:text-[#f8fafc]">
                        Recent Papers
                      </h2>
                      <button
                        onClick={() => setActiveView("history")}
                        className="text-xs sm:text-sm font-semibold text-primary-container dark:text-[#4ADE80] hover:text-primary-hover dark:hover:text-emerald-300 transition-colors flex items-center gap-1 flex-shrink-0"
                      >
                        See All <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>

                    {/* Table wrapper — no horizontal scroll; cells wrap instead */}
                    <div className="w-full overflow-x-hidden">
                      <table className="w-full table-fixed text-left text-sm">
                        <colgroup>
                          <col className="w-[24%] sm:w-[18%]" />
                          <col className="w-[46%] sm:w-[42%]" />
                          <col className="w-[30%] sm:w-[20%]" />
                          <col className="hidden md:table-column md:w-[20%]" />
                        </colgroup>
                        <thead className="bg-[#F5F6F5] dark:bg-white/[0.03] text-on-surface-variant dark:text-[#94a3b8] font-label-md border-b border-outline-variant dark:border-white/[0.08]">
                          <tr>
                            <th className="px-3 sm:px-5 py-3 font-semibold text-left align-middle">
                              Course Code
                            </th>
                            <th className="px-3 sm:px-5 py-3 font-semibold text-left align-middle">
                              Paper Title
                            </th>
                            <th className="px-3 sm:px-5 py-3 font-semibold text-center align-middle">
                              Status
                            </th>
                            <th className="hidden md:table-cell px-3 sm:px-5 py-3 font-semibold text-center align-middle">
                              Date
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant dark:divide-white/[0.06]">
                          {recentPapers.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-5 py-8 text-center text-on-surface-variant dark:text-[#94a3b8]"
                              >
                                {isLoadingHistory
                                  ? "Loading recent papers…"
                                  : "No reports vetted yet. Start a new vetting to see reports here."}
                              </td>
                            </tr>
                          ) : (
                            recentPapers.map((paper, index) => (
                              <tr
                                key={index}
                                onClick={() => setActiveView("history")}
                                className="hover:bg-[#F5F6F5] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                              >
                                <td className="px-3 sm:px-5 py-3 sm:py-4 align-middle">
                                  <span className="font-body font-semibold text-on-surface dark:text-[#f8fafc] break-words">
                                    {paper.code}
                                  </span>
                                </td>

                                <td className="px-3 sm:px-5 py-3 sm:py-4 align-middle text-on-surface-variant dark:text-[#94a3b8] break-words whitespace-normal leading-snug">
                                  {paper.title}
                                </td>

                                <td className="px-3 sm:px-5 py-3 sm:py-4 align-middle text-center">
                                  {statusPill(paper.vetted)}
                                </td>

                                <td className="hidden md:table-cell px-3 sm:px-5 py-3 sm:py-4 align-middle text-center text-on-surface-variant dark:text-[#94a3b8] whitespace-nowrap">
                                  {formatMonthDay(paper.date)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Card: Recent CIS */}
                  <div className="bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border border-outline-variant dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 sm:p-5 border-b border-outline-variant dark:border-white/[0.08] bg-white dark:bg-transparent flex justify-between items-center">
                      <h2 className="font-display text-base sm:text-headline-md font-bold tracking-tight text-on-surface dark:text-[#f8fafc]">
                        Recent CIS
                      </h2>
                    </div>
                    <div className="p-2 flex-grow overflow-y-auto max-h-[360px] lg:max-h-none">
                      <ul className="space-y-1">
                        {isLoadingCis ? (
                          <>
                            {[0, 1, 2, 3, 4].map((row) => (
                              <li key={`cis-skeleton-${row}`} className="flex items-center p-3 rounded-lg animate-pulse">
                                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-white/10 mr-3 sm:mr-4 flex-shrink-0" />
                                <div className="flex-grow min-w-0 space-y-2">
                                  <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-white/10" />
                                  <div className="h-3 w-20 rounded bg-gray-200 dark:bg-white/10" />
                                </div>
                              </li>
                            ))}
                          </>
                        ) : recentCis.length === 0 ? (
                          <li className="text-center p-4 text-sm text-on-surface-variant dark:text-[#94a3b8]">
                            No CIS documents available.
                          </li>
                        ) : (
                          recentCis.map((cis) => (
                            <li
                              key={cis.cis_id}
                              onClick={() => cis.link && window.open(cis.link, "_blank", "noopener,noreferrer")}
                              className="flex items-center p-3 hover:bg-[#F5F6F5] dark:hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer group"
                            >
                              <div className="w-10 h-10 rounded-lg bg-[#F0FDF4] dark:bg-emerald-500/15 border border-[#BBF7D0] dark:border-emerald-400/20 flex items-center justify-center text-[#15803D] dark:text-[#4ADE80] mr-3 sm:mr-4 flex-shrink-0 group-hover:bg-[#DCFCE7] dark:group-hover:border-emerald-400/40 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">description</span>
                              </div>
                              <div className="flex-grow min-w-0">
                                <h4 className="font-display text-sm font-bold tracking-tight text-on-surface dark:text-[#f8fafc] truncate">
                                  {cis.course_id}
                                  {cis.course_name ? ` · ${cis.course_name}` : ""}
                                </h4>
                                <p className="text-xs text-on-surface-variant dark:text-[#94a3b8] truncate">
                                  {cis.department || "—"}
                                </p>
                              </div>
                              <div className="flex flex-col items-center gap-1 ml-2 flex-shrink-0">
                                <span className="text-xs text-outline dark:text-[#94a3b8] whitespace-nowrap">
                                  {formatMonthDay(cis.last_update_time)}
                                </span>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                    <div className="p-3 sm:p-4 border-t border-outline-variant dark:border-white/[0.08] bg-white dark:bg-transparent">
                      <button
                        onClick={() => setActiveView("vet")}
                        className="w-full bg-[#15803D] hover:bg-[#166534] text-white py-2.5 px-4 rounded-lg font-medium transition-all flex justify-center items-center gap-2 active:scale-[0.98] dark:border dark:border-emerald-400/25"
                      >
                        <span className="material-symbols-outlined text-[18px]">auto_awesome</span> Vet a Paper
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* ── MODALS OVERLAY SYSTEM ── */}
      {anyModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 min-[360px]:p-4 bg-black/50 dark:bg-black/75 backdrop-blur-sm animate-backdrop-enter"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAllModals();
          }}
        >
          {openSettings && (
            <div className="modal-content bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border-t-4 border-outline dark:border-[#4ADE80] shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
              <div className="px-5 sm:px-6 py-4 border-b border-outline-variant dark:border-white/[0.08] flex justify-between items-center bg-white dark:bg-transparent rounded-t-xl sm:rounded-t-2xl">
                <h2 className="font-display text-headline-md font-bold tracking-tight text-on-surface dark:text-[#f8fafc]">
                  Settings
                </h2>
                <button
                  onClick={() => setOpenSettings(false)}
                  className="text-outline dark:text-[#94a3b8] hover:text-on-surface dark:hover:text-white transition-colors p-1 rounded-full hover:bg-surface-variant dark:hover:bg-white/[0.06]"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
                {/* Account */}
                <div>
                  <h3 className="text-label-md font-label-md text-on-surface dark:text-[#f8fafc] mb-3 border-b border-outline-variant dark:border-white/[0.08] pb-2">
                    Account
                  </h3>
                  <div className="flex items-center gap-3 py-2">
                    <img
                      alt="Profile"
                      className="w-11 h-11 rounded-full object-cover border border-outline-variant dark:border-white/10"
                      src={profileImage || PROFILE_FALLBACK_URL}
                      onError={(e) => ((e.target as HTMLImageElement).src = PROFILE_FALLBACK_URL)}
                    />
                    <div className="min-w-0">
                      <p className="font-body font-semibold text-on-surface dark:text-[#f8fafc] truncate">
                        {userName}
                      </p>
                      <p className="text-xs text-outline dark:text-[#94a3b8] mt-0.5">
                        {facultyId}
                        {userDepartment ? ` · ${userDepartment}` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Appearance */}
                <div>
                  <h3 className="text-label-md font-label-md text-on-surface dark:text-[#f8fafc] mb-3 border-b border-outline-variant dark:border-white/[0.08] pb-2">
                    Appearance
                  </h3>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-body-sm text-on-surface dark:text-[#f8fafc]">Dark Mode</span>
                    <div
                      onClick={toggleDarkMode}
                      className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer border border-outline-variant dark:border-white/10 ${
                        isDark ? "bg-primary-container dark:bg-[#15803D]" : "bg-surface-variant dark:bg-white/10"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full absolute left-1 top-1 shadow-sm transition-transform ${
                          isDark ? "translate-x-5" : ""
                        }`}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-outline dark:text-[#94a3b8] mt-1">
                    Synced with your device preference by default.
                  </p>
                </div>

                {/* Notifications */}
                <div>
                  <h3 className="text-label-md font-label-md text-on-surface dark:text-[#f8fafc] mb-3 border-b border-outline-variant dark:border-white/[0.08] pb-2">
                    Notifications
                  </h3>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-body-sm text-on-surface dark:text-[#f8fafc]">
                      Email Alerts on New CIS Uploads
                    </span>
                    <button className="w-11 h-6 bg-primary-container dark:bg-[#15803D] rounded-full relative transition-colors">
                      <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 shadow-sm transition-transform translate-x-5"></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TOAST ── */}
      <div
        className={`fixed bottom-4 sm:bottom-6 left-3 right-3 min-[360px]:left-4 min-[360px]:right-4 sm:left-auto sm:right-6 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 transform transition-all duration-300 z-[200] ${
          toast ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
        } ${toast?.type === "error" ? "bg-error dark:bg-red-600" : "bg-[#15803D]"}`}
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
          {toast?.type === "error" ? "error" : "check_circle"}
        </span>
        <span className="text-sm font-medium truncate">{toast?.message || "Action successful"}</span>
      </div>
    </div>
  );
}