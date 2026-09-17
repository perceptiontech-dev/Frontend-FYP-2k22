"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { readReportStream } from "./utils/streamParser";
import { API_BASE_URL } from "../lib/api";

interface MarksDivisionScreenProps {
  onNext?: () => void;
  onBack?: () => void;
  cisLink?: string | null;
  paperLink?: string | null;
  sessionId?: string | null;
  initialReport?: string;
  onReportChange?: (report: string) => void;
}

export default function MarksDivisionScreen({
  onNext,
  onBack,
  cisLink,
  paperLink,
  sessionId,
  initialReport = "",
  onReportChange,
}: MarksDivisionScreenProps) {
  const [report, setReport] = React.useState(initialReport);
  const [isLoading, setIsLoading] = React.useState(false);

  const controllerRef =
    React.useRef<AbortController | null>(null);

  const generateReport = async (
    signal: AbortSignal
  ) => {
    setIsLoading(true);
    setReport("");


    try {
      const token =
        localStorage.getItem("access_token") || "";

      const response = await fetch(
        `${API_BASE_URL}/api/v1/analyzer/reports/mark-division`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cis_link: cisLink,
            paper_link: paperLink,
            session_id: sessionId || null,
          }),
          signal,
        }
      );

      if (!response.ok) {
        throw new Error(
          `Server error ${response.status}`
        );
      }

      const fullReport = await readReportStream(
        response,
        signal,
        (text) => setReport(text)
      );

      if (!signal.aborted) {
        onReportChange?.(fullReport);
      }
    } catch (error: any) {
      if (error.name === "AbortError") return;

      console.error(
        "MarksDivision error:",
        error
      );

      setReport(
        "Error generating report. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    controllerRef.current?.abort();

    const controller =
      new AbortController();

    controllerRef.current = controller;

    generateReport(controller.signal);
  };

  React.useEffect(() => {
    if (initialReport) return;

    const controller =
      new AbortController();

    controllerRef.current = controller;

    if (cisLink && paperLink) {
      generateReport(controller.signal);
    }

    return () => controller.abort();
  }, [cisLink, paperLink]);

  return (
    <>
      {/* =====================================================
          BACKDROP
          ===================================================== */}
      <div className="fixed inset-0 bg-black/40 z-40" />

      {/* =====================================================
          MODAL WRAPPER
          Responsive from 300px
          ===================================================== */}
      <div
        className="
          fixed inset-0 z-50
          flex items-center justify-center
          overflow-y-auto
          p-1
          min-[320px]:p-2
          min-[375px]:p-3
          sm:p-4
          md:p-6
        "
      >
        {/* ===================================================
            MAIN MODAL
            =================================================== */}
        <div
          className="
            bg-white
            rounded-xl
            min-[375px]:rounded-2xl
            sm:rounded-3xl
            w-full
            max-w-5xl
            h-[calc(100vh-0.5rem)]
            min-[320px]:h-[calc(100vh-1rem)]
            min-[375px]:h-[calc(100vh-1.5rem)]
            sm:h-[calc(100vh-2rem)]
            shadow-xl
            overflow-hidden
            flex
          "
        >
          {/* =================================================
              INNER CONTENT
              ================================================= */}
          <div
            className="
              flex-1
              min-w-0
              min-h-0
              p-1
              min-[320px]:p-2
              min-[375px]:p-3
              sm:p-4
            "
          >
            {/* =================================================
                PURPLE CONTAINER
                ================================================= */}
            <div
              className="
                rounded-lg
                min-[375px]:rounded-2xl
                sm:rounded-3xl
                p-2
                min-[320px]:p-3
                min-[375px]:p-4
                h-full
                flex
                flex-col
                min-h-0
              "
              style={{
                backgroundColor: "#f2e6fa",
              }}
            >
              {/* =================================================
                  TITLE
                  ================================================= */}
              <h1
                className="
                  text-base
                  min-[320px]:text-lg
                  min-[375px]:text-xl
                  sm:text-2xl
                  font-bold
                  text-gray-800
                  mb-2
                  min-[375px]:mb-3
                  sm:mb-4
                  text-center
                  shrink-0
                "
              >
                Marks Division
              </h1>

              {/* =================================================
                  REPORT CONTAINER
                  ================================================= */}
              <div
                className="
                  flex-1
                  min-h-0
                  bg-white
                  rounded-lg
                  min-[375px]:rounded-xl
                  sm:rounded-2xl
                  p-2
                  min-[320px]:p-3
                  min-[375px]:p-4
                  relative
                  mb-2
                  min-[375px]:mb-3
                  sm:mb-4
                  overflow-y-auto
                  overflow-x-auto
                  shadow-sm
                "
              >
                {/* Report Heading */}
                <h2
                  className="
                    text-center
                    text-sm
                    min-[320px]:text-base
                    min-[375px]:text-lg
                    font-bold
                    mb-2
                    min-[375px]:mb-3
                    text-black
                  "
                >
                  REPORT
                </h2>

                {/* Report Content */}
                <div
                  className="
                    text-black
                    text-xs
                    min-[320px]:text-sm
                    markdown-content
                    min-w-0
                    break-words
                    leading-relaxed
                  "
                >
                  {isLoading && !report ? (
                    <div
                      className="
                        flex
                        items-center
                        justify-center
                        h-24
                        min-[375px]:h-32
                      "
                    >
                      <p
                        className="
                          animate-pulse
                          text-gray-500
                          text-xs
                          min-[375px]:text-sm
                          text-center
                        "
                      >
                        Generating Report...
                      </p>
                    </div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[
                        remarkGfm,
                        remarkMath,
                      ]}
                      rehypePlugins={[
                        rehypeKatex,
                      ]}
                    >
                      {report}
                    </ReactMarkdown>
                  )}
                </div>
              </div>

              {/* =================================================
                  BUTTONS
                  Responsive at 300px
                  ================================================= */}
              <div
                className="
                  mt-auto
                  grid
                  grid-cols-3
                  gap-1
                  min-[320px]:gap-2
                  min-[375px]:gap-3
                  sm:flex
                  sm:justify-between
                  sm:items-center
                  shrink-0
                "
              >
                {/* BACK */}
                <button
                  onClick={onBack}
                  className="
                    w-full
                    sm:w-auto
                    px-2
                    min-[320px]:px-3
                    min-[375px]:px-5
                    sm:px-8
                    py-1.5
                    min-[375px]:py-2
                    text-white
                    rounded-md
                    min-[375px]:rounded-lg
                    text-[11px]
                    min-[320px]:text-xs
                    min-[375px]:text-sm
                    font-medium
                    whitespace-nowrap
                    transition
                    hover:opacity-90
                    active:scale-95
                  "
                  style={{
                    backgroundColor:
                      "#b300e8",
                  }}
                >
                  Back
                </button>

                {/* REGENERATE */}
                <button
                  onClick={handleRegenerate}
                  disabled={isLoading}
                  className="
                    w-full
                    sm:w-auto
                    flex
                    items-center
                    justify-center
                    gap-1
                    min-[375px]:gap-2
                    px-1
                    min-[320px]:px-2
                    min-[375px]:px-4
                    sm:px-6
                    py-1.5
                    min-[375px]:py-2
                    text-white
                    rounded-md
                    min-[375px]:rounded-lg
                    text-[10px]
                    min-[320px]:text-xs
                    min-[375px]:text-sm
                    font-medium
                    whitespace-nowrap
                    disabled:opacity-50
                    transition
                    hover:opacity-90
                    active:scale-95
                  "
                  style={{
                    backgroundColor:
                      "#374151",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="
                      w-3
                      h-3
                      min-[375px]:w-4
                      min-[375px]:h-4
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
                    {isLoading
                      ? "Generating..."
                      : "Regenerate"}
                  </span>
                </button>

                {/* NEXT */}
                <button
                  onClick={onNext}
                  className="
                    w-full
                    sm:w-auto
                    px-2
                    min-[320px]:px-3
                    min-[375px]:px-5
                    sm:px-8
                    py-1.5
                    min-[375px]:py-2
                    text-black
                    rounded-md
                    min-[375px]:rounded-lg
                    text-[11px]
                    min-[320px]:text-xs
                    min-[375px]:text-sm
                    font-medium
                    whitespace-nowrap
                    transition
                    hover:opacity-90
                    active:scale-95
                  "
                  style={{
                    backgroundColor:
                      "#f6c400",
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}