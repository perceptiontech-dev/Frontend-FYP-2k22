"use client";

import { useState } from "react";
import { API_BASE_URL } from "../lib/api";

interface UploadPaperProps {
  onClose: () => void;
  nextStep?: (
    link: string,
    path: string,
    file: File,
    type: string
  ) => void;
  initialFile?: File | null;
  initialPaperType?: string;
  initialPaperLink?: string | null;
  initialFilePath?: string | null;
}

export default function UploadPaper({
  onClose,
  nextStep,
  initialFile,
  initialPaperType = "",
  initialPaperLink,
  initialFilePath,
}: UploadPaperProps) {
  const [paperType, setPaperType] = useState(initialPaperType);
  const [filesLeft, setFilesLeft] = useState<File[]>(
    () => (initialFile ? [initialFile] : [])
  );
  const [filesRight, setFilesRight] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const allowedExtensions = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    side: "left" | "right"
  ) => {
    if (!e.target.files) return;

    const file = Array.from(e.target.files)[0];

    if (!file) return;

    if (
      !allowedExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      )
    ) {
      alert("Only PDF, DOC, DOCX, PPT, and PPTX files are allowed");
      e.target.value = "";
      return;
    }

    if (side === "left") {
      setFilesLeft([file]);
    } else {
      setFilesRight([file]);
    }

    e.target.value = "";
  };

  const removeFile = (side: "left" | "right") => {
    if (side === "left") {
      setFilesLeft([]);
    } else {
      setFilesRight([]);
    }
  };

  const handleNext = async () => {
    const file = filesLeft[0] || filesRight[0];

    if (!file) {
      alert("Please upload a paper first.");
      return;
    }

    if (!paperType) {
      alert("Please select a paper type.");
      return;
    }

    // Reuse already uploaded file
    if (file === initialFile && initialPaperLink && initialFilePath) {
      nextStep?.(
        initialPaperLink,
        initialFilePath,
        file,
        paperType
      );
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);


    try {
      const token =
        localStorage.getItem("access_token") || "";

      const response = await fetch(
        `${API_BASE_URL}/api/v1/paper/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      nextStep?.(
        data.paper_link,
        data.file_path,
        file,
        paperType
      );
    } catch (error) {
      console.error("Error uploading paper:", error);
      alert("Failed to upload paper. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const hasFiles =
    filesLeft.length > 0 || filesRight.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-4 min-[300px]:px-3 max-[300px]:px-1">

      {/* OUTER WHITE LAYER */}
      <div
        className="
          bg-white
          rounded-2xl
          p-3
          w-full
          max-w-5xl
          h-[calc(100vh-2rem)]
          max-h-[900px]
          overflow-hidden
          flex
          items-center
          justify-center

          max-[300px]:rounded-xl
          max-[300px]:p-1
          max-[300px]:h-[calc(100vh-0.5rem)]
        "
      >

        {/* MIDDLE PURPLE LAYER */}
        <div
          className="
            bg-purple-100
            rounded-3xl
            p-4
            md:p-6
            w-full
            h-full
            overflow-hidden
            flex
            items-center
            justify-center

            max-[300px]:rounded-lg
            max-[300px]:p-1
          "
        >

          {/* INNER WHITE CONTENT */}
          <div
            className="
              bg-white
              rounded-2xl
              p-6
              md:p-8
              w-full
              max-w-5xl
              h-full
              overflow-y-auto
              shadow-xl
              border
              border-[#b300e8]

              max-[300px]:rounded-lg
              max-[300px]:p-2
              max-[300px]:shadow-md
            "
          >

            {/* HEADING */}
            <h2
              className="
                text-center
                text-[26px]
                font-bold
                mb-6
                text-black

                max-[300px]:text-[17px]
                max-[300px]:mb-3
              "
            >
              Upload Paper
            </h2>

            {/* PAPER TYPE */}
            <select
              className="
                w-full
                mb-6
                p-3
                border
                border-[#b300e8]
                rounded
                bg-white
                text-black
                font-semibold
                outline-none

                max-[300px]:mb-3
                max-[300px]:p-2
                max-[300px]:text-[11px]
                max-[300px]:rounded-md
              "
              value={paperType}
              onChange={(e) =>
                setPaperType(e.target.value)
              }
            >
              <option value="" disabled>
                Select Paper Type
              </option>
              <option value="midterm">Midterm</option>
              <option value="final">Final</option>
            </select>

            {/* FILE UPLOAD BOX */}
            <label
              className="
                w-full
                min-h-44
                border-2
                border-dashed
                border-[#b300e8]
                rounded
                flex
                flex-col
                items-center
                justify-center
                cursor-pointer
                bg-purple-50
                mb-6
                p-4
                text-center

                max-[300px]:min-h-[105px]
                max-[300px]:mb-3
                max-[300px]:p-2
                max-[300px]:rounded-md
              "
            >
              <span
                className="
                  text-black
                  font-bold

                  max-[300px]:text-[9px]
                  max-[300px]:leading-3
                  max-[300px]:max-w-[220px]
                "
              >
                Browse and choose files
                <br />
                (PDF, DOC, DOCX, PPT, PPTX)
              </span>

              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                className="hidden"
                onChange={(e) =>
                  handleFileUpload(e, "left")
                }
              />

              <div
                className="
                  mt-2
                  bg-green-500
                  text-black
                  px-3
                  py-1
                  rounded
                  font-bold

                  max-[300px]:mt-2
                  max-[300px]:px-2
                  max-[300px]:py-0.5
                  max-[300px]:text-sm
                  max-[300px]:rounded
                "
              >
                +
              </div>
            </label>

            {/* FILE PREVIEW */}
            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                gap-4
                max-h-56
                overflow-y-auto
                mb-6

                max-[300px]:gap-2
                max-[300px]:max-h-[130px]
                max-[300px]:mb-3
              "
            >

              {/* LEFT FILE BOX */}
              <div
                className="
                  bg-purple-50
                  p-3
                  rounded
                  shadow-inner
                  min-w-0

                  max-[300px]:p-1.5
                  max-[300px]:rounded-md
                "
              >
                {filesLeft.length === 0 ? (
                  <p
                    className="
                      text-gray-400
                      text-xs
                      text-center

                      max-[300px]:text-[8px]
                    "
                  >
                    No paper selected
                  </p>
                ) : (
                  filesLeft.map((file) => (
                    <div
                      key={file.name}
                      className="
                        flex
                        justify-between
                        items-center
                        gap-2
                        p-2
                        border-b
                        border-gray-200

                        max-[300px]:p-1
                      "
                    >
                      <span
                        className="
                          text-sm
                          text-black
                          truncate
                          min-w-0

                          max-[300px]:text-[9px]
                        "
                      >
                        {file.name}
                      </span>

                      <button
                        type="button"
                        className="
                          text-red-500
                          hover:text-red-700
                          font-bold
                          shrink-0

                          max-[300px]:text-xs
                        "
                        onClick={() =>
                          removeFile("left")
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* RIGHT FILE BOX */}
              <div
                className="
                  bg-purple-50
                  p-3
                  rounded
                  shadow-inner
                  min-w-0

                  max-[300px]:p-1.5
                  max-[300px]:rounded-md
                "
              >
                {filesRight.length === 0 ? (
                  <p
                    className="
                      text-gray-400
                      text-xs
                      text-center

                      max-[300px]:text-[8px]
                    "
                  >
                    Optional
                  </p>
                ) : (
                  filesRight.map((file) => (
                    <div
                      key={file.name}
                      className="
                        flex
                        justify-between
                        items-center
                        gap-2
                        p-2
                        border-b
                        border-gray-200

                        max-[300px]:p-1
                      "
                    >
                      <span
                        className="
                          text-sm
                          text-black
                          truncate
                          min-w-0

                          max-[300px]:text-[9px]
                        "
                      >
                        {file.name}
                      </span>

                      <button
                        type="button"
                        className="
                          text-red-500
                          hover:text-red-700
                          font-bold
                          shrink-0

                          max-[300px]:text-xs
                        "
                        onClick={() =>
                          removeFile("right")
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* NAVIGATION BUTTONS */}
            <div
              className="
                flex
                justify-between
                items-center
                mt-6

                max-[300px]:mt-3
                max-[300px]:gap-2
              "
            >
              <button
                type="button"
                className="
                  bg-yellow-400
                  text-black
                  px-6
                  py-2
                  rounded
                  font-bold
                  hover:opacity-90
                  transition

                  max-[300px]:px-3
                  max-[300px]:py-1.5
                  max-[300px]:text-[10px]
                  max-[300px]:rounded-md
                "
                onClick={onClose}
              >
                Back
              </button>

              <button
                type="button"
                className="
                  bg-[#b300e8]
                  text-white
                  px-6
                  py-2
                  rounded
                  font-bold
                  hover:opacity-90
                  transition
                  disabled:opacity-50
                  disabled:cursor-not-allowed

                  max-[300px]:px-3
                  max-[300px]:py-1.5
                  max-[300px]:text-[10px]
                  max-[300px]:rounded-md
                "
                onClick={handleNext}
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Next"}
              </button>
            </div>

            {/* SMALL SCREEN STATUS */}
            {!hasFiles && (
              <p
                className="
                  hidden
                  max-[300px]:block
                  text-center
                  text-gray-400
                  text-[8px]
                  mt-2
                "
              >
                Upload one paper to continue
              </p>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}