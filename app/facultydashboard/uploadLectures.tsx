"use client";

import {
  Upload,
  X,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../lib/api";

interface UploadLecturesProps {
  onClose: () => void;
  nextStep: (lectureFiles: File[]) => void;
  initialFiles?: File[];
  vetSessionId?: string;
}

export default function UploadLectures({
  onClose,
  nextStep,
  initialFiles = [],
  vetSessionId,
}: UploadLecturesProps) {
  const [files, setFiles] = useState<File[]>(() => initialFiles);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);

  const [fileStatuses, setFileStatuses] = useState<
    Record<number, "pending" | "processing" | "done" | "failed">
  >({});

  const [progressMsg, setProgressMsg] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allowedExtensions = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected: File[] = Array.from(e.target.files || []);

    const invalid = selected.filter(
      (f) =>
        !allowedExtensions.some((ext) =>
          f.name.toLowerCase().endsWith(ext)
        )
    );

    if (invalid.length > 0) {
      alert(
        "Only PDF, DOC, DOCX, PPT, and PPTX files are allowed"
      );
      e.target.value = "";
      return;
    }

    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startIngestion = async () => {
    if (files.length === 0 || !vetSessionId) return;

    setIsProcessing(true);
    setIngestError(null);
    setIsComplete(false);

    const initialStatuses: Record<
      number,
      "pending" | "processing" | "done" | "failed"
    > = {};

    files.forEach((_, i) => {
      initialStatuses[i] = "pending";
    });

    setFileStatuses(initialStatuses);
    setProgressMsg("Uploading files...");


    const formData = new FormData();

    formData.append("session_id", vetSessionId);

    files.forEach((f) => {
      formData.append("files", f);
    });

    try {
      const token =
        localStorage.getItem("access_token") || "";

      const resp = await fetch(
        `${API_BASE_URL}/api/v1/analyzer/lectures/ingest`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await resp.json();

      if (data.status !== "ok") {
        throw new Error(
          data.detail || "Failed to start ingestion"
        );
      }

      pollRef.current = setInterval(async () => {
        try {
          const statusResp = await fetch(
            `${API_BASE_URL}/api/v1/analyzer/lectures/ingest-status/${vetSessionId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const status = await statusResp.json();

          if (status.status === "processing") {
            setProgressMsg(
              status.message || "Generating embeddings..."
            );

            const newStatuses: Record<
              number,
              "pending" | "processing" | "done" | "failed"
            > = {};

            files.forEach((_, i) => {
              if (i < status.completed_files) {
                newStatuses[i] = "done";
              } else if (
                i === status.completed_files
              ) {
                newStatuses[i] = "processing";
              } else {
                newStatuses[i] = "pending";
              }
            });

            setFileStatuses(newStatuses);
          } else if (status.status === "completed") {
            if (pollRef.current) {
              clearInterval(pollRef.current);
            }

            const newStatuses: Record<
              number,
              "pending" | "processing" | "done" | "failed"
            > = {};

            files.forEach((_, i) => {
              newStatuses[i] = "done";
            });

            setFileStatuses(newStatuses);

            setProgressMsg(
              status.message ||
                "Embeddings generated successfully!"
            );

            setIsComplete(true);
          } else if (status.status === "failed") {
            if (pollRef.current) {
              clearInterval(pollRef.current);
            }

            setIngestError(
              status.message ||
                "Embedding generation failed"
            );

            setIsProcessing(false);
          }
        } catch {
          // Continue polling
        }
      }, 1500);
    } catch (e: unknown) {
      setIngestError(
        e instanceof Error
          ? e.message
          : "Failed to start ingestion"
      );

      setIsProcessing(false);
    }
  };

  const handleNext = () => {
    if (files.length === 0) {
      alert(
        "Please upload at least one lecture or book file."
      );
      return;
    }

    nextStep(files);
  };

  const leftColumnFiles = files.slice(
    0,
    Math.ceil(files.length / 2)
  );

  const rightColumnFiles = files.slice(
    Math.ceil(files.length / 2)
  );

  const fileIcon = (
    status:
      | "pending"
      | "processing"
      | "done"
      | "failed"
      | undefined
  ) => {
    switch (status) {
      case "done":
        return (
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
        );

      case "processing":
        return (
          <Loader2 className="w-4 h-4 text-[#b300e8] animate-spin shrink-0" />
        );

      case "failed":
        return (
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
        );

      default:
        return null;
    }
  };

  const completedCount = Object.values(fileStatuses).filter(
    (s) => s === "done"
  ).length;

  const totalCount = files.length;

  const progressPercent =
    totalCount > 0
      ? Math.round(
          (completedCount / totalCount) * 100
        )
      : 0;

  return (
    <>
      {/* =========================================================
          OVERLAY
          ========================================================= */}
      <div className="fixed inset-0 bg-black/40 z-40" />

      {/* =========================================================
          MODAL WRAPPER
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
            MAIN MODAL
            ======================================================= */}
        <div
          className="
            bg-white

            rounded-xl
            min-[375px]:rounded-2xl
            sm:rounded-3xl

            p-2
            min-[320px]:p-3
            min-[375px]:p-4
            sm:p-6
            md:p-8
            lg:p-10

            w-full
            max-w-5xl
            min-w-0

            h-[calc(100vh-0.5rem)]
            min-[320px]:h-[calc(100vh-1rem)]
            min-[375px]:h-[calc(100vh-1.5rem)]
            sm:h-[calc(100vh-2rem)]

            shadow-xl

            border
            border-[#b300e8]

            overflow-hidden

            flex
            flex-col
          "
        >
          {/* =====================================================
              TITLE
              ===================================================== */}
          <h1
            className="
              shrink-0

              text-center

              text-lg
              min-[320px]:text-xl
              min-[375px]:text-2xl
              sm:text-3xl
              md:text-4xl

              mb-3
              min-[320px]:mb-4
              min-[375px]:mb-5
              sm:mb-8

              font-bold

              text-[#000000]

              leading-tight

              truncate
            "
          >
            Upload Lectures / Books
          </h1>

          {/* =====================================================
              PROCESSING SCREEN
              ===================================================== */}
          {isProcessing ? (
            <div
              className="
                flex-1
                flex
                flex-col

                min-h-0
                min-w-0
              "
            >
              {/* -------------------------------------------------
                  TOP PROCESSING SECTION
                  ------------------------------------------------- */}
              <div
                className="
                  shrink-0

                  flex
                  flex-col
                  items-center

                  gap-3
                  min-[375px]:gap-4
                  sm:gap-6

                  pb-3
                  min-[375px]:pb-4
                  sm:pb-6
                "
              >
                {/* Spinner */}

                <div
                  className={`
                    w-14
                    h-14

                    min-[320px]:w-16
                    min-[320px]:h-16

                    min-[375px]:w-20
                    min-[375px]:h-20

                    sm:w-24
                    sm:h-24

                    rounded-full

                    flex
                    items-center
                    justify-center

                    ${
                      isComplete
                        ? "bg-green-100"
                        : "bg-[#b300e8]/10"
                    }
                  `}
                >
                  {isComplete ? (
                    <span
                      className="
                        text-green-600

                        text-lg
                        min-[375px]:text-xl
                        sm:text-2xl

                        font-bold
                      "
                    >
                      OK
                    </span>
                  ) : (
                    <Loader2
                      className="
                        w-7
                        h-7

                        min-[320px]:w-8
                        min-[320px]:h-8

                        min-[375px]:w-10
                        min-[375px]:h-10

                        sm:w-12
                        sm:h-12

                        text-[#b300e8]
                        animate-spin
                      "
                    />
                  )}
                </div>

                {/* Heading */}

                <div className="text-center min-w-0 w-full">
                  <h2
                    className="
                      text-base
                      min-[320px]:text-lg
                      min-[375px]:text-xl
                      sm:text-2xl

                      font-bold

                      text-gray-800

                      mb-1
                      min-[375px]:mb-2
                    "
                  >
                    {isComplete
                      ? "Embeddings Generated"
                      : "Generating Embeddings"}
                  </h2>

                  <p
                    className="
                      text-xs
                      min-[375px]:text-sm

                      text-gray-500

                      break-words
                    "
                  >
                    {progressMsg}
                  </p>
                </div>

                {/* Progress */}

                <div
                  className="
                    w-full
                    max-w-md

                    min-w-0
                  "
                >
                  <div
                    className="
                      flex
                      justify-between

                      gap-2

                      text-[10px]
                      min-[320px]:text-xs
                      min-[375px]:text-sm

                      text-gray-500

                      mb-1
                    "
                  >
                    <span className="truncate">
                      {completedCount} of {totalCount} files
                      processed
                    </span>

                    <span className="shrink-0">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2 min-[375px]:h-3">
                    <div
                      className="
                        bg-[#b300e8]

                        h-2
                        min-[375px]:h-3

                        rounded-full

                        transition-all
                        duration-500
                      "
                      style={{
                        width: `${progressPercent}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Error */}

                {ingestError && (
                  <div
                    className="
                      bg-red-50
                      border
                      border-red-200

                      text-red-700

                      px-2
                      min-[320px]:px-3
                      min-[375px]:px-4

                      py-2
                      min-[375px]:py-3

                      rounded-lg

                      text-[10px]
                      min-[320px]:text-xs
                      min-[375px]:text-sm

                      w-full
                      max-w-md

                      break-words
                    "
                  >
                    {ingestError}
                  </div>
                )}
              </div>

              {/* -------------------------------------------------
                  SCROLLABLE FILE LIST
                  ------------------------------------------------- */}
              <div
                className="
                  flex-1
                  min-h-0
                  min-w-0

                  overflow-y-auto
                  overflow-x-hidden
                "
              >
                <div
                  className="
                    space-y-2

                    pr-1
                  "
                >
                  {files.map((file, i) => (
                    <div
                      key={i}
                      className="
                        flex
                        items-center

                        gap-2
                        min-[375px]:gap-3

                        bg-gray-50

                        px-2
                        min-[320px]:px-3
                        min-[375px]:px-4

                        py-2

                        rounded-lg

                        min-w-0
                      "
                    >
                      {fileIcon(fileStatuses[i])}

                      <span
                        className={`
                          text-xs
                          min-[375px]:text-sm

                          truncate

                          flex-1
                          min-w-0

                          ${
                            fileStatuses[i] ===
                            "processing"
                              ? "text-[#b300e8] font-medium"
                              : "text-gray-700"
                          }
                        `}
                      >
                        {file.name}
                      </span>

                      {fileStatuses[i] === "done" && (
                        <span className="text-[10px] min-[375px]:text-xs text-green-600 shrink-0">
                          Done
                        </span>
                      )}

                      {fileStatuses[i] === "processing" && (
                        <span className="text-[10px] min-[375px]:text-xs text-[#b300e8] shrink-0">
                          Processing...
                        </span>
                      )}

                      {fileStatuses[i] === "pending" && (
                        <span className="text-[10px] min-[375px]:text-xs text-gray-400 shrink-0">
                          Pending
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* =====================================================
               UPLOAD SCREEN
               ===================================================== */
            <div
              className="
                flex
                flex-col

                flex-1
                min-h-0
                min-w-0
              "
            >
              {/* -------------------------------------------------
                  UPLOAD AREA
                  ------------------------------------------------- */}
              <div
                className="
                  bg-[#b300e8]/5

                  rounded-lg

                  p-3
                  min-[320px]:p-4
                  min-[375px]:p-5
                  sm:p-8

                  mb-3
                  min-[375px]:mb-4
                  sm:mb-6

                  border-2
                  border-dashed
                  border-[#b300e8]

                  shrink-0
                "
              >
                <div
                  className="
                    flex
                    flex-col
                    items-center

                    gap-2
                    min-[375px]:gap-3
                    sm:gap-4
                  "
                >
                  <Upload
                    className="
                      w-6
                      h-6

                      min-[375px]:w-7
                      min-[375px]:h-7

                      sm:w-8
                      sm:h-8

                      text-[#b300e8]
                    "
                  />

                  <p
                    className="
                      text-[10px]
                      min-[320px]:text-xs
                      min-[375px]:text-sm

                      text-black

                      text-center

                      leading-relaxed
                    "
                  >
                    Browse and choose files
                    <br className="min-[375px]:hidden" />
                    {" "}
                    (PDF, DOC, DOCX, PPT, PPTX)
                  </p>

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <div
                      className="
                        w-9
                        h-9

                        min-[320px]:w-10
                        min-[320px]:h-10

                        min-[375px]:w-12
                        min-[375px]:h-12

                        bg-[#28a745]

                        rounded-full

                        flex
                        items-center
                        justify-center
                      "
                    >
                      <span
                        className="
                          text-white

                          text-xl
                          min-[375px]:text-2xl

                          font-bold
                        "
                      >
                        +
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* -------------------------------------------------
                  FILE LIST
                  ------------------------------------------------- */}
              <div
                className="
                  bg-white

                  rounded-lg

                  p-2
                  min-[320px]:p-3
                  min-[375px]:p-4
                  sm:p-6

                  mb-3
                  min-[375px]:mb-4
                  sm:mb-8

                  border
                  border-[#b300e8]

                  flex-1

                  min-h-0
                  min-w-0

                  overflow-y-auto
                  overflow-x-hidden
                "
              >
                {files.length === 0 ? (
                  <div
                    className="
                      flex
                      items-center
                      justify-center

                      h-full

                      text-gray-400

                      text-xs
                      min-[375px]:text-sm

                      text-center
                    "
                  >
                    No files added yet
                  </div>
                ) : (
                  <div
                    className="
                      grid
                      grid-cols-1
                      md:grid-cols-2

                      gap-2
                      min-[375px]:gap-3
                      sm:gap-8

                      min-h-full
                    "
                  >
                    {/* LEFT COLUMN */}

                    <div className="space-y-2 min-[375px]:space-y-3 min-w-0">
                      {leftColumnFiles.map((file, index) => (
                        <div
                          key={index}
                          className="
                            flex
                            items-center
                            justify-between

                            gap-2

                            bg-[#f6c400]/20

                            px-2
                            min-[320px]:px-3
                            min-[375px]:px-4

                            py-2
                            min-[375px]:py-3

                            rounded-lg

                            min-w-0
                          "
                        >
                          <span
                            className="
                              text-[10px]
                              min-[320px]:text-xs
                              min-[375px]:text-sm

                              font-medium

                              truncate

                              mr-1

                              text-black

                              min-w-0
                            "
                          >
                            {file.name}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeFile(index)
                            }
                            className="
                              shrink-0

                              w-6
                              h-6

                              flex
                              items-center
                              justify-center

                              rounded-full

                              hover:bg-white/60

                              transition
                            "
                          >
                            <X
                              className="
                                w-3.5
                                h-3.5

                                min-[375px]:w-4
                                min-[375px]:h-4

                                text-[#b300e8]
                              "
                            />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* RIGHT COLUMN */}

                    <div
                      className="
                        space-y-2
                        min-[375px]:space-y-3

                        min-w-0

                        md:border-l
                        md:border-[#b300e8]

                        md:pl-8
                      "
                    >
                      {rightColumnFiles.map((file, index) => (
                        <div
                          key={index}
                          className="
                            flex
                            items-center
                            justify-between

                            gap-2

                            bg-[#f6c400]/20

                            px-2
                            min-[320px]:px-3
                            min-[375px]:px-4

                            py-2
                            min-[375px]:py-3

                            rounded-lg

                            min-w-0
                          "
                        >
                          <span
                            className="
                              text-[10px]
                              min-[320px]:text-xs
                              min-[375px]:text-sm

                              font-medium

                              truncate

                              mr-1

                              text-black

                              min-w-0
                            "
                          >
                            {file.name}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeFile(
                                Math.ceil(
                                  files.length / 2
                                ) + index
                              )
                            }
                            className="
                              shrink-0

                              w-6
                              h-6

                              flex
                              items-center
                              justify-center

                              rounded-full

                              hover:bg-white/60

                              transition
                            "
                          >
                            <X
                              className="
                                w-3.5
                                h-3.5

                                min-[375px]:w-4
                                min-[375px]:h-4

                                text-[#b300e8]
                              "
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =====================================================
              BOTTOM BUTTONS
              ===================================================== */}
          <div
            className="
              flex

              flex-col
              min-[375px]:flex-row

              gap-2
              min-[375px]:gap-3
              sm:gap-6

              justify-center

              shrink-0

              w-full
            "
          >
            {/* BACK */}

            <button
              onClick={
                isProcessing ? undefined : onClose
              }
              disabled={isProcessing}
              className={`
                w-full
                min-[375px]:w-auto

                px-4
                min-[320px]:px-6
                min-[375px]:px-8
                sm:px-12

                py-2
                min-[375px]:py-2.5
                sm:py-3

                rounded-lg

                text-xs
                min-[375px]:text-sm

                whitespace-nowrap

                ${
                  isProcessing
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-[#b300e8] text-white"
                }
              `}
            >
              Back
            </button>

            {/* PROCESSING / NEXT */}

            {isProcessing && !isComplete ? (
              <button
                disabled
                className="
                  w-full
                  min-[375px]:w-auto

                  px-3
                  min-[320px]:px-4
                  min-[375px]:px-6
                  sm:px-12

                  py-2
                  min-[375px]:py-2.5
                  sm:py-3

                  bg-gray-300
                  text-gray-500

                  rounded-lg

                  text-xs
                  min-[375px]:text-sm

                  font-semibold

                  cursor-not-allowed

                  flex
                  items-center
                  justify-center

                  gap-2

                  whitespace-nowrap
                "
              >
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />

                <span className="truncate">
                  Generating Embeddings...
                </span>
              </button>
            ) : (
              <button
                onClick={
                  isComplete
                    ? handleNext
                    : startIngestion
                }
                className={`
                  w-full
                  min-[375px]:w-auto

                  px-3
                  min-[320px]:px-4
                  min-[375px]:px-6
                  sm:px-12

                  py-2
                  min-[375px]:py-2.5
                  sm:py-3

                  rounded-lg

                  text-xs
                  min-[375px]:text-sm

                  font-semibold

                  whitespace-nowrap

                  ${
                    files.length === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : isComplete
                      ? "bg-[#28a745] text-white"
                      : "bg-[#f6c400] text-black"
                  }
                `}
                disabled={files.length === 0}
              >
                {isComplete
                  ? "Next →"
                  : "Upload & Generate Embeddings"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}