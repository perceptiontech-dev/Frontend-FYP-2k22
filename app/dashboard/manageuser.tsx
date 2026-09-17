"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { API_BASE_URL } from "../lib/api";

interface ManageUsersProps {
  onClose: () => void;
  onDeleted?: (uid: string) => void; // fired after a successful delete
  reloadKey?: number;
}

interface User {
  uid: string;
  email: string;
  role: string;
  name: string;
  facultyId: string;
  department: string;
  username: string;
  created_at: string;
  user_profile_image_link: string | null;
}

export default function ManageUsers({
  onClose,
  onDeleted,
  reloadKey,
}: ManageUsersProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Delete flow state
  const [confirmTarget, setConfirmTarget] = useState<{
    uid: string;
    label: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  /* =========================================================
     LOAD USERS
  ========================================================= */

  const loadUsers = async () => {
    const token = getToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Failed to load users"
        );
      }

      const data = await response.json();

      setUsers(
        Array.isArray(data)
          ? data.map((user: any) => ({
              uid: user.uid,
              email: user.email || "",
              role: user.role || "",
              name: user.name || user.username || "User",
              facultyId: user.faculty_id || "N/A",
              department: user.department || "",
              username: user.username || "",
              created_at: user.created_at || "",
              user_profile_image_link:
                user.user_profile_image_link || null,
            }))
          : []
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load users"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadUsers();
  }, [reloadKey]);

  /* =========================================================
     DELETE FLOW
  ========================================================= */

  const requestDelete = (uid: string, label: string) => {
    setDeleteError(null);
    setConfirmTarget({ uid, label });
  };

  const cancelDelete = () => {
    if (deletingId) return; // don't allow closing mid-request
    setConfirmTarget(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;

    const { uid } = confirmTarget;
    const token = getToken();

    if (!token) {
      setDeleteError("You must be signed in to delete a user.");
      return;
    }

    setDeletingId(uid);
    setDeleteError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/${uid}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Failed to delete user"
        );
      }

      // Optimistically remove it from the list
      setUsers((prev) => prev.filter((user) => user.uid !== uid));

      onDeleted?.(uid);
      setConfirmTarget(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Failed to delete user"
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================================================
     SEARCH
  ========================================================= */

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter((user) =>
      [
        user.name,
        user.facultyId,
        user.email,
        user.role,
        user.department,
        user.username,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [search, users]);

  /* =========================================================
     STATISTICS
  ========================================================= */

  const totalUsers = users.length;

  const facultyUsers = users.filter(
    (user) => user.role.toLowerCase() !== "admin"
  ).length;

  const adminUsers = users.filter(
    (user) => user.role.toLowerCase() === "admin"
  ).length;

  /* =========================================================
     AVATAR HELPERS
  ========================================================= */

  const avatarColors = [
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
    "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  ];

  const avatarColor = (seed: string) => {
    let hash = 0;

    for (let i = 0; i < (seed || "U").length; i++) {
      hash =
        (hash * 31 + (seed.charCodeAt(i) || 0)) %
        avatarColors.length;
    }

    return avatarColors[hash];
  };

  const initials = (name: string) =>
    (name || "U")
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  /* =========================================================
     ROLE HELPERS
  ========================================================= */

  const isAdmin = (role: string) =>
    role?.toLowerCase() === "admin";

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden animate-modal-enter pb-5 sm:pb-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="relative mb-5 sm:mb-7 overflow-hidden rounded-2xl border border-outline-variant dark:border-white/[0.08] bg-surface dark:bg-[#0b1220] shadow-sm">



        <div className="pointer-events-none absolute -left-20 bottom-[-100px] h-44 w-44 rounded-full bg-[#16a34a]/[0.06] blur-3xl" />

        <div className="relative p-4 min-[400px]:p-5 sm:p-6">

          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            {/* Heading */}
            <div className="min-w-0 flex-1">

              <div className="mb-2.5 flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#22c55e] shadow-[0_0_0_4px_rgba(34,197,94,0.12)]" />

                <span className="truncate text-[10px] min-[400px]:text-xs font-bold uppercase tracking-[0.16em] text-[#166534] dark:text-[#86efac]">
                  Administration
                </span>
              </div>

              <h1 className="break-words text-xl min-[400px]:text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-white">
                Manage Users
              </h1>

              <p className="mt-1.5 max-w-2xl text-xs min-[400px]:text-sm leading-5 text-[#475569] dark:text-[#cbd5e1]">
                Manage faculty members and administrators across
                the system.
              </p>

            </div>

            {/* Search */}
            <div className="relative w-full min-w-0 lg:w-[310px] xl:w-[340px]">

              <span className="material-symbols-outlined pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[19px] text-[#64748b] dark:text-[#94a3b8]">
                search
              </span>

              <input
                className="
                  h-10 min-[400px]:h-11
                  w-full
                  min-w-0
                  rounded-xl
                  border border-[#cbd5e1]
                  dark:border-white/[0.12]
                  bg-white
                  dark:bg-[#070d18]
                  pl-10
                  pr-10
                  text-xs
                  min-[400px]:text-sm
                  font-medium
                  text-[#111827]
                  dark:text-white
                  placeholder:text-[#64748b]
                  dark:placeholder:text-[#94a3b8]
                  outline-none
                  transition-all
                  focus:border-[#22c55e]
                  focus:ring-4
                  focus:ring-[#22c55e]/10
                  shadow-sm
                "
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="text"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="
                    absolute
                    right-2
                    top-1/2
                    flex
                    h-7
                    w-7
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-lg
                    text-[#64748b]
                    hover:bg-[#f1f5f9]
                    hover:text-[#166534]
                    dark:hover:bg-white/[0.06]
                    dark:hover:text-[#86efac]
                    transition-colors
                  "
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    close
                  </span>
                </button>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          STAT CARDS
      ===================================================== */}

      <section className="mb-5 grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">

        {/* TOTAL USERS */}
        <div className="
          group
          relative
          min-w-0
          overflow-hidden
          rounded-2xl
          border
          border-[#dbe4df]
          dark:border-white/[0.09]
          bg-white
          dark:bg-[#0d1420]
          p-4
          sm:p-5
          shadow-sm
          transition-all
          duration-300
          hover:-translate-y-0.5
          hover:shadow-lg
          hover:shadow-[#22c55e]/[0.06]
        ">

          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#22c55e]/10 blur-2xl" />

          <div className="relative flex items-start justify-between gap-3">

            <div className="min-w-0">

              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#cbd5e1]">
                Total Users
              </p>

              {isLoading ? (
                <div className="mt-1.5 h-8 w-12 animate-pulse rounded-md bg-[#e2e8f0] dark:bg-white/[0.08]" />
              ) : (
                <p className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-white">
                  {totalUsers}
                </p>
              )}

              <p className="mt-1 text-[10px] sm:text-xs font-medium text-[#64748b] dark:text-[#aebbc9]">
                Registered accounts
              </p>

            </div>

            <div className="
              flex
              h-10
              w-10
              sm:h-11
              sm:w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-[#bbf7d0]
              bg-[#f0fdf4]
              dark:border-emerald-500/20
              dark:bg-emerald-500/10
            ">
              <span className="material-symbols-outlined text-[21px] text-[#15803d] dark:text-[#86efac]">
                group
              </span>
            </div>

          </div>
        </div>

        {/* FACULTY */}
        <div className="
          group
          relative
          min-w-0
          overflow-hidden
          rounded-2xl
          border
          border-[#dbe4df]
          dark:border-white/[0.09]
          bg-white
          dark:bg-[#0d1420]
          p-4
          sm:p-5
          shadow-sm
          transition-all
          duration-300
          hover:-translate-y-0.5
          hover:shadow-lg
        ">

          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-500/[0.08] blur-2xl" />

          <div className="relative flex items-start justify-between gap-3">

            <div className="min-w-0">

              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#cbd5e1]">
                Faculty
              </p>

              {isLoading ? (
                <div className="mt-1.5 h-8 w-12 animate-pulse rounded-md bg-[#e2e8f0] dark:bg-white/[0.08]" />
              ) : (
                <p className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-white">
                  {facultyUsers}
                </p>
              )}

              <p className="mt-1 text-[10px] sm:text-xs font-medium text-[#64748b] dark:text-[#aebbc9]">
                Faculty members
              </p>

            </div>

            <div className="
              flex
              h-10
              w-10
              sm:h-11
              sm:w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-blue-100
              bg-blue-50
              dark:border-blue-500/20
              dark:bg-blue-500/10
            ">
              <span className="material-symbols-outlined text-[21px] text-blue-600 dark:text-blue-300">
                school
              </span>
            </div>

          </div>
        </div>

        {/* ADMIN */}
        <div className="
          group
          relative
          min-w-0
          overflow-hidden
          rounded-2xl
          border
          border-[#dbe4df]
          dark:border-white/[0.09]
          bg-white
          dark:bg-[#0d1420]
          p-4
          sm:p-5
          shadow-sm
          transition-all
          duration-300
          hover:-translate-y-0.5
          hover:shadow-lg
          min-[400px]:col-span-2
          md:col-span-1
        ">

          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-500/[0.08] blur-2xl" />

          <div className="relative flex items-start justify-between gap-3">

            <div className="min-w-0">

              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#cbd5e1]">
                Administrators
              </p>

              {isLoading ? (
                <div className="mt-1.5 h-8 w-12 animate-pulse rounded-md bg-[#e2e8f0] dark:bg-white/[0.08]" />
              ) : (
                <p className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-[#111827] dark:text-white">
                  {adminUsers}
                </p>
              )}

              <p className="mt-1 text-[10px] sm:text-xs font-medium text-[#64748b] dark:text-[#aebbc9]">
                System administrators
              </p>

            </div>

            <div className="
              flex
              h-10
              w-10
              sm:h-11
              sm:w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-violet-100
              bg-violet-50
              dark:border-violet-500/20
              dark:bg-violet-500/10
            ">
              <span className="material-symbols-outlined text-[21px] text-violet-600 dark:text-violet-300">
                admin_panel_settings
              </span>
            </div>

          </div>
        </div>

      </section>

      {/* =====================================================
          USERS SECTION
      ===================================================== */}

      <section className="
        min-w-0
        overflow-hidden
        rounded-2xl
        border
        border-[#dbe4df]
        dark:border-white/[0.09]
        bg-white
        dark:bg-[#0d1420]
        shadow-sm
      ">

        {/* Section Header */}
        <div className="
          flex
          min-w-0
          flex-col
          gap-3
          border-b
          border-[#e2e8f0]
          dark:border-white/[0.08]
          px-4
          py-4
          min-[400px]:px-5
          sm:px-6
          sm:py-5
          sm:flex-row
          sm:items-center
          sm:justify-between
        ">

          <div className="min-w-0">

            <div className="flex items-center gap-2">

              <div className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-[#f0fdf4]
                dark:bg-emerald-500/10
              ">
                <span className="material-symbols-outlined text-[18px] text-[#15803d] dark:text-[#86efac]">
                  group
                </span>
              </div>

              <div className="min-w-0">

                <h2 className="truncate text-sm sm:text-base font-bold text-[#111827] dark:text-white">
                  All Users
                </h2>

                <p className="mt-0.5 text-[10px] sm:text-xs font-medium text-[#64748b] dark:text-[#aebbc9]">
                  {isLoading
                    ? "Loading users..."
                    : `${filteredUsers.length} ${
                        filteredUsers.length === 1 ? "user" : "users"
                      } displayed`}
                </p>

              </div>

            </div>
          </div>

          {search && (
            <span className="
              inline-flex
              w-fit
              shrink-0
              items-center
              gap-1.5
              rounded-lg
              border
              border-[#bbf7d0]
              bg-[#f0fdf4]
              px-2.5
              py-1.5
              text-[10px]
              sm:text-xs
              font-bold
              text-[#166534]
              dark:border-emerald-500/20
              dark:bg-emerald-500/10
              dark:text-[#86efac]
            ">
              <span className="material-symbols-outlined text-[14px]">
                filter_alt
              </span>
              Filtered
            </span>
          )}

        </div>

        {/* =================================================
            DESKTOP TABLE
        ================================================= */}

        <div className="hidden md:block overflow-x-auto">

          <table className="w-full min-w-[760px] text-left text-sm table-fixed">

            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[16%]" />
              <col className="w-[20%]" />
              <col className="w-[16%]" />
              <col className="w-[14%]" />
            </colgroup>

            <thead className="
              border-b
              border-[#e2e8f0]
              bg-[#f8fafc]
              dark:border-white/[0.08]
              dark:bg-white/[0.025]
            ">

              <tr>

                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#cbd5e1]">
                  User
                </th>

                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#cbd5e1]">
                  Faculty ID
                </th>

                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#cbd5e1]">
                  Department
                </th>

                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#cbd5e1]">
                  Role
                </th>

                <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#cbd5e1]">
                  Action
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-[#e2e8f0] dark:divide-white/[0.06]">

              {/* LOADING SKELETON */}
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <SkeletonRow key={idx} />
                ))

              ) : filteredUsers.length === 0 ? (

                <tr>
                  <td colSpan={5} className="px-6 py-16">

                    <EmptyState
                      search={search}
                      onClear={() => setSearch("")}
                    />

                  </td>
                </tr>

              ) : (

                filteredUsers.map((user, idx) => (

                  <tr
                    key={user.uid || idx}
                    className="
                      group
                      transition-colors
                      hover:bg-[#f8fafc]
                      dark:hover:bg-white/[0.025]
                    "
                  >

                    {/* USER */}
                    <td className="px-5 py-4">

                      <UserIdentity
                        user={user}
                        avatarColor={avatarColor}
                        initials={initials}
                      />

                    </td>

                    {/* FACULTY ID */}
                    <td className="px-5 py-4">

                      <span className="
                        inline-flex
                        max-w-full
                        truncate
                        items-center
                        rounded-lg
                        border
                        border-[#dbe4df]
                        bg-[#f8fafc]
                        px-2.5
                        py-1
                        text-xs
                        font-semibold
                        text-[#334155]
                        dark:border-white/[0.08]
                        dark:bg-white/[0.04]
                        dark:text-[#e2e8f0]
                      ">
                        {user.facultyId}
                      </span>

                    </td>

                    {/* DEPARTMENT */}
                    <td className="px-5 py-4">

                      <span className="text-sm font-medium text-[#334155] dark:text-[#d1d9e3]">
                        {user.department || "—"}
                      </span>

                    </td>

                    {/* ROLE */}
                    <td className="px-5 py-4">

                      <RoleBadge role={user.role} />

                    </td>

                    {/* ACTION */}
                    <td className="px-5 py-4">

                      <div className="flex items-center justify-center">
                        <DeleteButton
                          onClick={() =>
                            requestDelete(
  user.uid,
  user.name || user.facultyId || "this user"
)
                          }
                          label={`Delete ${user.name}`}
                          isDeleting={
                            !!user.uid && user.uid === deletingId
                          }
                        />
                      </div>

                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

        {/* =================================================
            MOBILE CARDS
        ================================================= */}

        <div className="md:hidden">

          {isLoading ? (

            <div className="divide-y divide-[#e2e8f0] dark:divide-white/[0.06]">
              {Array.from({ length: 5 }).map((_, idx) => (
                <SkeletonCard key={idx} />
              ))}
            </div>

          ) : filteredUsers.length === 0 ? (

            <div className="px-4 py-14 min-[400px]:px-5">

              <EmptyState
                search={search}
                onClear={() => setSearch("")}
              />

            </div>

          ) : (

            <div className="divide-y divide-[#e2e8f0] dark:divide-white/[0.06]">

              {filteredUsers.map((user, idx) => (

                <div
                  key={user.uid || idx}
                  className="
                    relative
                    min-w-0
                    p-4
                    min-[400px]:p-5
                    transition-colors
                    hover:bg-[#f8fafc]
                    dark:hover:bg-white/[0.025]
                  "
                >

                  {/* USER */}
                  <div className="flex min-w-0 items-start gap-3">

                    <UserIdentity
                      user={user}
                      avatarColor={avatarColor}
                      initials={initials}
                      mobile
                    />

                    <div className="ml-auto shrink-0">

                      <DeleteButton
                        onClick={() =>
                          requestDelete(
                            user.uid,
                            user.facultyId || user.name
                          )
                        }
                        label={`Delete ${user.name}`}
                        isDeleting={
                          !!user.uid && user.uid === deletingId
                        }
                      />

                    </div>

                  </div>

                  {/* USER DETAILS */}
                  <div className="
                    mt-4
                    grid
                    grid-cols-1
                    min-[400px]:grid-cols-2
                    gap-2
                  ">

                    <MobileDetail
                      icon="badge"
                      label="Faculty ID"
                      value={user.facultyId || "N/A"}
                    />

                    <MobileDetail
                      icon="business"
                      label="Department"
                      value={user.department || "—"}
                    />

                    <div className="
                      min-w-0
                      rounded-xl
                      border
                      border-[#e2e8f0]
                      bg-[#f8fafc]
                      p-2.5
                      dark:border-white/[0.07]
                      dark:bg-white/[0.025]
                      min-[400px]:col-span-2
                    ">

                      <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#64748b] dark:text-[#aebbc9]">
                        Role
                      </p>

                      <RoleBadge role={user.role} />

                    </div>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </section>

      {/* =====================================================
          DELETE CONFIRMATION MODAL
      ===================================================== */}
      {confirmTarget && (
        <DeleteConfirmModal
          label={confirmTarget.label}
          isDeleting={deletingId === confirmTarget.uid}
          error={deleteError}
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
        />
      )}

    </div>
  );
}

/* ============================================================
   DELETE CONFIRM MODAL
   (rendered via portal so `fixed` + `backdrop-blur` always
   cover the full viewport, even though a parent wrapper has
   `overflow-hidden` / `animate-modal-enter` which would
   otherwise trap it)
============================================================ */

function DeleteConfirmModal({
  label,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: {
  label: string;
  isDeleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/50
        backdrop-blur-sm
        p-4
      "
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          w-full
          max-w-sm
          rounded-2xl
          border
          border-[#dbe4df]
          dark:border-white/[0.10]
          bg-white
          dark:bg-[#0d1420]
          shadow-xl
          p-5
          sm:p-6
          animate-modal-enter
        "
      >

        <div className="flex flex-col items-center text-center">

  {/* Warning Icon */}
  <div
    className="
      flex
      h-14
      w-14
      items-center
      justify-center
      rounded-2xl
      bg-red-50
      dark:bg-red-500/10
      mb-4
    "
  >
    <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[26px]">
      warning
    </span>
  </div>

  {/* Heading */}
  <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-white">
    Delete user?
  </h3>

</div>

        <p className="mt-1.5 text-xs sm:text-sm text-[#64748b] dark:text-[#94a3b8] leading-5">
          You're about to delete{" "}
          <span className="font-semibold text-[#111827] dark:text-white">
            {label}
          </span>
          . This action cannot be undone.
        </p>

        {error && (
          <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2.5">

          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="
              h-9
              px-4
              rounded-lg
              text-xs
              sm:text-sm
              font-bold
              text-[#374151]
              dark:text-[#cbd5e1]
              hover:bg-[#f3f4f6]
              dark:hover:bg-white/[0.06]
              transition-colors
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="
              h-9
              px-4
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-red-600
              text-white
              text-xs
              sm:text-sm
              font-bold
              hover:bg-red-700
              transition-colors
              disabled:opacity-70
              disabled:cursor-not-allowed
              min-w-[92px]
            "
          >
            {isDeleting ? (
              <>
                <span
                  className="
                    h-4
                    w-4
                    rounded-full
                    border-2
                    border-white/30
                    border-t-white
                    animate-spin
                  "
                />
                Deleting
              </>
            ) : (
              "Delete"
            )}
          </button>

        </div>

      </div>
    </div>,
    document.body
  );
}

/* ============================================================
   USER IDENTITY
============================================================ */

function UserIdentity({
  user,
  avatarColor,
  initials,
  mobile = false,
}: {
  user: User;
  avatarColor: (seed: string) => string;
  initials: (name: string) => string;
  mobile?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">

      {user.user_profile_image_link ? (

        <img
          src={user.user_profile_image_link}
          alt={user.name}
          className="
            h-10
            w-10
            sm:h-11
            sm:w-11
            shrink-0
            rounded-full
            object-cover
            ring-2
            ring-white
            shadow-sm
            dark:ring-[#0d1420]
          "
        />

      ) : (

        <div
          className={`
            flex
            h-10
            w-10
            sm:h-11
            sm:w-11
            shrink-0
            items-center
            justify-center
            rounded-full
            ${avatarColor(user.name)}
            text-xs
            font-bold
            shadow-sm
          `}
        >
          {initials(user.name)}
        </div>

      )}

      <div className="min-w-0 flex-1">

        <div className="
          truncate
          text-sm
          font-bold
          text-[#111827]
          dark:text-white
        ">
          {user.name}
        </div>

        <div className="
          mt-0.5
          truncate
          text-[11px]
          sm:text-xs
          font-medium
          text-[#64748b]
          dark:text-[#b6c2d0]
        ">
          {user.email || user.username || "No email"}
        </div>

        {mobile && (
          <div className="mt-1 text-[10px] font-medium text-[#94a3b8] dark:text-[#8fa0b3]">
            @{user.username || "username"}
          </div>
        )}

      </div>

    </div>
  );
}

/* ============================================================
   ROLE BADGE
============================================================ */

function RoleBadge({ role }: { role: string }) {
  const admin = role?.toLowerCase() === "admin";

  return admin ? (
    <span className="
      inline-flex
      w-fit
      items-center
      gap-1.5
      rounded-full
      border
      border-violet-200
      bg-violet-50
      px-2.5
      py-1.5
      text-[10px]
      sm:text-xs
      font-bold
      text-violet-800
      dark:border-violet-500/20
      dark:bg-violet-500/10
      dark:text-violet-300
    ">
      <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
      Admin
    </span>
  ) : (
    <span className="
      inline-flex
      w-fit
      items-center
      gap-1.5
      rounded-full
      border
      border-[#bbf7d0]
      bg-[#f0fdf4]
      px-2.5
      py-1.5
      text-[10px]
      sm:text-xs
      font-bold
      text-[#166534]
      dark:border-emerald-500/20
      dark:bg-emerald-500/10
      dark:text-[#86efac]
    ">
      <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
      {role || "Faculty"}
    </span>
  );
}

/* ============================================================
   DELETE BUTTON
============================================================ */

function DeleteButton({
  onClick,
  label,
  isDeleting,
}: {
  onClick: () => void;
  label: string;
  isDeleting?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDeleting}
      className="
        flex
        h-9
        w-9
        shrink-0
        items-center
        justify-center
        rounded-lg
        border
        border-transparent
        text-[#64748b]
        transition-all
        duration-200
        hover:border-red-200
        hover:bg-red-50
        hover:text-red-600
        dark:text-[#94a3b8]
        dark:hover:border-red-500/20
        dark:hover:bg-red-500/10
        dark:hover:text-red-400
        active:scale-95
        disabled:opacity-70
        disabled:cursor-not-allowed
        disabled:active:scale-100
      "
      title={isDeleting ? "Deleting" : "Delete User"}
      aria-label={isDeleting ? "Deleting" : label}
    >
      {isDeleting ? (
        <span
          className="
            h-4
            w-4
            rounded-full
            border-2
            border-red-600/25
            dark:border-red-400/25
            border-t-red-600
            dark:border-t-red-400
            animate-spin
          "
        />
      ) : (
        <span className="material-symbols-outlined text-[19px]">
          delete
        </span>
      )}
    </button>
  );
}

/* ============================================================
   MOBILE DETAIL
============================================================ */

function MobileDetail({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="
      min-w-0
      rounded-xl
      border
      border-[#e2e8f0]
      bg-[#f8fafc]
      p-2.5
      dark:border-white/[0.07]
      dark:bg-white/[0.025]
    ">

      <div className="flex min-w-0 items-center gap-2">

        <span className="
          material-symbols-outlined
          shrink-0
          text-[16px]
          text-[#15803d]
          dark:text-[#86efac]
        ">
          {icon}
        </span>

        <div className="min-w-0">

          <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748b] dark:text-[#aebbc9]">
            {label}
          </p>

          <p className="mt-0.5 truncate text-xs font-semibold text-[#334155] dark:text-[#e2e8f0]">
            {value}
          </p>

        </div>

      </div>
    </div>
  );
}

/* ============================================================
   SKELETON ROW (Desktop table loading state)
============================================================ */

function SkeletonRow() {
  return (
    <tr className="animate-pulse">

      {/* USER */}
      <td className="px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-full bg-[#e2e8f0] dark:bg-white/[0.08]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-32 rounded bg-[#e2e8f0] dark:bg-white/[0.08]" />
            <div className="h-3 w-40 rounded bg-[#e2e8f0] dark:bg-white/[0.06]" />
          </div>
        </div>
      </td>

      {/* FACULTY ID */}
      <td className="px-5 py-4">
        <div className="h-6 w-20 rounded-lg bg-[#e2e8f0] dark:bg-white/[0.08]" />
      </td>

      {/* DEPARTMENT */}
      <td className="px-5 py-4">
        <div className="h-3.5 w-24 rounded bg-[#e2e8f0] dark:bg-white/[0.08]" />
      </td>

      {/* ROLE */}
      <td className="px-5 py-4">
        <div className="h-6 w-16 rounded-full bg-[#e2e8f0] dark:bg-white/[0.08]" />
      </td>

      {/* ACTION */}
      <td className="px-5 py-4">
        <div className="mx-auto h-9 w-9 rounded-lg bg-[#e2e8f0] dark:bg-white/[0.08]" />
      </td>

    </tr>
  );
}

/* ============================================================
   SKELETON CARD (Mobile loading state)
============================================================ */

function SkeletonCard() {
  return (
    <div className="animate-pulse p-4 min-[400px]:p-5">

      <div className="flex min-w-0 items-start gap-3">

        <div className="h-10 w-10 shrink-0 rounded-full bg-[#e2e8f0] dark:bg-white/[0.08]" />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-28 rounded bg-[#e2e8f0] dark:bg-white/[0.08]" />
          <div className="h-3 w-36 rounded bg-[#e2e8f0] dark:bg-white/[0.06]" />
          <div className="h-2.5 w-20 rounded bg-[#e2e8f0] dark:bg-white/[0.06]" />
        </div>

        <div className="ml-auto h-9 w-9 shrink-0 rounded-lg bg-[#e2e8f0] dark:bg-white/[0.08]" />

      </div>

      <div className="mt-4 grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">

        <div className="h-12 rounded-xl bg-[#e2e8f0] dark:bg-white/[0.06]" />
        <div className="h-12 rounded-xl bg-[#e2e8f0] dark:bg-white/[0.06]" />
        <div className="h-12 rounded-xl bg-[#e2e8f0] dark:bg-white/[0.06] min-[400px]:col-span-2" />

      </div>

    </div>
  );
}

/* ============================================================
   EMPTY STATE
   (this was the missing component causing
   "Cannot find name 'EmptyState'.ts(2304)")
============================================================ */

function EmptyState({
  search,
  onClear,
}: {
  search: string;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center">

      <div
        className="
          mb-4
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-2xl
          border
          border-[#e2e8f0]
          bg-[#f8fafc]
          dark:border-white/[0.08]
          dark:bg-white/[0.04]
        "
      >
        <span className="material-symbols-outlined text-[26px] text-[#94a3b8] dark:text-[#8fa0b3]">
          {search ? "search_off" : "group_off"}
        </span>
      </div>

      <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-white">
        {search ? "No matching users" : "No users yet"}
      </h3>

      <p className="mt-1.5 max-w-xs text-xs sm:text-sm leading-5 text-[#64748b] dark:text-[#94a3b8]">
        {search
          ? `We couldn't find any users matching "${search}".`
          : "Once users are added, they'll show up here."}
      </p>

      {search && (
        <button
          type="button"
          onClick={onClear}
          className="
            mt-4
            inline-flex
            items-center
            gap-1.5
            rounded-lg
            border
            border-[#dbe4df]
            dark:border-white/[0.1]
            bg-white
            dark:bg-white/[0.04]
            px-3.5
            py-2
            text-xs
            sm:text-sm
            font-bold
            text-[#374151]
            dark:text-[#e2e8f0]
            hover:bg-[#f3f4f6]
            dark:hover:bg-white/[0.08]
            transition-colors
          "
        >
          <span className="material-symbols-outlined text-[16px]">
            close
          </span>
          Clear search
        </button>
      )}

    </div>
  );
}