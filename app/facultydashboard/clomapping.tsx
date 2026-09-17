"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { readReportStream } from "./utils/streamParser";

interface VETScreen4Props {
  onNext?: () => void;
  onBack?: () => void;
  cisLink?: string | null;
  paperLink?: string | null;
  sessionId?: string | null;
  initialReport?: string;
  onReportChange?: (report: string) => void;
}

export default function VETScreen4({
  onNext,
  onBack,
  cisLink,
  paperLink,
  sessionId,
  initialReport = "",
  onReportChange,
}: VETScreen4Props) {
  const [report, setReport] = React.useState(initialReport);
  const [isLoading, setIsLoading] = React.useState(false);
  const controllerRef =
    React.useRef<AbortController | null>(null);

  const generateReport = async (signal: AbortSignal) => {
    setIsLoading(true);
    setReport("");

    const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

    try {
      const token =
        localStorage.getItem("access_token") || "";

      const response = await fetch(
        `${API_BASE_URL}/api/v1/analyzer/reports/clo-mapping`,
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
        "CLOMapping error:",
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

    const controller = new AbortController();

    controllerRef.current = controller;

    generateReport(controller.signal);
  };

  React.useEffect(() => {
    if (initialReport) return;

    const controller = new AbortController();

    controllerRef.current = controller;

    if (cisLink && paperLink) {
      generateReport(controller.signal);
    }

    return () => controller.abort();
  }, [cisLink, paperLink]);

  return (
    <>
      {/* BACKDROP */}
      <div className="fixed inset-0 bg-black/40 z-40" />

      {/* MODAL WRAPPER */}
      <div
        className="
          fixed inset-0
          z-50
          flex items-center justify-center
          overflow-y-auto
          px-2
          py-2
          min-[320px]:px-3
          min-[320px]:py-3
          sm:px-4
          sm:py-6
        "
      >
        {/* MAIN MODAL */}
        <div
          className="
            bg-white
            rounded-2xl
            min-[320px]:rounded-3xl
            shadow-xl
            overflow-hidden
            flex
            flex-col
            w-full
            max-w-5xl

            h-[calc(100vh-1rem)]
            min-[320px]:h-[calc(100vh-1.5rem)]
            sm:h-[calc(100vh-3rem)]
          "
        >
          {/* CONTENT */}
          <div
            className="
              flex-1
              min-h-0
              p-2
              min-[320px]:p-3
              sm:p-6
            "
          >
            {/* PURPLE PANEL */}
            <div
              className="
                rounded-xl
                min-[320px]:rounded-2xl
                sm:rounded-3xl

                p-2.5
                min-[320px]:p-3
                sm:p-6

                h-full
                flex
                flex-col
                min-h-0
              "
              style={{
                backgroundColor: "#f2e6fa",
              }}
            >
              {/* TITLE */}
              <h1
                className="
                  text-lg
                  min-[320px]:text-xl
                  sm:text-2xl

                  font-bold
                  text-gray-800

                  mb-2
                  min-[320px]:mb-3
                  sm:mb-4

                  text-center
                  leading-tight
                  shrink-0
                "
              >
                CLO Mapping
              </h1>

              {/* REPORT */}
              <div
                className="
                  flex-1
                  bg-white

                  rounded-xl
                  min-[320px]:rounded-2xl

                  p-2.5
                  min-[320px]:p-3
                  sm:p-5

                  relative

                  mb-2
                  min-[320px]:mb-3
                  sm:mb-5

                  overflow-y-auto
                  overflow-x-hidden

                  min-h-0
                "
              >
                {/* REPORT TITLE */}
                <h2
                  className="
                    text-center
                    text-sm
                    min-[320px]:text-base
                    sm:text-lg

                    font-bold
                    mb-2
                    min-[320px]:mb-3

                    text-black
                  "
                >
                  REPORT
                </h2>

                {/* REPORT CONTENT */}
                <div
                  className="
                    text-black

                    text-xs
                    min-[320px]:text-sm

                    markdown-content

                    break-words
                    overflow-x-hidden
                  "
                >
                  {isLoading && !report ? (
                    <div
                      className="
                        flex
                        items-center
                        justify-center

                        h-24
                        min-[320px]:h-28
                        sm:h-32
                      "
                    >
                      <p className="animate-pulse text-gray-500 text-center">
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

              {/* ACTION BUTTONS */}
              <div
                className="
                  flex
                  flex-col

                  min-[360px]:flex-row

                  justify-between
                  items-stretch

                  min-[360px]:items-center

                  gap-2
                  min-[360px]:gap-3

                  shrink-0
                "
              >
                {/* BACK */}
                <button
                  onClick={onBack}
                  className="
                    w-full
                    min-[360px]:w-auto

                    px-4
                    min-[360px]:px-6
                    sm:px-10

                    py-2
                    min-[360px]:py-2.5

                    text-white

                    text-xs
                    min-[360px]:text-sm

                    rounded-lg

                    transition
                    hover:opacity-90
                  "
                  style={{
                    backgroundColor: "#b300e8",
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
                    min-[360px]:w-auto

                    flex
                    items-center
                    justify-center

                    gap-1.5
                    min-[360px]:gap-2

                    px-3
                    min-[360px]:px-4
                    sm:px-6

                    py-2
                    min-[360px]:py-2.5

                    text-white

                    text-xs
                    min-[360px]:text-sm

                    rounded-lg

                    disabled:opacity-50

                    transition
                    hover:opacity-90
                  "
                  style={{
                    backgroundColor: "#374151",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="
                      w-3.5
                      h-3.5

                      min-[360px]:w-4
                      min-[360px]:h-4

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

                  <span>
                    {isLoading
                      ? "Generating..."
                      : "Regenerate"}
                  </span>
                </button>

                {/* NEXT */}
                {onNext && (
                  <button
                    onClick={onNext}
                    className="
                      w-full
                      min-[360px]:w-auto

                      px-4
                      min-[360px]:px-6
                      sm:px-10

                      py-2
                      min-[360px]:py-2.5

                      text-black

                      text-xs
                      min-[360px]:text-sm

                      rounded-lg

                      transition
                      hover:opacity-90
                    "
                    style={{
                      backgroundColor: "#f6c400",
                    }}
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}