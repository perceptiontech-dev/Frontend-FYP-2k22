"use client";

import React, { useRef, useState } from "react";
import { ArrowLeft, Maximize2, Download, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ReportGenerateDownloadProps {
  onDownload?: () => void;
  onFinish?: () => void;
  reportContent?: string;
  isLoading?: boolean;
  courseName?: string;
  courseCode?: string;
  paperType?: string;
  compliance?: string;
  verdict?: string;
}

export default function ReportGenerateDownloadScreen({
  onDownload,
  onFinish,
  reportContent = "",
  isLoading = false,
  courseName = "",
  courseCode = "",
  paperType = "",
  compliance = "—",
  verdict = "",
}: ReportGenerateDownloadProps) {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const isVerdictAccept = verdict?.toUpperCase() === "ACCEPT";

  return (
    <>
      {/* =========================================================
          MODAL BACKGROUND
          ========================================================= */}
      <div className="fixed inset-0 bg-black/40 z-40" />

      {/* =========================================================
          MODAL WRAPPER
          Responsive down to 300px
          ========================================================= */}
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
        {/* =======================================================
            OUTER MODAL
            A4 size proportions (portrait)
            ======================================================= */}
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
          {/* =====================================================
              MAIN CONTENT
              ===================================================== */}
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
            {/* ===================================================
                GREEN CONTAINER (changed from purple to green)
                =================================================== */}
            <div
              className="
                rounded-lg
                min-[375px]:rounded-2xl
                sm:rounded-3xl

                p-2
                min-[320px]:p-3
                min-[375px]:p-4
                sm:p-6

                h-full

                flex
                flex-col

                min-w-0
                min-h-0
              "
              style={{
                backgroundColor: "#e8f5e9", // Light green background
              }}
            >
              {/* =================================================
                  HEADER
                  ================================================= */}
              <div
                className="
                  shrink-0

                  flex
                  items-center

                  gap-1
                  min-[320px]:gap-2
                  min-[375px]:gap-3

                  mb-2
                  min-[375px]:mb-3
                  sm:mb-4

                  min-w-0
                "
              >
                {/* BACK ICON */}
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Go back"
                  className="
                    shrink-0

                    flex
                    items-center
                    justify-center

                    w-7
                    h-7

                    min-[320px]:w-8
                    min-[320px]:h-8

                    min-[375px]:w-9
                    min-[375px]:h-9

                    rounded-full

                    hover:bg-white/60

                    transition

                    cursor-pointer
                  "
                >
                  <ArrowLeft
                    className="
                      w-4
                      h-4

                      min-[320px]:w-5
                      min-[320px]:h-5

                      min-[375px]:w-5
                      min-[375px]:h-5

                      text-[#1B5E20]
                    "
                  />
                </button>

                {/* TITLE */}
                <h1
                  className="
                    flex-1

                    min-w-0

                    text-center

                    text-base
                    min-[320px]:text-lg
                    min-[375px]:text-xl
                    sm:text-2xl

                    font-bold

                    text-[#1B5E20]

                    truncate

                    pr-7
                    min-[320px]:pr-8
                    min-[375px]:pr-9
                  "
                >
                  Report Generate
                </h1>
              </div>

              {/* =================================================
                  PREVIEW BOX - A4 Style
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
                  sm:p-6

                  relative

                  mb-2
                  min-[320px]:mb-3
                  min-[375px]:mb-4
                  sm:mb-6

                  overflow-auto

                  ${isExpanded ? 'fixed inset-8 z-50 rounded-2xl shadow-2xl' : ''}
                `}
                ref={previewRef}
                style={{
                  backgroundColor: "#ffffff",
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
                    maxWidth: "210mm", // A4 width
                    minHeight: "297mm", // A4 height
                    padding: "12mm 15mm",
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  {/* REPORT HEADER */}
                  <div className="text-center border-b-2 border-green-600 pb-4 mb-4">
                    <h1
                      className="
                        text-lg
                        min-[320px]:text-xl
                        min-[375px]:text-2xl
                        sm:text-3xl

                        font-bold

                        text-[#1B5E20]

                        tracking-tight
                      "
                    >
                      FINAL EVALUATION REPORT
                    </h1>

                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 mt-2 text-xs sm:text-sm text-gray-600">
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
                  <div className="flex items-center justify-between bg-green-50 rounded-lg p-3 mb-4 border border-green-200">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-medium text-green-800">
                        Compliance Score
                      </span>
                    </div>
                    <span className="text-xl sm:text-2xl font-bold text-green-700">
                      {isLoading ? "..." : compliance}
                    </span>
                  </div>

                  {/* VERDICT BADGE */}
                  {verdict && (
                    <div
                      className={`
                        text-center
                        py-2
                        px-4
                        rounded-lg
                        mb-4
                        font-bold
                        text-sm
                        sm:text-base
                        ${isVerdictAccept
                          ? "bg-green-100 text-green-800 border border-green-300"
                          : "bg-red-100 text-red-800 border border-red-300"
                        }
                      `}
                    >
                      Verdict: {verdict}
                    </div>
                  )}

                  {/* REPORT CONTENT */}
                  <div
                    className="
                      flex-1

                      text-xs
                      min-[320px]:text-xs
                      min-[375px]:text-sm
                      sm:text-sm

                      text-gray-800

                      leading-relaxed

                      overflow-y-auto

                      prose
                      prose-sm
                      max-w-none

                      [&_table]:w-full
                      [&_table]:border-collapse
                      [&_table]:text-xs
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
                      [&_h1]:text-lg
                      [&_h1]:font-bold
                      [&_h1]:text-[#1B5E20]
                      [&_h2]:text-base
                      [&_h2]:font-semibold
                      [&_h2]:text-[#1B5E20]
                      [&_h3]:text-sm
                      [&_h3]:font-semibold
                      [&_h3]:text-[#1B5E20]
                    "
                    dangerouslySetInnerHTML={{
                      __html: isLoading
                        ? '<div class="flex items-center justify-center h-32"><p class="text-gray-400 animate-pulse">Generating report...</p></div>'
                        : reportContent
                            .replace(/\n/g, "<br />")
                            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                            .replace(/\*(.*?)\*/g, "<em>$1</em>")
                            .replace(/^# (.*)$/gm, "<h1>$1</h1>")
                            .replace(/^## (.*)$/gm, "<h2>$1</h2>")
                            .replace(/^### (.*)$/gm, "<h3>$1</h3>")
                            .replace(/\|/g, " | "),
                    }}
                  />

                  {/* FOOTER */}
                  <div className="text-center text-[10px] text-gray-400 border-t border-gray-200 pt-3 mt-4">
                    Generated by IntelliPaper · {new Date().toLocaleString()}
                  </div>
                </div>

                {/* EXPAND ICON */}
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

                    w-7
                    h-7

                    min-[375px]:w-8
                    min-[375px]:h-8

                    rounded-md

                    text-gray-400

                    hover:bg-gray-100
                    hover:text-gray-600

                    transition

                    cursor-pointer

                    ${isExpanded ? 'bg-white shadow-lg' : ''}
                  `}
                >
                  <Maximize2
                    className={`
                      w-3.5
                      h-3.5

                      min-[375px]:w-4
                      min-[375px]:h-4

                      ${isExpanded ? 'rotate-180' : ''}
                      transition-transform
                    `}
                  />
                </button>
              </div>

              {/* =================================================
                  BUTTONS
                  ================================================= */}
              <div
                className="
                  shrink-0

                  w-full
                  min-w-0

                  grid
                  grid-cols-2

                  gap-2
                  min-[375px]:gap-3
                  sm:gap-4

                  sm:flex
                  sm:justify-center

                  items-center
                "
              >
                {/* DOWNLOAD BUTTON - Green themed */}
                <button
                  onClick={onDownload}
                  disabled={isLoading || !reportContent}
                  className="
                    w-full

                    min-w-0

                    px-2
                    min-[320px]:px-3
                    min-[375px]:px-5
                    sm:px-10

                    py-1.5
                    min-[320px]:py-2
                    min-[375px]:py-2.5

                    rounded-md
                    min-[375px]:rounded-lg

                    bg-green-600

                    text-white

                    text-[10px]
                    min-[320px]:text-xs
                    min-[375px]:text-sm

                    font-medium

                    whitespace-nowrap

                    hover:bg-green-700

                    transition

                    active:scale-95

                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    disabled:active:scale-100

                    flex
                    items-center
                    justify-center
                    gap-1.5
                  "
                >
                  <Download className="w-3.5 h-3.5 min-[375px]:w-4 min-[375px]:h-4" />
                  Download
                </button>

                {/* FINISH BUTTON - Green themed */}
                <button
                  onClick={onFinish}
                  disabled={isLoading || !reportContent}
                  className="
                    w-full

                    min-w-0

                    px-2
                    min-[320px]:px-3
                    min-[375px]:px-5
                    sm:px-10

                    py-1.5
                    min-[320px]:py-2
                    min-[375px]:py-2.5

                    rounded-md
                    min-[375px]:rounded-lg

                    bg-[#2E7D32]

                    text-white

                    text-[10px]
                    min-[320px]:text-xs
                    min-[375px]:text-sm

                    font-semibold

                    whitespace-nowrap

                    hover:bg-[#1B5E20]

                    transition

                    active:scale-95

                    disabled:opacity-50
                    disabled:cursor-not-allowed
                    disabled:active:scale-100

                    flex
                    items-center
                    justify-center
                    gap-1.5
                  "
                >
                  <CheckCircle className="w-3.5 h-3.5 min-[375px]:w-4 min-[375px]:h-4" />
                  Finish
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDED OVERLAY CLOSE */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={handleExpand}
        />
      )}
    </>
  );
}