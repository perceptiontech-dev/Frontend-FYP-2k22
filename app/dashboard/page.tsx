"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateUserForm } from "./createuser";
import UploadCIS from "./uploadcis";
import ManageCIS from "./managecis";
import ManageUsers from "./manageuser";
import ManageBlooms from "./managebloom";

// Local prop-compatible aliases.
// This fixes the dashboard TypeScript error without changing
// managecis.tsx or manageuser.tsx.
const ManageUsersWithDelete = ManageUsers as React.ComponentType<any>;
const ManageCISWithDelete = ManageCIS as React.ComponentType<any>;

const SSUET_LOGO_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC_pDKxWLsoyx_K8Hm8X5Hz0yIsVSUNRD0tplkRfChXcYJFJNWmiPwDXvzByjF4_6vcn6tdlQNtnQcoRa7iu3cSn9jwHXLpBkIXDRV0Q2h2G5sDtG_ygiYvOMVh24zIFBalsKznh87V5c9X-sdGr3a6szgTBSzljfy6Yjd9sW9qSNmrSCNxCNGUU3yxEol9ODz1RubfOxJLGEB9ef-OlL1gKyiPvc4I5FidQfosmSAKzSt6JsfFSae3tY4rAff38e5INg";

const PROFILE_FALLBACK_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDALNG9EIxj1WfvhhlCoO_-lzrx4llQVe2C5TI09cG_YK9ibxFGWdkGj1LW-0O9iQ5EVPDXMztuwZEfQFFcvkp4oLDyp78KhjYnrnhqOS4B7rC16jA_D-RLWkhhzQs9zz2YGZPoE6_giCvkUtadhwT3OzRcz3TEI0zqr3U3MEAdYUmr0EDC_SHlY0dvJpI7H7I8OIx-NRrpu8R5v7ieXRvfW7fxYJNGtCgLXdAog4zlj3Crqzl8iFEC";

const baseUrl = process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:8000";
const token = () => (typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "");

