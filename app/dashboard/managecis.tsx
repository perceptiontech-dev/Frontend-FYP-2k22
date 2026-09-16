"use client";

import { useEffect, useMemo, useState } from "react";

interface ManageCISProps {
  onClose?: () => void;
  onRequestDelete?: (cisId: string, label: string) => void;
  reloadKey?: number;
}

export default function ManageCIS({
  onClose,
  onRequestDelete,
  reloadKey,
}: ManageCISProps) {
  const [cisItems, setCisItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const baseUrl =
    process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:8000";

  const loadCis = async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token")
          : null;

      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${baseUrl}/api/v1/cis`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Failed to load CIS records"
        );
      }

      const data = await response.json();

      setCisItems(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load CIS records"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadCis();
  }, [reloadKey]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return cisItems;

    return cisItems.filter((item) =>
      [item.course_id, item.course_name, item.department]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [search, cisItems]);

  const formatMonthDay = (iso?: string) => {
    if (!iso) return "—";

    const d = new Date(iso);

    if (Number.isNaN(d.getTime())) return "—";

    return `${d.toLocaleString("en-US", {
      month: "short",
    })} ${d.getDate()}, ${d.getFullYear()}`;
  };

  const totalCIS = cisItems.length;

  const departments = new Set(
    cisItems.map((item) => item.department).filter(Boolean)
  ).size;

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden animate-modal-enter pb-4 sm:pb-8">

      {/* =========================================================
          HEADER CARD
      ========================================================= */}
      <div
        className="
          relative
          overflow-hidden
          mb-5
          sm:mb-7
          rounded-2xl
          border
          border-[#d1d5db]
          dark:border-white/[0.09]
          bg-white
          dark:bg-[#0d1420]
          shadow-sm
          transition-all
          duration-300
        "
      >

     


        <div
          className="
            relative
            p-4
            min-[350px]:p-5
            sm:p-6
            lg:p-7
          "
        >
          <div
            className="
              flex
              flex-col
              gap-5
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >

            {/* =====================================================
                TITLE CONTENT
            ===================================================== */}
            <div className="min-w-0">

              {/* ADMINISTRATION */}
              <div className="flex items-center gap-2 mb-2.5">

                <span className="relative flex h-2 w-2 shrink-0">
                  <span
                    className="
                      absolute
                      inline-flex
                      h-full
                      w-full
                      animate-ping
                      rounded-full
                      bg-[#22c55e]
                      opacity-50
                    "
                  />

                  <span
                    className="
                      relative
                      inline-flex
                      h-2
                      w-2
                      rounded-full
                      bg-[#16a34a]
                    "
                  />
                </span>

                <span
                  className="
                    text-[10px]
                    min-[350px]:text-xs
                    font-bold
                    uppercase
                    tracking-[0.18em]
                    text-[#15803D]
                    dark:text-[#4ADE80]
                  "
                >
                  Administration
                </span>

              </div>

              {/* MANAGE CIS */}
              <h1
                className="
                  text-xl
                  min-[350px]:text-2xl
                  sm:text-3xl
                  font-bold
                  tracking-tight
                  text-[#111827]
                  dark:text-white
                "
              >
                Manage CIS
              </h1>

              {/* DESCRIPTION */}
              <p
                className="
                  mt-1.5
                  max-w-2xl
                  text-xs
                  min-[350px]:text-sm
                  leading-5
                  text-[#4b5563]
                  dark:text-[#94a3b8]
                "
              >
                Manage course information sheets and uploaded CIS
                documents across the system.
              </p>

            </div>

            {/* =====================================================
                SEARCH BOX
            ===================================================== */}
            <div
              className="
                relative
                w-full
                lg:w-[330px]
                xl:w-[360px]
                shrink-0
              "
            >

              {/* SEARCH CARD */}
              <div
                className="
                  relative
                  rounded-xl
                  border
                  border-[#d1d5db]
                  dark:border-white/[0.10]
                  bg-[#f8fafc]
                  dark:bg-[#0a111d]
                  shadow-sm
                  transition-all
                  duration-200
                  focus-within:border-[#22c55e]
                  focus-within:ring-4
                  focus-within:ring-[#22c55e]/10
                "
              >

                <span
                  className="
                    material-symbols-outlined
                    absolute
                    left-3.5
                    top-1/2
                    -translate-y-1/2
                    text-[#64748b]
                    dark:text-[#94a3b8]
                    text-[20px]
                    pointer-events-none
                  "
                >
                  search
                </span>

                <input
                  className="
                    w-full
                    h-11
                    sm:h-12
                    pl-11
                    pr-10
                    rounded-xl
                    bg-transparent
                    text-xs
                    sm:text-sm
                    font-medium
                    text-[#111827]
                    dark:text-white
                    placeholder:text-[#6b7280]
                    dark:placeholder:text-[#64748b]
                    outline-none
                  "
                  placeholder="Search CIS..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="text"
                />

                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="
                      absolute
                      right-2.5
                      top-1/2
                      -translate-y-1/2
                      w-7
                      h-7
                      flex
                      items-center
                      justify-center
                      rounded-lg
                      text-[#64748b]
                      hover:text-[#15803D]
                      hover:bg-[#DCFCE7]
                      dark:hover:bg-[#14532d]/30
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
        </div>
      </div>

      {/* =========================================================
          STAT CARDS
      ========================================================= */}
      <div
        className="
          grid
          grid-cols-1
          min-[420px]:grid-cols-2
          gap-3
          sm:gap-4
          mb-5
          sm:mb-6
        "
      >

        {/* TOTAL CIS */}
        <div
          className="
            group
            relative
            overflow-hidden
            rounded-xl
            sm:rounded-2xl
            border
            border-[#d1d5db]
            dark:border-white/[0.10]
            bg-white
            dark:bg-[#0d1420]
            p-4
            sm:p-5
            shadow-sm
            hover:shadow-md
            hover:-translate-y-0.5
            transition-all
            duration-300
          "
        >
          <div
            className="
              absolute
              -right-8
              -top-8
              h-24
              w-24
              rounded-full
              bg-[#22c55e]/10
              blur-2xl
              pointer-events-none
            "
          />

          <div className="relative flex items-center justify-between gap-3">

            <div className="min-w-0">

              <p
                className="
                  text-[10px]
                  sm:text-xs
                  font-bold
                  uppercase
                  tracking-wider
                  text-[#4b5563]
                  dark:text-[#94a3b8]
                "
              >
                Total CIS
              </p>

              <p
                className="
                  mt-1.5
                  text-2xl
                  sm:text-3xl
                  font-bold
                  text-[#111827]
                  dark:text-white
                "
              >
                {isLoading ? "—" : totalCIS}
              </p>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  sm:text-xs
                  text-[#6b7280]
                  dark:text-[#94a3b8]
                "
              >
                Uploaded documents
              </p>

            </div>

            <div
              className="
                shrink-0
                w-10
                h-10
                sm:w-11
                sm:h-11
                rounded-xl
                bg-[#DCFCE7]
                dark:bg-[#14532d]/40
                flex
                items-center
                justify-center
              "
            >
              <span
                className="
                  material-symbols-outlined
                  text-[#15803D]
                  dark:text-[#4ADE80]
                  text-[21px]
                "
              >
                description
              </span>
            </div>

          </div>
        </div>

        {/* DEPARTMENTS */}
        <div
          className="
            group
            relative
            overflow-hidden
            rounded-xl
            sm:rounded-2xl
            border
            border-[#d1d5db]
            dark:border-white/[0.10]
            bg-white
            dark:bg-[#0d1420]
            p-4
            sm:p-5
            shadow-sm
            hover:shadow-md
            hover:-translate-y-0.5
            transition-all
            duration-300
          "
        >
          <div
            className="
              absolute
              -right-8
              -top-8
              h-24
              w-24
              rounded-full
              bg-[#16a34a]/10
              blur-2xl
              pointer-events-none
            "
          />

          <div className="relative flex items-center justify-between gap-3">

            <div className="min-w-0">

              <p
                className="
                  text-[10px]
                  sm:text-xs
                  font-bold
                  uppercase
                  tracking-wider
                  text-[#4b5563]
                  dark:text-[#94a3b8]
                "
              >
                Departments
              </p>

              <p
                className="
                  mt-1.5
                  text-2xl
                  sm:text-3xl
                  font-bold
                  text-[#111827]
                  dark:text-white
                "
              >
                {isLoading ? "—" : departments}
              </p>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  sm:text-xs
                  text-[#6b7280]
                  dark:text-[#94a3b8]
                "
              >
                With CIS records
              </p>

            </div>

            <div
              className="
                shrink-0
                w-10
                h-10
                sm:w-11
                sm:h-11
                rounded-xl
                bg-[#DCFCE7]
                dark:bg-[#14532d]/40
                flex
                items-center
                justify-center
              "
            >
              <span
                className="
                  material-symbols-outlined
                  text-[#15803D]
                  dark:text-[#4ADE80]
                  text-[21px]
                "
              >
                account_tree
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* =========================================================
          CIS CONTAINER
      ========================================================= */}
      <div
        className="
          rounded-xl
          sm:rounded-2xl
          border
          border-[#d1d5db]
          dark:border-white/[0.10]
          bg-white
          dark:bg-[#0d1420]
          shadow-sm
          overflow-hidden
        "
      >

        {/* TABLE HEADER */}
        <div
          className="
            px-3
            min-[350px]:px-4
            sm:px-6
            py-3.5
            sm:py-4
            border-b
            border-[#e5e7eb]
            dark:border-white/[0.08]
            flex
            flex-col
            min-[400px]:flex-row
            min-[400px]:items-center
            min-[400px]:justify-between
            gap-2
          "
        >
          <div className="min-w-0">

            <h2
              className="
                text-sm
                sm:text-base
                font-bold
                text-[#111827]
                dark:text-white
              "
            >
              All CIS Documents
            </h2>

            <p
              className="
                text-[10px]
                sm:text-xs
                mt-0.5
                text-[#6b7280]
                dark:text-[#94a3b8]
              "
            >
              {filteredItems.length}{" "}
              {filteredItems.length === 1
                ? "document"
                : "documents"}{" "}
              displayed
            </p>

          </div>

          {search && (
            <span
              className="
                self-start
                inline-flex
                items-center
                gap-1.5
                px-2.5
                py-1
                rounded-lg
                bg-[#DCFCE7]
                dark:bg-[#14532d]/30
                text-[#15803D]
                dark:text-[#4ADE80]
                text-[10px]
                sm:text-xs
                font-bold
              "
            >
              <span className="material-symbols-outlined text-[14px]">
                filter_alt
              </span>
              Filtered
            </span>
          )}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden sm:block overflow-x-auto">

          <table className="w-full text-left">

            <thead
              className="
                bg-[#f8fafc]
                dark:bg-white/[0.025]
                border-b
                border-[#e5e7eb]
                dark:border-white/[0.07]
              "
            >
              <tr>

                <th
                  className="
                    px-5
                    sm:px-6
                    py-3.5
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-[#4b5563]
                    dark:text-[#94a3b8]
                  "
                >
                  Document
                </th>

                <th
                  className="
                    px-5
                    py-3.5
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-[#4b5563]
                    dark:text-[#94a3b8]
                  "
                >
                  Department
                </th>

                <th
                  className="
                    px-5
                    py-3.5
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-[#4b5563]
                    dark:text-[#94a3b8]
                  "
                >
                  Date Uploaded
                </th>

                <th
  className="
    px-5
    sm:px-6
    py-3.5
    text-[10px]
    font-bold
    uppercase
    tracking-wider
    text-[#4b5563]
    dark:text-[#94a3b8]
    text-center
  "
>
  Action
</th>

              </tr>
            </thead>

            <tbody
              className="
                divide-y
                divide-[#e5e7eb]
                dark:divide-white/[0.055]
              "
            >
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14">
                    <LoadingState />
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16">
                    <EmptyState
                      search={search}
                      onClear={() => setSearch("")}
                    />
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <CISDesktopRow
                    key={item.cis_id || idx}
                    item={item}
                    formatDate={formatMonthDay}
                    onRequestDelete={onRequestDelete}
                  />
                ))
              )}
            </tbody>

          </table>
        </div>

        {/* MOBILE */}
        <div className="sm:hidden">

          {isLoading ? (
            <div className="px-4 py-14">
              <LoadingState />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="px-4 py-14">
              <EmptyState
                search={search}
                onClear={() => setSearch("")}
              />
            </div>
          ) : (
            <div className="p-2.5 min-[350px]:p-3 space-y-2.5">
              {filteredItems.map((item, idx) => (
                <CISMobileCard
                  key={item.cis_id || idx}
                  item={item}
                  formatDate={formatMonthDay}
                  onRequestDelete={onRequestDelete}
                />
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

/* ================================================================
   LOADING
================================================================ */

function LoadingState() {
  return (
    <div className="w-full animate-pulse">
      {/* Skeleton rows */}
      <div className="space-y-5">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="flex items-center gap-4"
          >
            {/* Icon skeleton */}
            <div
              className="
                h-10
                w-10
                shrink-0
                rounded-xl
                bg-[#e5e7eb]
                dark:bg-white/[0.08]
              "
            />

            {/* Text skeleton */}
            <div className="flex-1 min-w-0 space-y-2">
              <div
                className="
                  h-3.5
                  w-32
                  rounded-md
                  bg-[#e5e7eb]
                  dark:bg-white/[0.08]
                "
              />

              <div
                className="
                  h-3
                  w-48
                  max-w-[70%]
                  rounded-md
                  bg-[#f1f5f9]
                  dark:bg-white/[0.05]
                "
              />
            </div>

            {/* Department skeleton */}
            <div
              className="
                hidden
                md:block
                h-3.5
                w-24
                rounded-md
                bg-[#e5e7eb]
                dark:bg-white/[0.08]
              "
            />

            {/* Date skeleton */}
            <div
              className="
                hidden
                lg:block
                h-3.5
                w-24
                rounded-md
                bg-[#e5e7eb]
                dark:bg-white/[0.08]
              "
            />

            {/* Action skeleton */}
            <div
              className="
                h-9
                w-9
                shrink-0
                rounded-lg
                bg-[#e5e7eb]
                dark:bg-white/[0.08]
              "
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   EMPTY STATE
================================================================ */

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
          w-14
          h-14
          rounded-2xl
          bg-[#DCFCE7]
          dark:bg-[#14532d]/30
          flex
          items-center
          justify-center
          mb-4
        "
      >
        <span
          className="
            material-symbols-outlined
            text-2xl
            text-[#15803D]
            dark:text-[#4ADE80]
          "
        >
          description
        </span>
      </div>

      <h3
        className="
          text-sm
          font-bold
          text-[#111827]
          dark:text-white
        "
      >
        No CIS documents found
      </h3>

      <p
        className="
          mt-1
          max-w-xs
          text-xs
          leading-5
          text-[#6b7280]
          dark:text-[#94a3b8]
        "
      >
        {search
          ? "Try changing your search terms or clear the search."
          : "No CIS documents have been uploaded yet."}
      </p>

      {search && (
        <button
          onClick={onClear}
          className="
            mt-4
            text-xs
            font-bold
            text-[#15803D]
            dark:text-[#4ADE80]
            hover:underline
          "
        >
          Clear search
        </button>
      )}

    </div>
  );
}

/* ================================================================
   DESKTOP ROW
================================================================ */

function CISDesktopRow({
  item,
  formatDate,
  onRequestDelete,
}: {
  item: any;
  formatDate: (date?: string) => string;
  onRequestDelete?: (cisId: string, label: string) => void;
}) {
  return (
    <tr
      className="
        group
        hover:bg-[#f8fafc]
        dark:hover:bg-white/[0.025]
        transition-colors
      "
    >

      <td className="px-5 sm:px-6 py-4">

        <div className="flex items-center gap-3 min-w-[220px]">

          <div
            className="
              w-10
              h-10
              rounded-xl
              bg-[#DCFCE7]
              dark:bg-[#14532d]/30
              flex
              items-center
              justify-center
              flex-shrink-0
            "
          >
            <span
              className="
                material-symbols-outlined
                text-[#15803D]
                dark:text-[#4ADE80]
              "
            >
              picture_as_pdf
            </span>
          </div>

          <div className="min-w-0">

            <div
              className="
                font-semibold
                text-sm
                text-[#111827]
                dark:text-white
                truncate
                max-w-[260px]
              "
            >
              {item.course_id || item.course_name || "N/A"}
            </div>

            {item.course_name && item.course_id && (
              <div
                className="
                  text-xs
                  text-[#6b7280]
                  dark:text-[#94a3b8]
                  mt-0.5
                  truncate
                  max-w-[260px]
                "
              >
                {item.course_name}
              </div>
            )}

          </div>

        </div>

      </td>

      <td className="px-5 py-4">

        <span
          className="
            text-sm
            font-medium
            text-[#4b5563]
            dark:text-[#cbd5e1]
          "
        >
          {item.department || "—"}
        </span>

      </td>

      <td className="px-5 py-4">

        <span
          className="
            text-sm
            font-medium
            text-[#4b5563]
            dark:text-[#cbd5e1]
          "
        >
          {formatDate(item.last_update_time)}
        </span>

      </td>

      <td className="px-5 sm:px-6 py-4 text-center">
  <div className="flex items-center justify-center gap-1">
    <ActionButtons
      item={item}
      onRequestDelete={onRequestDelete}
    />
  </div>
</td>

    </tr>
  );
}

/* ================================================================
   MOBILE CARD
================================================================ */

function CISMobileCard({
  item,
  formatDate,
  onRequestDelete,
}: {
  item: any;
  formatDate: (date?: string) => string;
  onRequestDelete?: (cisId: string, label: string) => void;
}) {
  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-xl
        border
        border-[#d1d5db]
        dark:border-white/[0.10]
        bg-white
        dark:bg-[#111827]
        p-3
        shadow-sm
        transition-all
        active:scale-[0.995]
      "
    >

      <div
        className="
          absolute
          left-0
          top-0
          bottom-0
          w-0.5
          bg-[#22c55e]
        "
      />

      <div className="flex items-start gap-2.5">

        <div
          className="
            shrink-0
            w-9
            h-9
            rounded-lg
            bg-[#DCFCE7]
            dark:bg-[#14532d]/35
            flex
            items-center
            justify-center
          "
        >
          <span
            className="
              material-symbols-outlined
              text-[19px]
              text-[#15803D]
              dark:text-[#4ADE80]
            "
          >
            description
          </span>
        </div>

        <div className="min-w-0 flex-1">

          <p
            className="
              text-xs
              min-[350px]:text-sm
              font-bold
              text-[#111827]
              dark:text-white
              truncate
            "
          >
            {item.course_id || item.course_name || "N/A"}
          </p>

          {item.course_name && item.course_id && (
            <p
              className="
                mt-0.5
                text-[10px]
                min-[350px]:text-xs
                text-[#6b7280]
                dark:text-[#94a3b8]
                truncate
              "
            >
              {item.course_name}
            </p>
          )}

        </div>

      </div>

      <div
        className="
          mt-3
          grid
          grid-cols-2
          gap-2
          border-t
          border-[#e5e7eb]
          dark:border-white/[0.07]
          pt-2.5
        "
      >

        <div className="min-w-0">

          <p
            className="
              text-[9px]
              uppercase
              tracking-wider
              font-bold
              text-[#6b7280]
              dark:text-[#94a3b8]
            "
          >
            Department
          </p>

          <p
            className="
              mt-0.5
              text-[10px]
              min-[350px]:text-xs
              font-semibold
              text-[#374151]
              dark:text-[#cbd5e1]
              truncate
            "
          >
            {item.department || "—"}
          </p>

        </div>

        <div className="min-w-0">

          <p
            className="
              text-[9px]
              uppercase
              tracking-wider
              font-bold
              text-[#6b7280]
              dark:text-[#94a3b8]
            "
          >
            Uploaded
          </p>

          <p
            className="
              mt-0.5
              text-[10px]
              min-[350px]:text-xs
              font-semibold
              text-[#374151]
              dark:text-[#cbd5e1]
              truncate
            "
          >
            {formatDate(item.last_update_time)}
          </p>

        </div>

      </div>

      <div
        className="
          mt-2.5
          pt-2.5
          border-t
          border-[#e5e7eb]
          dark:border-white/[0.07]
          flex
          items-center
          justify-end
          gap-1.5
        "
      >

        {item.link && (
          <button
            onClick={() =>
              window.open(
                item.link,
                "_blank",
                "noopener,noreferrer"
              )
            }
            className="
              h-8
              px-2.5
              inline-flex
              items-center
              justify-center
              gap-1.5
              rounded-lg
              bg-[#f0fdf4]
              dark:bg-[#14532d]/25
              text-[#15803D]
              dark:text-[#4ADE80]
              hover:bg-[#DCFCE7]
              dark:hover:bg-[#14532d]/40
              transition-colors
              text-[10px]
              font-bold
            "
          >
            <span className="material-symbols-outlined text-[16px]">
              visibility
            </span>
            <span>View</span>
          </button>
        )}

        <button
          onClick={() =>
            onRequestDelete?.(
              item.cis_id,
              item.course_id ||
                item.course_name ||
                "N/A"
            )
          }
          className="
            h-8
            w-8
            inline-flex
            items-center
            justify-center
            rounded-lg
            bg-[#fef2f2]
            dark:bg-red-500/10
            text-[#dc2626]
            dark:text-[#f87171]
            hover:bg-[#fee2e2]
            dark:hover:bg-red-500/20
            transition-colors
          "
          title="Delete CIS"
          aria-label="Delete CIS"
        >
          <span className="material-symbols-outlined text-[17px]">
            delete
          </span>
        </button>

      </div>

    </div>
  );
}

/* ================================================================
   ACTION BUTTONS
================================================================ */

function ActionButtons({
  item,
  onRequestDelete,
}: {
  item: any;
  onRequestDelete?: (cisId: string, label: string) => void;
}) {
  return (
    <>
      {item.link && (
        <button
          onClick={() =>
            window.open(
              item.link,
              "_blank",
              "noopener,noreferrer"
            )
          }
          className="
            w-9
            h-9
            inline-flex
            items-center
            justify-center
            rounded-lg
            border
            border-transparent
            text-[#6b7280]
            dark:text-[#94a3b8]
            hover:text-[#15803D]
            dark:hover:text-[#4ADE80]
            hover:bg-[#DCFCE7]
            dark:hover:bg-[#14532d]/30
            hover:border-[#bbf7d0]
            dark:hover:border-[#166534]
            transition-all
            duration-200
           
          "
          title="View Document"
          aria-label="View Document"
        >
          <span className="material-symbols-outlined text-[19px]">
            visibility
          </span>
        </button>
      )}

      <button
        onClick={() =>
          onRequestDelete?.(
            item.cis_id,
            item.course_id ||
              item.course_name ||
              "N/A"
          )
        }
        className="
          w-9
          h-9
          inline-flex
          items-center
          justify-center
          rounded-lg
          border
          border-transparent
          text-[#6b7280]
          dark:text-[#94a3b8]
          hover:text-red-600
          dark:hover:text-red-400
          hover:bg-red-50
          dark:hover:bg-red-500/10
          hover:border-red-100
          dark:hover:border-red-500/20
          transition-all
          duration-200
        "
        title="Delete CIS"
        aria-label="Delete CIS"
      >
        <span className="material-symbols-outlined text-[19px]">
          delete
        </span>
      </button>
    </>
  );
}