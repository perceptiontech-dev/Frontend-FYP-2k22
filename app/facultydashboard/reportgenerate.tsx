"use client";

import React, { useRef, useState } from "react";
import { generateReportPDF } from "./pdfGenerator";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { API_BASE_URL } from "../lib/api";

interface ReportGenerateProps {
  onFinish?: () => void;
  onBack?: () => void;
  cisLink?: string | null;
  paperLink?: string | null;
  initialReport?: string;
  onReportChange?: (report: string) => void;
  courseName?: string;
  courseCode?: string;
  paperType?: string;

  marksDivisionReport?: string;
  cloMappingReport?: string;
  questionCheckReport?: string;
  bloomTaxonomyReport?: string;
}

export default function ReportGenerateScreen({
  onFinish,
  onBack,
  cisLink,
  paperLink,
  initialReport = "",
  onReportChange,
  courseName,
  courseCode,
  paperType,
  marksDivisionReport = "",
  cloMappingReport = "",
  questionCheckReport = "",
  bloomTaxonomyReport = "",
}: ReportGenerateProps) {
  const [report, setReport] = React.useState(initialReport);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isFinishing, setIsFinishing] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const controllerRef = React.useRef<AbortController | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const hasSubReports =
    marksDivisionReport.length > 50 &&
    cloMappingReport.length > 50 &&
    questionCheckReport.length > 50 &&
    bloomTaxonomyReport.length > 50;

  // ============================================================
  // COMPLIANCE CALCULATION
  // ============================================================

  const calculateCompliance = (reportText: string): string => {
    if (!reportText) return "—";

    const yesMatches = reportText.match(/\bYES\b/gi) || [];
    const noMatches = reportText.match(/\bNO\b/gi) || [];
    const total = yesMatches.length + noMatches.length;

    if (total === 0) return "—";

    return `${Math.round((yesMatches.length / total) * 100)}%`;
  };

  const compliance = calculateCompliance(report);

  // ============================================================
  // VERDICT EXTRACTION
  // ============================================================

  const extractVerdict = (reportText: string): string => {
    if (!reportText) return "";

    const match =
      reportText.match(/##\s*Verdict\s*\n+\**\s*(ACCEPT|REJECTED)\s*\**/i) ||
      reportText.match(/\*\*\s*(ACCEPT|REJECTED)\s*\*\*/i) ||
      reportText.match(/\b(ACCEPT|REJECTED)\b/i);

    return match ? match[1].toUpperCase() : "";
  };

  const verdict = extractVerdict(report);
  const isVerdictAccept = verdict === "ACCEPT";

  // ============================================================
  // DOWNLOAD PDF
  // ============================================================

  const handleDownload = async () => {
    if (!report) return;

    setIsDownloading(true);

    try {
      const dateStr = new Date().toISOString().slice(0, 10);

      await generateReportPDF({
        report,
        courseName,
        courseCode,
        paperType,
        fileName: `IntelliPaper_${courseCode || "Report"}_${paperType || "Exam"}_${dateStr}.pdf`,
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // ============================================================
  // GENERATE REPORT
  // ============================================================

  const generateReport = async (signal: AbortSignal) => {
    setIsLoading(true);
    setReport("");

    let fullReport = "";


    try {
      const token = localStorage.getItem("access_token") || "";

      let response: Response;

      // ========================================================
      // SYNTHESIS PATH
      // ========================================================

      if (hasSubReports) {
        response = await fetch(`${API_BASE_URL}/api/v1/analyzer/reports/final/synthesize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            mark_division_report: marksDivisionReport,
            clo_mapping_report: cloMappingReport,
            question_check_report: questionCheckReport,
            bloom_taxonomy_report: bloomTaxonomyReport,
            course_name: courseName || "",
            course_code: courseCode || "",
            paper_type: paperType || "",
          }),
          signal,
        });
      }

      // ========================================================
      // FALLBACK PATH
      // ========================================================

      else {
        response = await fetch(`${API_BASE_URL}/api/v1/analyzer/reports/final`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cis_link: cisLink,
            paper_link: paperLink,
          }),
          signal,
        });
      }

      if (!response.ok) {
        throw new Error(`Server error ${response.status}`);
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("No response stream");
      }

      const decoder = new TextDecoder();
      let metaBuffer = "";
      let metadataStripped = !hasSubReports;

      // ========================================================
      // SYNTHESIS STREAM
      // ========================================================

      if (hasSubReports) {
        while (true) {
          const { value, done } = await reader.read();

          if (done) break;

          if (signal.aborted) {
            reader.cancel();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          fullReport += chunk;
          setReport(fullReport);
        }
      }

      // ========================================================
      // FALLBACK STREAM
      // ========================================================

      else {
        while (true) {
          const { value, done } = await reader.read();

          if (done) break;

          if (signal.aborted) {
            reader.cancel();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });

          if (!metadataStripped) {
            metaBuffer += chunk;

            const endIdx = metaBuffer.indexOf("__METADATA_END__");

            if (endIdx !== -1) {
              metadataStripped = true;
              const afterMeta = metaBuffer.slice(endIdx + "__METADATA_END__".length);

              if (afterMeta) {
                fullReport += afterMeta;
                setReport(fullReport);
              }
            }
          } else {
            fullReport += chunk;
            setReport(fullReport);
          }
        }
      }

      try {
        reader.releaseLock();
      } catch {}

      if (!signal.aborted) {
        onReportChange?.(fullReport);
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        return;
      }

      console.error("ReportGenerate error:", error);
      setReport("Error generating report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // REGENERATE
  // ============================================================

  const handleRegenerate = () => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    generateReport(controller.signal);
  };

  // ============================================================
  // INITIAL GENERATION
  // ============================================================

  React.useEffect(() => {
    if (initialReport) return;

    const controller = new AbortController();
    controllerRef.current = controller;

    generateReport(controller.signal);

    return () => controller.abort();
  }, []);

  // ============================================================
  // HANDLE EXPAND
  // ============================================================

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      {/* BACKDROP */}
      <div className="fixed inset-0 bg-black/40 z-40" />

      {/* ======================================================
          MODAL WRAPPER
          ====================================================== */}

      <div
        className="
          fixed inset-0
          z-50

          flex
          items-center
          justify-center

          overflow-y-auto
          overflow-x-hidden

          px-1
          min-[320px]:px-2
          min-[375px]:px-3
          sm:px-4

          py-1
          min-[320px]:py-2
          min-[375px]:py-3
          sm:py-6
        "
      >
        {/* ====================================================
            OUTER MODAL - A4 Proportions
            ==================================================== */}

        <div
          className="
            bg-white

            w-full
            max-w-4xl
            min-w-0

            h-[calc(100vh-0.5rem)]
            min-[320px]:h-[calc(100vh-1rem)]
            min-[375px]:h-[calc(100vh-1.5rem)]
            sm:h-[calc(100vh-2rem)]

            rounded-xl
            min-[375px]:rounded-2xl
            sm:rounded-3xl

            p-1
            min-[320px]:p-2
            min-[375px]:p-3
            sm:p-6

            shadow-xl

            overflow-hidden

            flex
          "
        >
          {/* ==================================================
              INNER AREA
              ================================================== */}

          <div
            className="
              flex-1

              min-w-0
              min-h-0

              p-1
              min-[320px]:p-2
              min-[375px]:p-3
              sm:p-6
            "
          >
            {/* =================================================
                MAIN CONTENT - GREEN THEME
                ================================================= */}

            <div
              className="
                h-full

                min-w-0
                min-h-0

                flex
                flex-col

                p-2
                min-[320px]:p-3
                min-[375px]:p-4
                sm:p-6

                rounded-lg
                min-[375px]:rounded-2xl
                sm:rounded-3xl
              "
              style={{
                backgroundColor: "#e8f5e9", // Light green
              }}
            >
              {/* =================================================
                  TITLE
                  ================================================= */}

              <h1
                className="
                  shrink-0

                  text-base
                  min-[320px]:text-lg
                  min-[375px]:text-xl
                  sm:text-2xl

                  font-bold

                  text-center

                  mb-2
                  min-[375px]:mb-3
                  sm:mb-4
                "
                style={{
                  color: "#1B5E20",
                }}
              >
                Report Generate
              </h1>

              {/* =================================================
                  REPORT AREA - A4 STYLE
                  ================================================= */}

              <div
                className={`
                  flex-1

                  min-h-0
                  min-w-0

                  bg-white

                  rounded-lg
                  min-[375px]:rounded-xl
                  sm:rounded-2xl

                  p-2
                  min-[320px]:p-3
                  min-[375px]:p-4
                  sm:p-5

                  relative

                  mb-2
                  min-[375px]:mb-3
                  sm:mb-5

                  overflow-auto

                  ${isExpanded ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl' : ''}
                `}
                ref={previewRef}
                style={{
                  boxShadow: isExpanded ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)" : "inset 0 2px 4px rgba(0,0,0,0.06)",
                }}
              >
                {/* A4 PAPER SIMULATION */}
                <div
                  className="
                    w-full
                    h-full

                    flex
                    flex-col

                    mx-auto

                    bg-white

                    rounded
                  "
                  style={{
                    maxWidth: "210mm",
                    minHeight: "297mm",
                    padding: "12mm 15mm",
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  {/* REPORT HEADER */}
                  <div className="text-center border-b-2 border-green-600 pb-3 mb-3">
                    <h2
                      className="
                        text-lg
                        min-[320px]:text-xl
                        min-[375px]:text-2xl
                        sm:text-3xl

                        font-bold

                        tracking-tight
                      "
                      style={{
                        color: "#1B5E20",
                      }}
                    >
                      FINAL EVALUATION REPORT
                    </h2>

                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1 text-[10px] sm:text-xs text-gray-600">
                      <span>
                        <span className="font-semibold">Course:</span>{" "}
                        {courseCode || "N/A"}
                      </span>
                      <span>
                        <span className="font-semibold">Paper:</span>{" "}
                        {paperType ? paperType.charAt(0).toUpperCase() + paperType.slice(1) : "N/A"}
                      </span>
                      <span>
                        <span className="font-semibold">Date:</span>{" "}
                        {new Date().toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* COMPLIANCE METER */}
                  <div className="flex items-center justify-between bg-green-50 rounded-lg p-2 mb-3 border border-green-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[11px] sm:text-sm font-medium text-green-800">
                        Compliance Score
                      </span>
                    </div>
                    <span className="text-lg sm:text-xl font-bold text-green-700">
                      {isLoading && !report ? "..." : compliance}
                    </span>
                  </div>

                  {/* VERDICT BADGE */}
                  {verdict && (
                    <div
                      className={`
                        text-center
                        py-1.5
                        px-3
                        rounded-lg
                        mb-3
                        font-bold
                        text-xs
                        sm:text-sm
                        ${isVerdictAccept
                          ? "bg-green-100 text-green-800 border border-green-300"
                          : "bg-red-100 text-red-800 border border-red-300"
                        }
                      `}
                    >
                      Verdict: {verdict}
                    </div>
                  )}

                  {/* SYNTHESIS MESSAGE */}
                  {hasSubReports && !isLoading && !report && (
                    <p className="text-[10px] sm:text-xs text-center text-green-600 mb-2 break-words">
                      Synthesizing from 4 analysis reports…
                    </p>
                  )}

                  {/* =================================================
                      MARKDOWN REPORT
                      ================================================= */}

                  <div
                    className="
                      flex-1

                      text-[10px]
                      min-[320px]:text-[10px]
                      min-[375px]:text-xs
                      sm:text-sm

                      text-gray-800

                      leading-relaxed

                      overflow-y-auto

                      prose
                      prose-sm
                      max-w-none

                      [&_table]:w-full
                      [&_table]:border-collapse
                      [&_table]:text-[9px]
                      [&_table]:text-[10px]
                      [&_th]:border
                      [&_th]:border-gray-300
                      [&_th]:px-2
                      [&_th]:py-1
                      [&_th]:bg-green-50
                      [&_th]:text-left
                      [&_td]:border
                      [&_td]:border-gray-300
                      [&_td]:px-2
                      [&_td]:py-1
                      [&_h1]:text-base
                      [&_h1]:font-bold
                      [&_h1]:text-[#1B5E20]
                      [&_h2]:text-sm
                      [&_h2]:font-semibold
                      [&_h2]:text-[#1B5E20]
                      [&_h3]:text-xs
                      [&_h3]:font-semibold
                      [&_h3]:text-[#1B5E20]
                    "
                  >
                    {isLoading && !report ? (
                      <div className="flex items-center justify-center h-24 min-[375px]:h-32 text-center">
                        <p className="animate-pulse text-gray-500 text-xs min-[375px]:text-sm">
                          {hasSubReports
                            ? "Synthesizing final report..."
                            : "Generating Report..."}
                        </p>
                      </div>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {report}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* FOOTER */}
                  <div className="text-center text-[8px] sm:text-[10px] text-gray-400 border-t border-gray-200 pt-2 mt-3">
                    Generated by IntelliPaper · {new Date().toLocaleString()}
                  </div>
                </div>

                {/* EXPAND BUTTON */}
                <button
                  type="button"
                  onClick={handleExpand}
                  aria-label={isExpanded ? "Collapse preview" : "Expand preview"}
                  className={`
                    absolute

                    bottom-2
                    right-2

                    min-[375px]:bottom-3
                    min-[375px]:right-3

                    flex
                    items-center
                    justify-center

                    w-6
                    h-6

                    min-[375px]:w-7
                    min-[375px]:h-7

                    rounded-md

                    text-gray-400

                    hover:bg-gray-100
                    hover:text-gray-600

                    transition

                    cursor-pointer

                    ${isExpanded ? 'bg-white shadow-lg' : ''}
                  `}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`
                      w-3
                      h-3

                      min-[375px]:w-3.5
                      min-[375px]:h-3.5

                      ${isExpanded ? 'rotate-180' : ''}
                      transition-transform
                    `}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 3h6v6" />
                    <path d="M9 21H3v-6" />
                    <path d="M21 3l-7 7" />
                    <path d="M3 21l7-7" />
                  </svg>
                </button>
              </div>

              {/* =================================================
                  BUTTON AREA - GREEN THEME
                  ================================================= */}

              <div
                className="
                  shrink-0

                  w-full
                  min-w-0

                  grid

                  grid-cols-4

                  gap-1
                  min-[320px]:gap-1.5
                  min-[375px]:gap-2
                  sm:gap-3

                  items-center
                "
              >
                {/* =================================================
                    BACK
                    ================================================= */}

                <button
                  onClick={onBack}
                  className="
                    min-w-0

                    w-full

                    px-1
                    min-[320px]:px-1.5
                    min-[375px]:px-3
                    sm:px-10

                    py-1.5
                    min-[375px]:py-2
                    sm:py-2.5

                    text-white

                    rounded-md
                    min-[375px]:rounded-lg

                    text-[9px]
                    min-[320px]:text-[10px]
                    min-[375px]:text-xs
                    sm:text-sm

                    font-medium

                    whitespace-nowrap

                    overflow-hidden
                    text-ellipsis

                    transition

                    hover:opacity-90
                    active:scale-95
                  "
                  style={{
                    backgroundColor: "#2E7D32", // Dark green
                  }}
                >
                  Back
                </button>

                {/* =================================================
                    REGENERATE
                    ================================================= */}

                <button
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  className="
                    min-w-0

                    w-full

                    flex
                    items-center
                    justify-center

                    gap-0.5
                    min-[375px]:gap-1
                    sm:gap-2

                    px-1
                    min-[320px]:px-1.5
                    min-[375px]:px-2
                    sm:px-6

                    py-1.5
                    min-[375px]:py-2
                    sm:py-2.5

                    text-white

                    rounded-md
                    min-[375px]:rounded-lg

                    text-[8px]
                    min-[320px]:text-[9px]
                    min-[375px]:text-xs
                    sm:text-sm

                    font-medium

                    whitespace-nowrap

                    overflow-hidden

                    disabled:opacity-50

                    transition

                    hover:opacity-90
                    active:scale-95
                  "
                  style={{
                    backgroundColor: "#374151",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="
                      w-3
                      h-3

                      min-[375px]:w-3.5
                      min-[375px]:h-3.5

                      sm:w-4
                      sm:h-4

                      shrink-0
                    "
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>

                  <span className="truncate">
                    {isLoading ? "Generating..." : "Regenerate"}
                  </span>
                </button>

                {/* =================================================
                    DOWNLOAD PDF - Green themed
                    ================================================= */}

                <button
                  onClick={handleDownload}
                  disabled={!report || isLoading || isDownloading}
                  className="
                    min-w-0

                    w-full

                    px-1
                    min-[320px]:px-1.5
                    min-[375px]:px-2
                    sm:px-10

                    py-1.5
                    min-[375px]:py-2
                    sm:py-2.5

                    text-white

                    rounded-md
                    min-[375px]:rounded-lg

                    text-[8px]
                    min-[320px]:text-[9px]
                    min-[375px]:text-xs
                    sm:text-sm

                    font-medium

                    whitespace-nowrap

                    overflow-hidden
                    text-ellipsis

                    disabled:opacity-40

                    transition

                    hover:opacity-90
                    active:scale-95

                    flex
                    items-center
                    justify-center
                    gap-1
                  "
                  style={{
                    backgroundColor: "#43A047", // Medium green
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="
                      w-3
                      h-3

                      min-[375px]:w-3.5
                      min-[375px]:h-3.5

                      shrink-0
                    "
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>

                  {isDownloading ? "Downloading..." : "Download PDF"}
                </button>

                {/* =================================================
                    FINISH - Green themed
                    ================================================= */}

                <button
                  onClick={async () => {
                    if (isFinishing) return;

                    setIsFinishing(true);

                    try {
                      await onFinish?.();
                    } finally {
                      setIsFinishing(false);
                    }
                  }}
                  disabled={isFinishing}
                  className="
                    min-w-0

                    w-full

                    px-1
                    min-[320px]:px-1.5
                    min-[375px]:px-3
                    sm:px-10

                    py-1.5
                    min-[375px]:py-2
                    sm:py-2.5

                    text-white

                    rounded-md
                    min-[375px]:rounded-lg

                    text-[9px]
                    min-[320px]:text-[10px]
                    min-[375px]:text-xs
                    sm:text-sm

                    font-medium

                    whitespace-nowrap

                    overflow-hidden
                    text-ellipsis

                    disabled:opacity-60

                    transition

                    hover:opacity-90
                    active:scale-95

                    flex
                    items-center
                    justify-center
                    gap-1
                  "
                  style={{
                    backgroundColor: "#1B5E20", // Darkest green
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="
                      w-3
                      h-3

                      min-[375px]:w-3.5
                      min-[375px]:h-3.5

                      shrink-0
                    "
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>

                  {isFinishing ? "Saving..." : "Finish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDED OVERLAY CLOSE */}
      {isExpanded && (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={handleExpand} />
      )}
    </>
  );
}