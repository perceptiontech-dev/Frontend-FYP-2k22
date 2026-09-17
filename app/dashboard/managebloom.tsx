"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE_URL } from "../lib/api";

interface ManageBloomsProps {
  onClose: () => void;
  onRequestDelete?: (bloomId: string, label: string) => void;

  // Bloom report inputs
  cisLink?: string;
  paperLink?: string;
  sessionId?: string;
  paperType?: "midterm" | "final";
}

interface BloomDoc {
  bloom_id: string;
  file_name: string;
  link: string;
  uploaded_at: string | null;
}

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ManageBlooms({
  onClose,
  onRequestDelete,
  cisLink,
  paperLink,
  sessionId,
  paperType,
}: ManageBloomsProps) {
  const [blooms, setBlooms] = useState<BloomDoc[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Bloom report states
  const [report, setReport] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportVisible, setReportVisible] = useState(false);

  const token = () => {
    if (typeof window === "undefined") return "";

    return localStorage.getItem("access_token") || "";
  };

  /* =========================================================
     LOAD BLOOM REFERENCE FILES
  ========================================================= */

  const loadBlooms = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/blooms`,
        {
          headers: {
            Authorization: `Bearer ${token()}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to load Bloom's references"
        );
      }

      const data = await response.json();

      setBlooms(Array.isArray(data) ? data : []);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load Bloom's references"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBlooms();
  }, []);

  /* =========================================================
     FILE VALIDATION
  ========================================================= */

  const isValidFile = (file: File) =>
    ALLOWED_EXTENSIONS.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    if (!isValidFile(file)) {
      alert(
        "Only PDF, DOC, DOCX, PPT, and PPTX files are allowed."
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert("File size must be 5MB or smaller.");
      return;
    }

    setSelectedFile(file);
  };

  /* =========================================================
     UPLOAD BLOOM REFERENCE
  ========================================================= */

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file to upload.");
      return;
    }

    setIsUploading(true);

    try {
      const payload = new FormData();

      payload.append("file", selectedFile);

      const response = await fetch(
        `${API_BASE_URL}/api/v1/blooms/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token()}`,
          },
          body: payload,
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to upload Bloom's reference"
        );
      }

      setSelectedFile(null);

      await loadBlooms();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to upload Bloom's reference"
      );
    } finally {
      setIsUploading(false);
    }
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const handleDelete = (
    bloomId: string,
    label: string
  ) => {
    onRequestDelete?.(bloomId, label);
  };

  /* =========================================================
     FILE SIZE
  ========================================================= */

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  /* =========================================================
     READ REPORT STREAM
     
     This follows the project's readReportStream convention.
     Metadata between:
       __METADATA_START__
       __METADATA_END__
     is removed before rendering.
  ========================================================= */

  const readBloomReportStream = async (
    response: Response,
    signal: AbortSignal,
    onUpdate: (text: string) => void
  ) => {
    if (!response.body) {
      throw new Error("Report stream is not available.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let accumulated = "";

    try {
      while (true) {
        if (signal.aborted) {
          throw new DOMException(
            "Request cancelled",
            "AbortError"
          );
        }

        const { value, done } = await reader.read();

        if (done) break;

        accumulated += decoder.decode(value, {
          stream: true,
        });

        /*
         * Remove metadata block.
         */
        let visibleReport = accumulated;

        const metadataStart = visibleReport.indexOf(
          "__METADATA_START__"
        );

        const metadataEnd = visibleReport.indexOf(
          "__METADATA_END__"
        );

        if (
          metadataStart !== -1 &&
          metadataEnd !== -1
        ) {
          const endPosition =
            metadataEnd +
            "__METADATA_END__".length;

          visibleReport =
            visibleReport.slice(0, metadataStart) +
            visibleReport.slice(endPosition);
        } else if (metadataStart !== -1) {
          /*
           * Metadata has started but has not finished yet.
           * Hide it while streaming.
           */
          visibleReport = visibleReport.slice(
            0,
            metadataStart
          );
        }

        onUpdate(visibleReport.trim());
      }

      accumulated += decoder.decode();

      /*
       * Final cleanup.
       */
      let finalReport = accumulated;

      const metadataStart = finalReport.indexOf(
        "__METADATA_START__"
      );

      const metadataEnd = finalReport.indexOf(
        "__METADATA_END__"
      );

      if (
        metadataStart !== -1 &&
        metadataEnd !== -1
      ) {
        finalReport =
          finalReport.slice(0, metadataStart) +
          finalReport.slice(
            metadataEnd +
              "__METADATA_END__".length
          );
      }

      finalReport = finalReport.trim();

      onUpdate(finalReport);

      return finalReport;
    } finally {
      reader.releaseLock();
    }
  };

  /* =========================================================
     GENERATE BLOOM TAXONOMY REPORT
  ========================================================= */

  const handleGenerateReport = async () => {
    if (!cisLink) {
      setReportError(
        "CIS link is missing. Please select a CIS first."
      );
      return;
    }

    if (!paperLink) {
      setReportError(
        "Paper link is missing. Please upload an exam paper first."
      );
      return;
    }

    const controller = new AbortController();

    setReport("");
    setReportError("");
    setReportVisible(true);
    setIsGeneratingReport(true);

    /*
     * Store controller so the Cancel button can abort it.
     */
    reportAbortController = controller;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/analyzer/reports/bloom-taxonomy`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({
            cis_link: cisLink,
            paper_link: paperLink,
            session_id: sessionId || undefined,
            paper_type: paperType || undefined,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({}));

        if (response.status === 401) {
          /*
           * Token expired/invalid.
           */
          localStorage.removeItem("access_token");

          throw new Error(
            "Your session has expired. Please login again."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "Not authorized to generate Bloom's Taxonomy report."
          );
        }

        if (response.status === 422) {
          throw new Error(
            errorData?.detail ||
              "Invalid request. Please check the CIS and paper."
          );
        }

        if (response.status === 500) {
          throw new Error(
            errorData?.detail ||
              "AI service internal error. Please try again later."
          );
        }

        if (response.status === 503) {
          throw new Error(
            errorData?.detail ||
              "AI service is currently unavailable. Please try again later."
          );
        }

        throw new Error(
          errorData?.detail ||
            `Server error ${response.status}`
        );
      }

      await readBloomReportStream(
        response,
        controller.signal,
        (text) => {
          setReport(text);
        }
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        /*
         * User cancelled the request.
         */
        return;
      }

      setReportError(
        error instanceof Error
          ? error.message
          : "Failed to generate Bloom's Taxonomy report."
      );
    } finally {
      setIsGeneratingReport(false);

      if (reportAbortController === controller) {
        reportAbortController = null;
      }
    }
  };

  /*
   * Controller used by Cancel/Regenerate.
   *
   * It is intentionally kept outside React state because
   * AbortController itself does not need to trigger a render.
   */
  let reportAbortController: AbortController | null = null;

  const handleCancelReport = () => {
    reportAbortController?.abort();
    reportAbortController = null;
    setIsGeneratingReport(false);
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      className="
        w-full max-w-3xl
        max-h-[calc(100vh-2rem)]
        sm:max-h-[90vh]
        overflow-hidden
        rounded-2xl sm:rounded-3xl
        border border-slate-200
        bg-white
        shadow-2xl
        dark:border-white/[0.08]
        dark:bg-[#0B1220]
        animate-modal-enter
        flex flex-col
      "
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div
        className="
          shrink-0
          border-b border-slate-200
          bg-white
          px-4 py-4
          sm:px-6 sm:py-5
          dark:border-white/[0.07]
          dark:bg-[#0B1220]
        "
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-xl
                bg-emerald-50
                text-emerald-600
                dark:bg-emerald-500/10
                dark:text-emerald-400
              "
            >
              <span className="material-symbols-outlined text-[23px]">
                auto_awesome
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  className="
                    truncate
                    text-base font-bold
                    tracking-tight
                    text-slate-900
                    sm:text-lg
                    dark:text-white
                  "
                >
                  Bloom&apos;s Taxonomy
                </h2>

                <span
                  className="
                    hidden
                    rounded-full
                    bg-emerald-50
                    px-2 py-0.5
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-emerald-700
                    sm:inline-flex
                    dark:bg-emerald-500/10
                    dark:text-emerald-400
                  "
                >
                  Analysis
                </span>
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm dark:text-slate-400">
                Manage Bloom&apos;s references and generate the
                cognitive-level report.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="
              flex h-9 w-9 shrink-0
              items-center justify-center
              rounded-xl
              text-slate-400
              transition-all
              hover:bg-slate-100
              hover:text-slate-700
              dark:hover:bg-white/[0.06]
              dark:hover:text-white
            "
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[21px]">
              close
            </span>
          </button>
        </div>
      </div>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div
        className="
          flex-1
          overflow-y-auto
          overscroll-contain
          px-4 py-5
          sm:px-6 sm:py-6
        "
      >
        <div className="space-y-6">

          {/* =================================================
              BLOOM REPORT
          ================================================== */}

          <div
            className="
              rounded-2xl
              border border-emerald-100
              bg-emerald-50/40
              p-4
              dark:border-emerald-500/10
              dark:bg-emerald-500/[0.04]
            "
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Bloom&apos;s Taxonomy Report
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Checks each exam question against its assigned
                  Bloom&apos;s cognitive level.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isGeneratingReport && (
                  <button
                    type="button"
                    onClick={handleCancelReport}
                    className="
                      h-9 rounded-lg
                      border border-slate-200
                      bg-white
                      px-3
                      text-xs font-semibold
                      text-slate-600
                      hover:bg-slate-100
                      dark:border-white/[0.08]
                      dark:bg-white/[0.03]
                      dark:text-slate-300
                      dark:hover:bg-white/[0.06]
                    "
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={
                    isGeneratingReport ||
                    !cisLink ||
                    !paperLink
                  }
                  className="
                    inline-flex h-9
                    items-center justify-center
                    gap-2 rounded-lg
                    bg-emerald-600
                    px-4
                    text-xs font-bold
                    text-white
                    shadow-sm
                    transition-all
                    hover:bg-emerald-700
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {isGeneratingReport ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">
                        progress_activity
                      </span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">
                        auto_awesome
                      </span>
                      {report ? "Regenerate" : "Generate Report"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {!cisLink && (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                Select a CIS before generating the report.
              </div>
            )}

            {!paperLink && (
              <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                Upload an exam paper before generating the report.
              </div>
            )}

            {reportError && (
              <div
                className="
                  mt-4 rounded-xl
                  border border-red-200
                  bg-red-50
                  px-3 py-3
                  text-xs text-red-700
                  dark:border-red-500/20
                  dark:bg-red-500/10
                  dark:text-red-400
                "
              >
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[17px]">
                    error
                  </span>

                  <span>{reportError}</span>
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              REPORT OUTPUT
          ================================================== */}

          {reportVisible && (
            <div
              className="
                overflow-hidden
                rounded-2xl
                border border-slate-200
                bg-white
                dark:border-white/[0.08]
                dark:bg-[#0D1626]
              "
            >
              <div
                className="
                  flex items-center justify-between
                  border-b border-slate-200
                  px-4 py-3
                  dark:border-white/[0.07]
                "
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">
                    assessment
                  </span>

                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Analysis Result
                  </span>
                </div>

                {isGeneratingReport && (
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Streaming
                  </span>
                )}
              </div>

              <div className="overflow-x-auto p-4">
                {report ? (
                  <div
                    className="
                      bloom-report
                      min-w-[700px]
                      text-sm
                      text-slate-700
                      dark:text-slate-300

                      [&_table]:w-full
                      [&_table]:border-collapse

                      [&_th]:border
                      [&_th]:border-slate-200
                      [&_th]:bg-slate-50
                      [&_th]:px-3
                      [&_th]:py-2
                      [&_th]:text-left
                      [&_th]:text-xs
                      [&_th]:font-bold
                      [&_th]:text-slate-700

                      [&_td]:border
                      [&_td]:border-slate-200
                      [&_td]:px-3
                      [&_td]:py-2
                      [&_td]:align-top
                      [&_td]:text-xs

                      dark:[&_th]:border-white/[0.08]
                      dark:[&_th]:bg-white/[0.04]
                      dark:[&_th]:text-slate-200

                      dark:[&_td]:border-white/[0.08]
                      dark:[&_td]:text-slate-300

                      [&_strong]:font-bold
                      [&_strong]:text-emerald-700
                      dark:[&_strong]:text-emerald-400
                    "
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {report}
                    </ReactMarkdown>
                  </div>
                ) : isGeneratingReport ? (
                  <div className="flex min-h-[180px] items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined animate-spin text-[30px] text-emerald-500">
                        progress_activity
                      </span>

                      <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Analyzing Bloom&apos;s Taxonomy...
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        The report will appear here as it streams.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-xs text-slate-400">
                      No report available.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================
              UPLOAD AREA
          ================================================== */}

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Add Reference File
                </h3>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Upload a document for AI taxonomy analysis.
                </p>
              </div>

              <span
                className="
                  hidden
                  rounded-lg
                  bg-slate-100
                  px-2.5 py-1
                  text-[10px]
                  font-bold
                  text-slate-500
                  sm:block
                  dark:bg-white/[0.05]
                  dark:text-slate-400
                "
              >
                MAX 5 MB
              </span>
            </div>

            <div
              className={`
                group relative
                overflow-hidden
                rounded-2xl
                border-2 border-dashed
                p-5 sm:p-7
                text-center
                transition-all
                duration-200
                ${
                  selectedFile
                    ? "border-emerald-400 bg-emerald-50/70 dark:border-emerald-500/40 dark:bg-emerald-500/[0.07]"
                    : "border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/60 dark:border-white/[0.09] dark:bg-white/[0.025] dark:hover:border-emerald-500/30 dark:hover:bg-emerald-500/[0.05]"
                }
              `}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();

                handleFileSelect(
                  e.dataTransfer.files?.[0] || null
                );
              }}
            >
              <input
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                className="
                  absolute inset-0
                  z-10 h-full w-full
                  cursor-pointer
                  opacity-0
                "
                type="file"
                onChange={(e) =>
                  handleFileSelect(
                    e.target.files?.[0] || null
                  )
                }
              />

              <div
                className="
                  mx-auto
                  flex h-12 w-12
                  items-center justify-center
                  rounded-2xl
                  bg-white
                  text-emerald-600
                  shadow-sm
                  ring-1 ring-slate-200
                  transition-transform
                  group-hover:scale-105
                  dark:bg-white/[0.06]
                  dark:text-emerald-400
                  dark:ring-white/[0.08]
                "
              >
                <span className="material-symbols-outlined text-[25px]">
                  {selectedFile
                    ? "task_alt"
                    : "cloud_upload"}
                </span>
              </div>

              {selectedFile ? (
                <>
                  <p className="mx-auto mt-3 max-w-full truncate px-3 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedFile.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatFileSize(selectedFile.size)} ·
                    Ready to upload
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm font-bold text-slate-800 dark:text-white">
                    Drop your reference file here
                  </p>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    or{" "}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      browse from your device
                    </span>
                  </p>

                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {[
                      "PDF",
                      "DOC",
                      "DOCX",
                      "PPT",
                      "PPTX",
                    ].map((type) => (
                      <span
                        key={type}
                        className="
                          rounded-md
                          bg-white
                          px-2 py-1
                          text-[9px]
                          font-bold
                          text-slate-500
                          ring-1 ring-slate-200
                          dark:bg-white/[0.04]
                          dark:text-slate-400
                          dark:ring-white/[0.07]
                        "
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            {selectedFile && (
              <div
                className="
                  mt-3 flex flex-col
                  gap-3 rounded-xl
                  border border-emerald-100
                  bg-emerald-50/60
                  p-3
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                  dark:border-emerald-500/10
                  dark:bg-emerald-500/[0.06]
                "
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600 dark:text-emerald-400">
                    check_circle
                  </span>

                  <span className="truncate text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    File selected and ready
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="
                    self-start
                    rounded-lg px-2.5 py-1.5
                    text-xs font-semibold
                    text-slate-500
                    transition-colors
                    hover:bg-white
                    hover:text-red-600
                    sm:self-auto
                    dark:hover:bg-white/[0.06]
                    dark:hover:text-red-400
                  "
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* =================================================
              CURRENT FILES
          ================================================== */}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Current Taxonomy Files
                </h3>

                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {blooms.length}{" "}
                  {blooms.length === 1
                    ? "reference"
                    : "references"}{" "}
                  available
                </p>
              </div>

              {!isLoading && blooms.length > 0 && (
                <span
                  className="
                    flex h-7 min-w-7
                    items-center justify-center
                    rounded-lg
                    bg-slate-100
                    px-2
                    text-[11px]
                    font-bold
                    text-slate-600
                    dark:bg-white/[0.06]
                    dark:text-slate-300
                  "
                >
                  {blooms.length}
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {isLoading ? (
                <>
                  {[1, 2].map((item) => (
                    <div
                      key={item}
                      className="
                        flex items-center gap-3
                        rounded-xl
                        border border-slate-200
                        bg-slate-50
                        p-3
                        dark:border-white/[0.07]
                        dark:bg-white/[0.025]
                      "
                    >
                      <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200 dark:bg-white/[0.08]" />

                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-white/[0.08]" />

                        <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-white/[0.06]" />
                      </div>

                      <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-200 dark:bg-white/[0.08]" />
                    </div>
                  ))}
                </>
              ) : blooms.length === 0 ? (
                <div
                  className="
                    rounded-2xl
                    border border-dashed
                    border-slate-200
                    bg-slate-50
                    px-5 py-10
                    text-center
                    dark:border-white/[0.08]
                    dark:bg-white/[0.02]
                  "
                >
                  <div
                    className="
                      mx-auto
                      flex h-12 w-12
                      items-center justify-center
                      rounded-2xl
                      bg-slate-100
                      text-slate-400
                      dark:bg-white/[0.05]
                      dark:text-slate-500
                    "
                  >
                    <span className="material-symbols-outlined text-[24px]">
                      folder_open
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No reference files yet
                  </p>

                  <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-slate-500 dark:text-slate-500">
                    Upload your first Bloom&apos;s Taxonomy
                    reference document using the area above.
                  </p>
                </div>
              ) : (
                blooms.map((bloom) => (
                  <div
                    key={bloom.bloom_id}
                    className="
                      group
                      flex flex-col gap-3
                      rounded-xl
                      border border-slate-200
                      bg-white
                      p-3
                      transition-all
                      hover:border-emerald-200
                      hover:shadow-sm
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                      dark:border-white/[0.07]
                      dark:bg-white/[0.025]
                      dark:hover:border-emerald-500/20
                    "
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="
                          flex h-10 w-10 shrink-0
                          items-center justify-center
                          rounded-xl
                          bg-emerald-50
                          text-emerald-600
                          dark:bg-emerald-500/10
                          dark:text-emerald-400
                        "
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          description
                        </span>
                      </div>

                      <div className="min-w-0">
                        <p
                          className="
                            truncate
                            text-sm font-semibold
                            text-slate-800
                            dark:text-white
                          "
                          title={bloom.file_name}
                        >
                          {bloom.file_name}
                        </p>

                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            Bloom&apos;s reference
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className="
                        flex items-center
                        gap-1
                        border-t border-slate-100
                        pt-2
                        sm:border-t-0
                        sm:pt-0
                      "
                    >
                      {bloom.link && (
                        <button
                          onClick={() =>
                            window.open(
                              bloom.link,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          className="
                            flex h-9 flex-1
                            items-center justify-center
                            gap-1.5 rounded-lg
                            px-3
                            text-xs font-semibold
                            text-slate-600
                            transition-colors
                            hover:bg-slate-100
                            hover:text-emerald-600
                            sm:flex-none
                            dark:text-slate-300
                            dark:hover:bg-white/[0.06]
                            dark:hover:text-emerald-400
                          "
                          title="View Document"
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            visibility
                          </span>

                          <span className="sm:hidden">
                            View
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() =>
                          handleDelete(
                            bloom.bloom_id,
                            bloom.file_name
                          )
                        }
                        className="
                          flex h-9 flex-1
                          items-center justify-center
                          gap-1.5 rounded-lg
                          px-3
                          text-xs font-semibold
                          text-red-500
                          transition-colors
                          hover:bg-red-50
                          sm:flex-none
                          dark:text-red-400
                          dark:hover:bg-red-500/10
                        "
                        title="Delete Document"
                      >
                        <span className="material-symbols-outlined text-[17px]">
                          delete
                        </span>

                        <span className="sm:hidden">
                          Delete
                        </span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <div
        className="
          shrink-0
          border-t border-slate-200
          bg-slate-50/80
          px-4 py-3
          sm:px-6 sm:py-4
          dark:border-white/[0.07]
          dark:bg-white/[0.02]
        "
      >
        <div
          className="
            flex flex-col-reverse
            gap-2.5
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <p className="hidden text-[11px] text-slate-400 sm:block dark:text-slate-500">
            Supported formats: PDF, DOC, DOCX, PPT, PPTX
          </p>

          <div className="flex w-full gap-2.5 sm:w-auto">
            <button
              onClick={onClose}
              className="
                h-10 flex-1
                rounded-xl
                border border-slate-200
                bg-white
                px-4
                text-xs font-semibold
                text-slate-600
                transition-colors
                hover:bg-slate-100
                sm:flex-none
                dark:border-white/[0.08]
                dark:bg-white/[0.03]
                dark:text-slate-300
                dark:hover:bg-white/[0.06]
              "
            >
              Cancel
            </button>

            <button
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="
                h-10 flex-1
                rounded-xl
                bg-emerald-600
                px-5
                text-xs font-bold
                text-white
                shadow-sm
                transition-all
                hover:bg-emerald-700
                hover:shadow-md
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-50
                sm:flex-none
              "
            >
              <span className="inline-flex items-center gap-2">
                {isUploading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[17px]">
                      progress_activity
                    </span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[17px]">
                      cloud_upload
                    </span>
                    Upload File
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}