export default function DashboardScreen() {
  const router = useRouter();

  // Modal state
  const [openCreate, setOpenCreate] = useState(false);
  const [openUploadCIS, setOpenUploadCIS] = useState(false);
  const [openManageUsers, setOpenManageUsers] = useState(false); // in-page view, not a modal
  const [openManageCIS, setOpenManageCIS] = useState(false); // in-page view, not a modal
  const [openManageBlooms, setOpenManageBlooms] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dashboard data
  const [userName, setUserName] = useState("Shahrukh Ahmed");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({ total_users: 48, cis_uploaded: 26 });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentCis, setRecentCis] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingCis, setIsLoadingCis] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // UI state
  const [isDark, setIsDark] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [now, setNow] = useState(new Date());
  const [initialized, setInitialized] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // toggled by the sidebar handle
  const [isNarrowScreen, setIsNarrowScreen] = useState(false); // true at ~480px and below

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Track narrow (~480px) viewports so the sidebar can behave as an overlay there,
  // and auto-collapse it the moment the viewport drops into that range.
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

  // Auth check + theme init + data load
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
    setInitialized(true);

    const loadDashboard = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token()}` },
        });
        if (!response.ok) throw new Error("Failed to load user info");

        const userInfo = await response.json();
        if (userInfo?.role !== "admin") {
          router.replace("/facultydashboard");
          return;
        }

        setUserName(userInfo?.name || userInfo?.username || "Shahrukh Ahmed");
        setProfileImage(userInfo?.user_profile_image_link || null);

        const [usersResponse, cisResponse, statsResponse] = await Promise.all([
          fetch(`${baseUrl}/api/v1/users`, { headers: { Authorization: `Bearer ${token()}` } }),
          fetch(`${baseUrl}/api/v1/cis`, { headers: { Authorization: `Bearer ${token()}` } }),
          fetch(`${baseUrl}/api/v1/admin/stats`, { headers: { Authorization: `Bearer ${token()}` } }),
        ]);

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setRecentUsers(Array.isArray(usersData) ? usersData.slice(0, 5) : []);
        }
        setIsLoadingUsers(false);

        if (cisResponse.ok) {
          const cisData = await cisResponse.json();
          setRecentCis(Array.isArray(cisData) ? cisData.slice(0, 5) : []);
        }
        setIsLoadingCis(false);

        if (statsResponse.ok) {
          setStats(await statsResponse.json());
        }
      } catch {
        setIsLoadingUsers(false);
        setIsLoadingCis(false);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        router.replace("/");
      }
    };

    loadDashboard();
  }, [router, reloadKey]);

  // Escape key closes modals (and the in-page Manage Users / Manage CIS views)
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
    setOpenCreate(false);
    setOpenUploadCIS(false);
    setOpenManageUsers(false);
    setOpenManageCIS(false);
    setOpenManageBlooms(false);
    setOpenSettings(false);
    setDeleteTarget(null);
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => {
    try {
      if (token()) {
        await fetch(`${baseUrl}/api/v1/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token()}` },
        });
      }
    } catch {
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      router.replace("/");
    }
  };

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

  // Delete flow (user / cis / bloom) with confirm modal
  const requestDelete = (type: string, id: string, label: string) => {
    setDeleteTarget({ type, id, label });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const url =
        deleteTarget.type === "user"
          ? `${baseUrl}/api/v1/users/${deleteTarget.id}`
          : deleteTarget.type === "bloom"
            ? `${baseUrl}/api/v1/blooms/${deleteTarget.id}`
            : `${baseUrl}/api/v1/cis/${deleteTarget.id}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });

      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to delete");
      }

      showToast(
        deleteTarget.type === "user"
          ? "User removed"
          : deleteTarget.type === "bloom"
            ? "Bloom's reference deleted"
            : "Document deleted",
      );
      setDeleteTarget(null);
      setReloadKey((k) => k + 1);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Formatters
  const formatShortDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";

    return `${d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    })}, ${d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const formatMonthDay = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const initials = (name: string) =>
    (name || "U")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "XX";

  const avatarColors = [
    "bg-primary-fixed-dim text-on-primary-fixed",
    "bg-secondary-fixed text-on-secondary-fixed",
    "bg-tertiary-fixed text-on-tertiary-fixed",
    "bg-[#FDE68A] text-[#92400E]",
  ];
  const avatarColor = (seed: string) => {
    let hash = 0;
    for (let i = 0; i < (seed || "U").length; i++) {
      hash = (hash * 31 + (seed.charCodeAt(i) || 0)) % avatarColors.length;
    }
    return avatarColors[hash];
  };

  const clockText = now.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Runs a nav action, then closes the sidebar back down if it's currently
  // acting as an overlay on a narrow (~480px) screen.
  const runNav = (fn: () => void) => () => {
    fn();
    if (isNarrowScreen) setSidebarCollapsed(true);
  };

  // The sidebar renders as a fixed overlay (with backdrop) only when it's
  // expanded on a narrow (~480px) screen.
  const sidebarIsOverlay = isNarrowScreen && !sidebarCollapsed;

  const navItemClass = `flex items-center ${
  sidebarCollapsed ? "justify-center w-full h-11 px-0" : "justify-start gap-3 px-3 py-2.5 w-full"
} text-on-surface-variant dark:text-[#94a3b8] hover:bg-panel-tint dark:hover:bg-white/[0.05] hover:text-[#15803D] dark:hover:text-[#4ADE80] hover:border hover:border-black dark:hover:border-white/40 border border-transparent rounded-xl transition-all duration-200 group cursor-pointer relative sidebar-nav-item`;
  const navIconClass = "group-hover:text-[#15803D] dark:group-hover:text-[#4ADE80] transition-colors duration-200 flex-shrink-0 text-[22px]";
  const navLabelClass = `font-display text-label-md font-semibold tracking-tight whitespace-nowrap transition-all duration-200 ${
    sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
  }`;

  const inputClass =
    "w-full h-10 px-3 rounded-lg border border-outline-variant dark:border-white/10 dark:bg-[#0a0f1a] dark:text-[#f8fafc] focus:border-primary-container focus:ring-1 focus:ring-primary-container text-body-sm outline-none transition-colors bg-white";

  // Wrapper handles the collapse/expand animation for each nav section header;
  // the label + underline markup is rendered separately so we can style the
  // underline distinctly (see sectionLabel usages below).
  const sectionLabelWrapClass = `mt-7 mb-3 px-3 whitespace-nowrap transition-all duration-200 ${
  sidebarCollapsed
    ? "opacity-0 h-0 overflow-hidden mt-0 mb-0"
    : "opacity-100"
}`;

  // NOTE: openManageUsers and openManageCIS are intentionally excluded here —
  // they now render as in-page views inside <main>, not as popups, so they
  // shouldn't trigger the modal backdrop/overlay system below.
  const anyModalOpen = openCreate || openUploadCIS || openManageBlooms || openSettings;

  return (
    <div className="flex min-h-screen bg-[#F0F2F0] dark:bg-[#141416] text-on-surface dark:text-white font-body antialiased overflow-x-hidden transition-colors duration-200">
      {/* Type system: Manrope for display/headings, Plus Jakarta Sans for body/UI copy.
          Loaded here so the page is self-contained — for production, move this @import into
          your global stylesheet or load both via next/font instead, for better performance. */}
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

        /* Keep every sidebar option perfectly centered in collapsed mode. */
        [data-sidebar-collapsed="true"] .sidebar-nav-item {
          justify-content: center;
          padding-left: 0;
          padding-right: 0;
          width: 100%;
        }
      `}</style>

      {/* Backdrop — only appears when the sidebar is expanded as an overlay on a narrow (~480px) screen */}
      {sidebarIsOverlay && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm animate-backdrop-enter"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* ── SIDE NAVBAR ── always rendered, never slides. It resizes between an icon
           rail and a full labelled column via the toggle handle. On narrow (~480px)
           screens, the expanded state floats as a fixed overlay above the content so
           it never squeezes the page; the same toggle collapses/closes it again.
           It spans the FULL page height. When collapsed, only the toggle control is
           shown up top — the logo and "Admin Portal" heading are hidden entirely. ── */}
      <aside
        data-sidebar-collapsed={sidebarCollapsed}
        className={`relative flex flex-col bg-white dark:bg-[#242426] border-r border-outline-variant dark:border-white/[0.07] ${
          sidebarCollapsed ? "w-[60px] min-[360px]:w-[68px]" : "w-[210px] min-[360px]:w-[240px] sm:w-[280px]"
        } h-screen flex-shrink-0 p-2 min-[360px]:p-2.5 pt-3 gap-2 z-40 transition-[width] duration-300 overflow-y-auto overflow-x-hidden ${
          sidebarIsOverlay ? "fixed inset-y-0 left-0 shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)]" : "sticky top-0"
        }`}
      >
        {/* Brand + toggle row. Expanded: logo, heading, and toggle button side by side.
            Collapsed: ONLY the toggle button remains, centered — logo and heading are
            fully hidden rather than just faded, so the rail stays clean and minimal. */}
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
                Admin Portal
              </h1>
            </div>
          )}

          {/* Toggle handle — professional "panel" icon that flips direction with state,
              the same visual language used for sidebar collapse controls in editors
              like VS Code, so its purpose reads instantly. */}
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
            onClick={runNav(() => {
              setOpenManageUsers(false);
              setOpenManageCIS(false);
            })}
            className={`flex items-center mt-2 cursor-pointer ${
              sidebarCollapsed
                ? "justify-center w-full h-11 px-0"
                : "justify-start gap-3 w-full px-3 py-3"
            } bg-primary-container dark:bg-[#15803D] dark:border dark:border-emerald-400/25 text-white rounded-xl font-bold transition-all active:scale-[0.97]`}
            title="Dashboard"
          >
            <span className="material-symbols-outlined dark:text-emerald-100 flex-shrink-0" style={{ fontVariationSettings: '"FILL" 1' }}>
              dashboard
            </span>
            <span className={navLabelClass}>Dashboard</span>
          </div>

          {/* User Management — heading now carries a short accent underline instead of
              relying on uppercase letter-spacing alone to separate sections. */}
          <div className={sectionLabelWrapClass}>
            <span className="text-[11px] font-extrabold text-[#15803D] dark:text-[#4ADE80] uppercase tracking-[0.12em]">

              User Management
              </span>
            <span className="block mt-2 h-[3px] w-12 rounded-full bg-[#15803D] dark:bg-[#4ADE80]"></span>
          </div>
          <button onClick={runNav(() => setOpenCreate(true))} className={`${navItemClass} w-full`} title="Create User">
            <span className={`material-symbols-outlined ${navIconClass}`}>person_add</span>
            <span className={navLabelClass}>Create User</span>
          </button>
          <button
            onClick={runNav(() => {
              setOpenManageCIS(false);
              setOpenManageUsers(true);
            })}
            className={`${navItemClass} w-full ${openManageUsers ? "bg-panel-tint dark:bg-white/[0.05] text-[#15803D] dark:text-[#4ADE80] border-black/10 dark:border-white/20" : ""}`}
            title="Manage Users"
          >
            <span className={`material-symbols-outlined ${navIconClass}`}>group</span>
            <span className={navLabelClass}>Manage Users</span>
          </button>

          {/* CIS Controls — same underlined-heading treatment for visual consistency. */}
          <div className={sectionLabelWrapClass}>
            <span className="text-[11px] font-extrabold text-[#15803D] dark:text-[#4ADE80] uppercase tracking-[0.12em]">
  CIS Controls
</span>
            <span className="block mt-2 h-[3px] w-12 rounded-full bg-[#15803D] dark:bg-[#4ADE80]"></span>
          </div>
          <button onClick={runNav(() => setOpenUploadCIS(true))} className={`${navItemClass} w-full`} title="Upload CIS">
            <span className={`material-symbols-outlined ${navIconClass}`}>upload_file</span>
            <span className={navLabelClass}>Upload CIS</span>
          </button>
          <button
            onClick={runNav(() => {
              setOpenManageUsers(false);
              setOpenManageCIS(true);
            })}
            className={`${navItemClass} w-full ${openManageCIS ? "bg-panel-tint dark:bg-white/[0.05] text-[#15803D] dark:text-[#4ADE80] border-black/10 dark:border-white/20" : ""}`}
            title="Manage CIS"
          >
            <span className={`material-symbols-outlined ${navIconClass}`}>description</span>
            <span className={navLabelClass}>Manage CIS</span>
          </button>
          
        </nav>

        {/* Bottom section — logout has moved to the top header (next to the profile
            avatar), so only the dark-theme control lives down here now. */}
      </aside>

      {/* ── RIGHT COLUMN ── holds the header (scoped to main-content width only) and the
           scrollable main content beneath it. Sits alongside <aside> as a flex sibling. ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* ── TOP HEADER ── spans only this column's width. Logout lives here next to
             the profile avatar (moved out of the sidebar). Search has been removed. ── */}
        <header className="bg-white dark:bg-[#242426]/90 dark:backdrop-blur-xl border-b border-outline-variant dark:border-white/[0.06] shadow-sm flex items-center justify-end w-full h-[50px] sm:h-[56px] px-2.5 min-[360px]:px-3 sm:px-5 flex-shrink-0 z-50 gap-1.5 min-[360px]:gap-2 sm:gap-4 transition-colors duration-200">
          {/* Right icon cluster */}
          <div className="flex items-center gap-1.5 min-[360px]:gap-2.5 sm:gap-4 flex-shrink-0 ml-auto">
            <div className="relative cursor-pointer hover:text-primary transition-colors text-on-surface-variant dark:text-[#94a3b8] hidden xs:block">
              <span className="material-symbols-outlined text-outline dark:text-[#94a3b8]">mail</span>
              <span className="absolute -top-1 -right-1 bg-[#15803D] dark:bg-[#4ADE80] dark:text-[#020617] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-[#242426]">
                2
              </span>
            </div>

            <button
  onClick={handleLogout}
  title="Logout"
  aria-label="Logout"
  className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-on-surface-variant dark:text-[#94a3b8] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
>
  <span className="material-symbols-outlined text-[19px]">
    logout
  </span>
  <span className="text-sm font-semibold">
    Logout
  </span>
</button>

            {/* Compact logout icon for very narrow screens, since the labelled button is hidden below sm */}
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

        {/* ── MAIN CONTENT ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-3 min-[360px]:p-4 sm:p-6 lg:p-8 w-full relative dark:bg-[#1C1C1E]">
          <div className="max-w-[1200px] mx-auto space-y-4 min-[360px]:space-y-6 sm:space-y-8 relative z-10">
            {openManageUsers ? (
              // ── Manage Users renders as a normal in-page section, using the
              // same content column as the dashboard, instead of a modal popup.
              <ManageUsersWithDelete
                onClose={() => setOpenManageUsers(false)}
                onRequestDelete={(id: string, label: string) => requestDelete("user", id, label)}
                reloadKey={reloadKey}
              />
            ) : openManageCIS ? (
              // ── Manage CIS renders the same way — in-page, not a modal.
              <ManageCISWithDelete
                onClose={() => setOpenManageCIS(false)}
                onRequestDelete={(id: string, label: string) => requestDelete("cis", id, label)}
                reloadKey={reloadKey}
              />
            ) : (
              <>
                {/* ── WELCOME / DATE EMBEDDED BOX ───────────────────────── */}
                <div className="bg-white dark:bg-[#242426] border border-[#15803D]/30 dark:border-[#4ADE80]/25 border-l-2 border-l-[#15803D] dark:border-l-[#4ADE80] rounded-2xl px-4 min-[360px]:px-5 sm:px-6 py-4 sm:py-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                    {/* Welcome */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative flex h-3 w-3 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#15803D] dark:bg-[#4ADE80] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#15803D] dark:bg-[#4ADE80]"></span>
                      </div>

                      <div className="min-w-0">
                        <p className="font-body text-sm sm:text-base text-on-surface-variant dark:text-[#94a3b8] truncate">
                          Welcome back,
                          <span className="ml-1 font-display font-extrabold text-[#15803D] dark:text-[#4ADE80]">
                            AdminOne
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center gap-2 text-xs min-[360px]:text-sm sm:text-base text-on-surface-variant dark:text-[#94a3b8]">
                      <span className="material-symbols-outlined text-[17px] min-[360px]:text-[19px] text-[#15803D] dark:text-[#4ADE80] flex-shrink-0">
                        calendar_today
                      </span>

                      <span className="font-medium whitespace-nowrap">
                        {clockText}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border border-outline-variant dark:border-white/[0.08] p-4 sm:p-5 shadow-sm hover:shadow-md dark:hover:border-emerald-400/40 transition-all duration-300 dark:hover:-translate-y-0.5">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#E6F4F1] dark:bg-teal-400/15 dark:ring-1 dark:ring-teal-400/20 text-primary-container dark:text-teal-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] sm:text-[24px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                          group
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-accent-hover bg-[#DCFCE7] dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/25 px-2 py-1 rounded-md border border-[#BBF7D0]">
                        +12%
                      </span>
                    </div>
                    <h3 className="font-body text-on-surface-variant dark:text-[#94a3b8] text-[11px] sm:text-label-md font-semibold uppercase tracking-wide mb-1.5">Total Users</h3>
                    <p className="font-display text-3xl sm:text-display-lg font-extrabold tracking-tight tabular-nums text-on-surface dark:text-[#f8fafc] leading-none">
                      {stats.total_users ?? "—"}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border border-outline-variant dark:border-white/[0.08] p-4 sm:p-5 shadow-sm hover:shadow-md dark:hover:border-emerald-400/40 transition-all duration-300 dark:hover:-translate-y-0.5">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#E8F5E9] dark:bg-emerald-400/15 dark:ring-1 dark:ring-emerald-400/20 text-[#15803D] dark:text-[#4ADE80] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] sm:text-[24px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                          description
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-[#15803D] dark:text-[#4ADE80] bg-[#DCFCE7] dark:bg-emerald-400/10 dark:border-emerald-400/25 px-2 py-1 rounded-md border border-[#BBF7D0]">
                        +3 this week
                      </span>
                    </div>
                    <h3 className="font-body text-on-surface-variant dark:text-[#94a3b8] text-[11px] sm:text-label-md font-semibold uppercase tracking-wide mb-1.5">CIS Uploaded</h3>
                    <p className="font-display text-3xl sm:text-display-lg font-extrabold tracking-tight tabular-nums text-on-surface dark:text-[#f8fafc] leading-none">
                      {stats.cis_uploaded ?? "—"}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border border-outline-variant dark:border-white/[0.08] p-4 sm:p-5 shadow-sm hover:shadow-md dark:hover:border-emerald-400/40 transition-all duration-300 dark:hover:-translate-y-0.5">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#DCFCE7] dark:bg-emerald-300/15 dark:ring-1 dark:ring-emerald-300/20 text-[#22C55E] dark:text-emerald-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] sm:text-[24px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                          fact_check
                        </span>
                      </div>
                    </div>
                    <h3 className="font-body text-on-surface-variant dark:text-[#94a3b8] text-[11px] sm:text-label-md font-semibold uppercase tracking-wide mb-1.5">Papers Vetted</h3>
                    <p className="font-display text-3xl sm:text-display-lg font-extrabold tracking-tight tabular-nums text-on-surface dark:text-[#f8fafc] leading-none">
                      {stats.papers_vetted ?? "—"}
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border border-outline-variant dark:border-white/[0.08] p-4 sm:p-5 shadow-sm hover:shadow-md dark:hover:border-amber-400/40 transition-all duration-300 dark:hover:-translate-y-0.5">
                    <div className="flex justify-between items-start mb-3 sm:mb-4">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#FEF3C7] dark:bg-amber-400/15 dark:ring-1 dark:ring-amber-400/20 text-warning dark:text-amber-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px] sm:text-[24px]" style={{ fontVariationSettings: '"FILL" 1' }}>
                          analytics
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-xs font-bold text-warning bg-[#FEF3C7] dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/25 px-2 py-1 rounded-md border border-[#FDE68A]">
                        Requires Attn.
                      </span>
                    </div>
                    <h3 className="font-body text-on-surface-variant dark:text-[#94a3b8] text-[11px] sm:text-label-md font-semibold uppercase tracking-wide mb-1.5">Avg. Compliance</h3>
                    <p className="font-display text-3xl sm:text-display-lg font-extrabold tracking-tight tabular-nums text-on-surface dark:text-[#f8fafc] leading-none">
                      {stats.avg_compliance != null ? `${stats.avg_compliance}%` : "—"}
                    </p>
                  </div>
                </div>

                {/* Content Grid (Cards) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Left Card: Recent Users */}
                  <div className="lg:col-span-2 bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border border-outline-variant dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 sm:p-5 border-b border-outline-variant dark:border-white/[0.08] flex justify-between items-center bg-white dark:bg-transparent">
                      <h2 className="font-display text-base sm:text-headline-md font-bold tracking-tight text-on-surface dark:text-[#f8fafc]">Recent Users</h2>
                      <button
                        onClick={() => setOpenManageUsers(true)}
                        className="text-xs sm:text-sm font-semibold text-primary-container dark:text-[#4ADE80] hover:text-primary-hover dark:hover:text-emerald-300 transition-colors flex items-center gap-1 flex-shrink-0"
                      >
                        See All <span className="hidden sm:inline">Users</span> <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#F5F6F5] dark:bg-white/[0.03] text-on-surface-variant dark:text-[#94a3b8] font-label-md border-b border-outline-variant dark:border-white/[0.08]">
                          <tr>
                            <th className="px-4 sm:px-5 py-3 font-semibold">User Info</th>
                            <th className="px-4 sm:px-5 py-3 font-semibold hidden sm:table-cell">FAC ID</th>
                            <th className="px-4 sm:px-5 py-3 font-semibold hidden md:table-cell">Department</th>
                            <th className="px-4 sm:px-5 py-3 font-semibold text-center">Status / Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant dark:divide-white/[0.06]">
                          {isLoadingUsers ? (
                            <>
                              {[0, 1, 2, 3, 4].map((row) => (
                                <tr key={`user-skeleton-${row}`} className="animate-pulse">
                                  <td className="px-4 sm:px-5 py-3 sm:py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 flex-shrink-0" />
                                      <div className="h-4 w-28 sm:w-36 rounded bg-gray-200 dark:bg-white/10" />
                                    </div>
                                  </td>
                                  <td className="px-4 sm:px-5 py-3 sm:py-4 hidden sm:table-cell">
                                    <div className="h-3.5 w-20 rounded bg-gray-200 dark:bg-white/10" />
                                  </td>
                                  <td className="px-4 sm:px-5 py-3 sm:py-4 hidden md:table-cell">
                                    <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-white/10" />
                                  </td>
                                  <td className="px-4 sm:px-5 py-3 sm:py-4">
                                    <div className="flex flex-col items-center gap-2">
                                      <div className="h-4 w-14 rounded bg-gray-200 dark:bg-white/10" />
                                      <div className="h-3 w-20 rounded bg-gray-200 dark:bg-white/10" />
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </>
                          ) : recentUsers.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-5 py-8 text-center text-on-surface-variant dark:text-[#94a3b8]">
                                No users found
                              </td>
                            </tr>
                          ) : (
                            recentUsers.map((user, index) => (
                              <tr key={user.uid || index} className="hover:bg-[#F5F6F5] dark:hover:bg-white/[0.04] transition-colors">
                                <td className="px-4 sm:px-5 py-3 sm:py-4">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-8 h-8 rounded-full ${avatarColor(user.name || user.username || "U")} flex items-center justify-center font-bold text-xs flex-shrink-0 dark:ring-1 dark:ring-white/10`}
                                    >
                                      {initials(user.name || user.username || "U")}
                                    </div>
                                    <div className="font-body font-semibold text-on-surface dark:text-[#f8fafc]">
                                      {user.name || user.username || "User"}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 sm:px-5 py-3 sm:py-4 text-on-surface-variant dark:text-[#94a3b8] hidden sm:table-cell">
                                  {user.faculty_id || "N/A"}
                                </td>
                                <td className="px-4 sm:px-5 py-3 sm:py-4 text-on-surface-variant dark:text-[#94a3b8] hidden md:table-cell">
                                  {user.department || "N/A"}
                                </td>
                                <td className="px-4 sm:px-5 py-3 sm:py-4">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/25 text-[#166534] uppercase tracking-wide border border-[#BBF7D0]">
                                      Created
                                    </span>
                                    <span className="text-xs text-outline dark:text-[#94a3b8]">
                                      {formatShortDate(user.created_at)}
                                    </span>
                                  </div>
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
                      <h2 className="font-display text-base sm:text-headline-md font-bold tracking-tight text-on-surface dark:text-[#f8fafc]">Recent CIS Uploads</h2>
                      <button
                        onClick={() => setOpenManageCIS(true)}
                        className="text-xs sm:text-sm font-semibold text-primary-container dark:text-[#4ADE80] hover:text-primary-hover dark:hover:text-emerald-300 transition-colors flex items-center gap-1 flex-shrink-0"
                      >
                        See All <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                      </button>
                    </div>
                    <div className="p-2 flex-grow overflow-y-auto max-h-[360px] lg:max-h-none">
                      <ul className="space-y-1">
                        {isLoadingCis ? (
                          <>
                            {[0, 1, 2, 3, 4].map((row) => (
                              <li
                                key={`cis-skeleton-${row}`}
                                className="flex items-center p-3 rounded-lg animate-pulse"
                              >
                                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-white/10 mr-3 sm:mr-4 flex-shrink-0" />
                                <div className="flex-grow min-w-0 space-y-2">
                                  <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-white/10" />
                                  <div className="h-3 w-20 rounded bg-gray-200 dark:bg-white/10" />
                                </div>
                                <div className="flex flex-col items-center gap-2 ml-2 flex-shrink-0">
                                  <div className="h-4 w-14 rounded bg-gray-200 dark:bg-white/10" />
                                  <div className="h-3 w-12 rounded bg-gray-200 dark:bg-white/10" />
                                </div>
                              </li>
                            ))}
                          </>
                        ) : recentCis.length === 0 ? (
                          <li className="text-center p-4 text-sm text-on-surface-variant dark:text-[#94a3b8]">No CIS records found</li>
                        ) : (
                          recentCis.map((cis, idx) => (
                            <li
                              key={cis.cis_id || idx}
                              onClick={() => setOpenManageCIS(true)}
                              className="flex items-center p-3 hover:bg-[#F5F6F5] dark:hover:bg-white/[0.05] rounded-lg transition-colors cursor-pointer group"
                            >
                              <div className="w-10 h-10 rounded-lg bg-[#F0FDF4] dark:bg-emerald-500/15 border border-[#BBF7D0] dark:border-emerald-400/20 flex items-center justify-center text-[#15803D] dark:text-[#4ADE80] mr-3 sm:mr-4 flex-shrink-0 group-hover:bg-[#DCFCE7] dark:group-hover:border-emerald-400/40 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                              </div>
                              <div className="flex-grow min-w-0">
                                <h4 className="font-display text-sm font-bold tracking-tight text-on-surface dark:text-[#f8fafc] truncate">
                                  {cis.course_id || cis.course_name || "N/A"}
                                </h4>
                                <p className="text-xs text-on-surface-variant dark:text-[#94a3b8] truncate">
                                  {cis.department || "—"}
                                </p>
                              </div>
                              <div className="flex flex-col items-center gap-1 ml-2 flex-shrink-0">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#DCFCE7] dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/25 text-[#166534] uppercase tracking-wide border border-[#BBF7D0] whitespace-nowrap">
                                  Uploaded
                                </span>
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
                        onClick={() => setOpenUploadCIS(true)}
                        className="w-full bg-[#15803D] hover:bg-[#166534] text-white py-2.5 px-4 rounded-lg font-medium transition-all flex justify-center items-center gap-2 active:scale-[0.98] dark:border dark:border-emerald-400/25"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span> Upload New CIS
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* ── MODALS OVERLAY SYSTEM ─────────────────────────────── */}
      {/* Manage Users and Manage CIS are no longer part of this overlay — they render inline in <main> above. */}
      {anyModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 min-[360px]:p-4 bg-black/50 dark:bg-black/75 backdrop-blur-sm animate-backdrop-enter"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAllModals();
          }}
        >
          {openCreate && (
            <CreateUserForm
              onClose={() => setOpenCreate(false)}
              onSuccess={() => showToast("User created successfully")}
            />
          )}
          {openUploadCIS && (
            <UploadCIS
              onClose={() => setOpenUploadCIS(false)}
              onSuccess={() => {
                showToast("CIS Document uploaded successfully");
                setReloadKey((k) => k + 1);
              }}
            />
          )}
          {openManageBlooms && (
            <ManageBlooms
              onClose={() => setOpenManageBlooms(false)}
              onRequestDelete={(id: string, label: string) => requestDelete("bloom", id, label)}
            />
          )}
          {openSettings && (
            <div className="modal-content bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border-t-4 border-outline dark:border-[#4ADE80] shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
              <div className="px-5 sm:px-6 py-4 border-b border-outline-variant dark:border-white/[0.08] flex justify-between items-center bg-white dark:bg-transparent rounded-t-xl sm:rounded-t-2xl">
                <h2 className="font-display text-headline-md font-bold tracking-tight text-on-surface dark:text-[#f8fafc]">System Settings</h2>
                <button
                  onClick={() => setOpenSettings(false)}
                  className="text-outline dark:text-[#94a3b8] hover:text-on-surface dark:hover:text-white transition-colors p-1 rounded-full hover:bg-surface-variant dark:hover:bg-white/[0.06]"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
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
                      <div className={`w-4 h-4 bg-white rounded-full absolute left-1 top-1 shadow-sm transition-transform ${isDark ? "translate-x-5" : ""}`}></div>
                    </div>
                  </div>
                  <p className="text-xs text-outline dark:text-[#94a3b8] mt-1">Synced with your device preference by default.</p>
                </div>
                <div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-body-sm text-on-surface dark:text-[#f8fafc]">Email Alerts on New Uploads</span>
                    <button className="w-11 h-6 bg-primary-container dark:bg-[#15803D] rounded-full relative transition-colors">
                      <div className="w-4 h-4 bg-white rounded-full absolute left-1 top-1 shadow-sm transition-transform translate-x-5"></div>
                    </button>
                  </div>
                </div>
              </div>
              <div className="px-5 sm:px-6 py-4 border-t border-outline-variant dark:border-white/[0.08] bg-white dark:bg-transparent flex justify-end gap-3 rounded-b-xl sm:rounded-b-2xl">
                <button
                  onClick={() => setOpenSettings(false)}
                  className="px-5 py-2 bg-surface-variant dark:bg-white/[0.06] hover:bg-surface-dim dark:hover:bg-white/[0.1] text-on-surface dark:text-[#f8fafc] rounded-lg font-medium transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 min-[360px]:p-4 bg-black/50 dark:bg-black/75 backdrop-blur-sm animate-backdrop-enter">
          <div className="modal-content bg-white dark:bg-[#242426] rounded-xl sm:rounded-2xl border-t-4 border-error dark:border-red-500 shadow-2xl w-full max-w-sm flex flex-col animate-modal-enter">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-error-container dark:bg-red-500/10 text-error dark:text-red-400 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">warning</span>
              </div>
              <h2 className="font-display text-headline-md font-bold tracking-tight text-on-surface dark:text-[#f8fafc] mb-2">Confirm Delete</h2>
              <p
                className="text-body-sm text-on-surface-variant dark:text-[#94a3b8]"
                dangerouslySetInnerHTML={{
                  __html:
                    deleteTarget.type === "user"
                      ? `Are you sure you want to remove user <b>${deleteTarget.label}</b>?`
                      : deleteTarget.type === "bloom"
                        ? `Are you sure you want to delete Bloom's reference <b>${deleteTarget.label}</b>?`
                        : `Are you sure you want to delete document <b>${deleteTarget.label}</b>?`,
                }}
              />
            </div>
            <div className="px-6 py-4 border-t border-outline-variant dark:border-white/[0.08] bg-white dark:bg-transparent flex justify-center gap-3 rounded-b-xl sm:rounded-b-2xl">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2 text-on-surface-variant dark:text-[#94a3b8] hover:bg-surface-variant dark:hover:bg-white/[0.06] rounded-lg font-medium transition-colors text-sm w-full"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-error hover:bg-[#93000A] dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg font-medium transition-all active:scale-[0.97] text-sm w-full disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ──────────────────────────────────────────────── */}
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