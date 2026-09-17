"use client";

import {
  useState,
  ChangeEvent,
  DragEvent,
  FormEvent,
} from "react";

interface UploadCISProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface CISFormData {
  name: string;
  department: string;
  code: string;
  semester: string;
  file: File | null;
}

export default function UploadCIS({
  onClose,
  onSuccess,
}: UploadCISProps) {
  const [formData, setFormData] = useState<CISFormData>({
    name: "",
    department: "",
    code: "",
    semester: "",
    file: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  const allowedExtensions = [
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
  ];

  /* =========================================================
     FILE VALIDATION
  ========================================================= */

  const isValidFile = (file: File) => {
    const name = file.name.toLowerCase();

    return allowedExtensions.some((ext) =>
      name.endsWith(ext)
    );
  };

  const isValidFileSize = (file: File) => {
    return file.size <= 10 * 1024 * 1024;
  };

  /* =========================================================
     INPUT STYLING
  ========================================================= */

  const inputClass = (hasError: boolean) =>
    [
      "w-full min-w-0",
      "h-11",
      "px-3.5",
      "rounded-xl",
      "border",
      "text-sm",
      "font-medium",
      "outline-none",
      "transition-all",
      "bg-white dark:bg-[#0F172A]",
      "text-[#111827] dark:text-[#F8FAFC]",
      "placeholder:text-slate-400 dark:placeholder:text-slate-500",
      "shadow-sm",
      "focus:ring-4 focus:ring-emerald-500/10",
      hasError
        ? "border-red-500 focus:border-red-500"
        : "border-slate-300 dark:border-white/[0.12] focus:border-emerald-500 dark:focus:border-emerald-400",
    ].join(" ");

  const labelClass =
    "block text-xs sm:text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]";

  const errorClass =
    "text-red-600 dark:text-red-400 text-xs font-semibold leading-4";

  /* =========================================================
     SET FORM FIELD
  ========================================================= */

  const set = (
    key: keyof CISFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));

    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  /* =========================================================
     VALIDATION
  ========================================================= */

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) {
      errs.name = "CIS name is required";
    }

    if (!formData.department.trim()) {
      errs.department = "Department is required";
    }

    if (!formData.code.trim()) {
      errs.code = "Course code is required";
    }

    if (!formData.semester) {
      errs.semester = "Select a semester";
    }

    if (!formData.file) {
      errs.file = "Please select a CIS document";
    } else if (!isValidFile(formData.file)) {
      errs.file =
        "Only PDF, DOC, DOCX, PPT, and PPTX files are allowed";
    } else if (!isValidFileSize(formData.file)) {
      errs.file = "File must be smaller than 10MB";
    }

    setErrors(errs);

    return Object.keys(errs).length === 0;
  };

  /* =========================================================
     FILE CHANGE
  ========================================================= */

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!isValidFile(file)) {
      setErrors((prev) => ({
        ...prev,
        file:
          "Only PDF, DOC, DOCX, PPT, and PPTX files are allowed",
      }));

      e.target.value = "";
      return;
    }

    if (!isValidFileSize(file)) {
      setErrors((prev) => ({
        ...prev,
        file: "File must be smaller than 10MB",
      }));

      e.target.value = "";
      return;
    }

    setFormData((prev) => ({
      ...prev,
      file,
    }));

    setErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });
  };

  /* =========================================================
     DRAG & DROP
  ========================================================= */

  const handleDrop = (
    e: DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];

    if (!file) return;

    if (!isValidFile(file)) {
      setErrors((prev) => ({
        ...prev,
        file:
          "Only PDF, DOC, DOCX, PPT, and PPTX files are allowed",
      }));

      return;
    }

    if (!isValidFileSize(file)) {
      setErrors((prev) => ({
        ...prev,
        file: "File must be smaller than 10MB",
      }));

      return;
    }

    setFormData((prev) => ({
      ...prev,
      file,
    }));

    setErrors((prev) => {
      const next = { ...prev };
      delete next.file;
      return next;
    });
  };

  const handleDragOver = (
    e: DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (isUploading) return;

    if (!validate()) return;

    setIsUploading(true);

    try {
      const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

      const payload = new FormData();

      payload.append(
        "course_name",
        formData.name
      );

      payload.append(
        "department",
        formData.department
      );

      payload.append(
        "course_id",
        formData.code
      );

      if (formData.semester) {
        payload.append(
          "semester",
          formData.semester
        );
      }

      if (formData.file) {
        payload.append(
          "file",
          formData.file
        );
      }

      const token =
        localStorage.getItem("access_token") || "";

      const response = await fetch(
        `${API_BASE_URL}/api/v1/cis/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: payload,
        }
      );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to upload CIS"
        );
      }

      onSuccess?.();

      handleCancel();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to upload CIS"
      );
    } finally {
      setIsUploading(false);
    }
  };

  /* =========================================================
     CANCEL
  ========================================================= */

  const handleCancel = () => {
    setFormData({
      name: "",
      department: "",
      code: "",
      semester: "",
      file: null,
    });

    setErrors({});

    onClose();
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      className="
        relative
        w-full
        max-w-[720px]
        min-w-0
        max-h-[96dvh]
        sm:max-h-[92vh]
        overflow-hidden
        rounded-2xl
        sm:rounded-3xl
        border
        border-emerald-200/80
        dark:border-emerald-500/20
        bg-white
        dark:bg-[#0B1220]
        shadow-[0_25px_80px_rgba(15,23,42,0.20)]
        dark:shadow-[0_25px_90px_rgba(0,0,0,0.55)]
        flex
        flex-col
      "
    >

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div
        className="
          relative
          shrink-0
          px-4
          pt-6
          pb-4
          sm:px-6
          sm:pt-7
          sm:pb-5
          border-b
          border-slate-200
          dark:border-white/[0.08]
          bg-gradient-to-b
          from-emerald-50/80
          via-white
          to-white
          dark:from-[#0B1220]
          dark:via-[#0B1220]
          dark:to-[#0B1220]
        "
      >
        <div className="flex items-start justify-between gap-4">

          {/* LEFT HEADER */}

          <div className="flex min-w-0 items-center gap-3.5">

            {/* CLEAN ICON */}

            <div
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                text-emerald-600
                dark:text-emerald-400
              "
            >
              <span
                className="
                  material-symbols-outlined
                  text-[32px]
                "
              >
                upload_file
              </span>
            </div>

            {/* TITLE */}

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <h2
                  className="
                    text-lg
                    sm:text-xl
                    font-bold
                    tracking-tight
                    text-[#0F172A]
                    dark:text-[#F8FAFC]
                  "
                >
                  Upload CIS
                </h2>

                <span
                  className="
                    inline-flex
                    rounded-full
                    bg-emerald-100
                    px-2.5
                    py-1
                    text-[9px]
                    font-extrabold
                    uppercase
                    tracking-[0.12em]
                    text-emerald-800
                    dark:bg-emerald-500/15
                    dark:text-emerald-300
                  "
                >
                  Course Document
                </span>

              </div>

              <p
                className="
                  mt-1
                  text-xs
                  sm:text-sm
                  font-medium
                  leading-5
                  text-slate-600
                  dark:text-slate-300
                "
              >
                Add a new course information sheet to your institution
              </p>

            </div>

          </div>

          {/* CLOSE BUTTON */}

          <button
            type="button"
            onClick={handleCancel}
            disabled={isUploading}
            className="
              relative
              shrink-0
              flex
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              text-slate-600
              transition-colors
              hover:bg-emerald-100
              hover:text-emerald-800
              dark:text-slate-300
              dark:hover:bg-white/[0.06]
              dark:hover:text-emerald-300
              disabled:cursor-not-allowed
              disabled:opacity-50
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
          FORM
      ====================================================== */}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="
          relative
          min-h-0
          flex-1
          overflow-y-auto
          overflow-x-hidden
          px-4
          py-5
          sm:px-6
          sm:py-6
        "
      >
        <div className="space-y-6">

          {/* =================================================
              COURSE INFORMATION
          ================================================== */}

          <section>

            {/* SECTION HEADER */}

            <div className="mb-4 flex items-center gap-3">

              <div
                className="
                  h-7
                  w-1
                  rounded-full
                  bg-emerald-600
                  dark:bg-emerald-400
                "
              />

              <div>

                <h3
                  className="
                    text-sm
                    font-bold
                    text-[#111827]
                    dark:text-white
                  "
                >
                  Course Information
                </h3>

                <p
                  className="
                    mt-0.5
                    text-xs
                    font-medium
                    text-slate-600
                    dark:text-slate-300
                  "
                >
                  Enter the basic information for this CIS.
                </p>

              </div>

            </div>

            {/* FORM GRID */}

            <div
              className="
                grid
                grid-cols-1
                gap-x-4
                gap-y-4
                sm:grid-cols-2
              "
            >

              {/* CIS NAME */}

              <div className="space-y-1.5">

                <label
                  htmlFor="cis-name"
                  className={labelClass}
                >
                  CIS Name
                </label>

                <input
                  id="cis-name"
                  className={inputClass(
                    !!errors.name
                  )}
                  placeholder="e.g. Computer Networks CIS"
                  value={formData.name}
                  onChange={(e) =>
                    set(
                      "name",
                      e.target.value
                    )
                  }
                  type="text"
                />

                {errors.name && (
                  <span className={errorClass}>
                    {errors.name}
                  </span>
                )}

              </div>

              {/* DEPARTMENT */}

              <div className="space-y-1.5">

                <label
                  htmlFor="department"
                  className={labelClass}
                >
                  Department
                </label>

                <input
                  id="department"
                  className={inputClass(
                    !!errors.department
                  )}
                  placeholder="e.g. Computer Science"
                  value={formData.department}
                  onChange={(e) =>
                    set(
                      "department",
                      e.target.value
                    )
                  }
                  type="text"
                />

                {errors.department && (
                  <span className={errorClass}>
                    {errors.department}
                  </span>
                )}

              </div>

              {/* COURSE CODE */}

              <div className="space-y-1.5">

                <label
                  htmlFor="course-code"
                  className={labelClass}
                >
                  Course Code
                </label>

                <input
                  id="course-code"
                  className={inputClass(
                    !!errors.code
                  )}
                  placeholder="e.g. CS-301"
                  value={formData.code}
                  onChange={(e) =>
                    set(
                      "code",
                      e.target.value
                    )
                  }
                  type="text"
                />

                {errors.code && (
                  <span className={errorClass}>
                    {errors.code}
                  </span>
                )}

              </div>

              {/* SEMESTER */}

              <div className="space-y-1.5">

                <label
                  htmlFor="semester"
                  className={labelClass}
                >
                  Semester
                </label>

                <div className="relative">

                  <select
                    id="semester"
                    className={`
                      ${inputClass(
                        !!errors.semester
                      )}
                      appearance-none
                      pr-10
                      cursor-pointer
                    `}
                    value={formData.semester}
                    onChange={(e) =>
                      set(
                        "semester",
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select semester...
                    </option>

                    {[1, 2, 3, 4, 5, 6, 7, 8].map(
                      (n) => (
                        <option
                          key={n}
                          value={String(n)}
                        >
                          Semester {n}
                        </option>
                      )
                    )}

                  </select>

                  <span
                    className="
                      pointer-events-none
                      material-symbols-outlined
                      absolute
                      right-3
                      top-1/2
                      -translate-y-1/2
                      text-[20px]
                      text-slate-600
                      dark:text-slate-300
                    "
                  >
                    expand_more
                  </span>

                </div>

                {errors.semester && (
                  <span className={errorClass}>
                    {errors.semester}
                  </span>
                )}

              </div>

            </div>
          </section>

          {/* =================================================
              DOCUMENT UPLOAD
          ================================================== */}

          <section>

            {/* SECTION HEADER */}

            <div className="mb-4 flex items-center gap-3">

              <div
                className="
                  h-7
                  w-1
                  rounded-full
                  bg-emerald-600
                  dark:bg-emerald-400
                "
              />

              <div>

                <h3
                  className="
                    text-sm
                    font-bold
                    text-[#111827]
                    dark:text-white
                  "
                >
                  CIS Document
                </h3>

                <p
                  className="
                    mt-0.5
                    text-xs
                    font-medium
                    text-slate-600
                    dark:text-slate-300
                  "
                >
                  Upload the course information sheet.
                </p>

              </div>

            </div>

            {/* =================================================
                DROP ZONE
            ================================================== */}

            <div
              className={`
                relative
                overflow-hidden
                rounded-2xl
                border-2
                border-dashed
                px-4
                py-8
                sm:py-10
                flex
                flex-col
                items-center
                justify-center
                text-center
                cursor-pointer
                transition-colors
                duration-200
                group

                ${
                  errors.file
                    ? `
                      border-red-300
                      bg-red-50/50
                      dark:border-red-500/30
                      dark:bg-red-500/[0.04]
                    `
                    : `
                      border-emerald-200
                      bg-gradient-to-br
                      from-emerald-50/80
                      via-white
                      to-green-50/50
                      hover:border-emerald-400
                      hover:from-emerald-50
                      hover:to-green-50

                      dark:border-white/[0.12]
                      dark:bg-[#111827]
                      dark:hover:border-emerald-500/40
                      dark:hover:bg-[#111827]
                    `
                }
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >

              {/* FILE INPUT */}

              <input
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                className="
                  absolute
                  inset-0
                  h-full
                  w-full
                  cursor-pointer
                  opacity-0
                  z-10
                "
                type="file"
                onChange={handleFileChange}
              />

              {/* ICON */}

              <div
                className="
                  relative
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-white
                  text-emerald-600
                  shadow-[0_8px_25px_rgba(16,185,129,0.10)]
                  ring-1
                  ring-emerald-100
                  transition-transform
                  duration-200
                  group-hover:scale-[1.02]

                  dark:bg-[#0F172A]
                  dark:text-emerald-400
                  dark:ring-white/[0.08]
                  dark:shadow-none
                "
              >

                <span
                  className="
                    material-symbols-outlined
                    text-[32px]
                  "
                >
                  {formData.file
                    ? "description"
                    : "cloud_upload"}
                </span>

              </div>

              {/* FILE NAME */}

              <p
                className={`
                  relative
                  mt-4
                  max-w-[90%]
                  break-words
                  text-sm
                  font-bold

                  ${
                    errors.file
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-700 dark:text-emerald-300"
                  }
                `}
              >
                {formData.file
                  ? formData.file.name
                  : "Click to browse or drag file here"}
              </p>

              {/* FILE INFORMATION */}

              <p
                className="
                  relative
                  mt-1
                  text-[11px]
                  sm:text-xs
                  font-medium
                  text-slate-500
                  dark:text-slate-400
                "
              >
                {formData.file
                  ? `${(
                      formData.file.size /
                      1024 /
                      1024
                    ).toFixed(2)} MB`
                  : "PDF, DOC, DOCX, PPT or PPTX · Maximum 10MB"}
              </p>

              {/* SELECTED FILE STATUS */}

              {formData.file && !errors.file && (
                <div
                  className="
                    relative
                    mt-3
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-full
                    bg-emerald-100
                    px-3
                    py-1
                    text-[10px]
                    font-bold
                    text-emerald-800
                    dark:bg-emerald-500/10
                    dark:text-emerald-300
                  "
                >
                  <span className="material-symbols-outlined text-[14px]">
                    check_circle
                  </span>

                  File selected
                </div>
              )}

            </div>

            {/* FILE ERROR */}

            {errors.file && (
              <div
                className="
                  mt-2
                  flex
                  items-center
                  gap-1.5
                "
              >

                <span className="material-symbols-outlined text-[16px] text-red-500">
                  error
                </span>

                <span className={errorClass}>
                  {errors.file}
                </span>

              </div>
            )}

          </section>

          {/* =================================================
              FOOTER
          ================================================== */}

          <div
            className="
              border-t
              border-slate-200
              dark:border-white/[0.08]
              pt-5
            "
          >

            <div
              className="
                flex
                flex-col-reverse
                gap-2.5
                min-[400px]:flex-row
                min-[400px]:justify-end
              "
            >

              {/* CANCEL */}

              <button
                type="button"
                onClick={handleCancel}
                disabled={isUploading}
                className="
                  w-full
                  min-[400px]:w-auto
                  rounded-xl
                  border
                  border-slate-300
                  bg-white
                  px-5
                  py-2.5
                  text-sm
                  font-bold
                  text-slate-700
                  transition-colors
                  hover:border-emerald-200
                  hover:bg-emerald-50
                  hover:text-emerald-800
                  disabled:cursor-not-allowed
                  disabled:opacity-50

                  dark:border-white/[0.10]
                  dark:bg-white/[0.03]
                  dark:text-slate-200
                  dark:hover:bg-white/[0.06]
                  dark:hover:text-emerald-300
                "
              >
                Cancel
              </button>

              {/* UPLOAD CIS */}

              <button
                type="submit"
                disabled={isUploading}
                className="
                  w-full
                  min-[400px]:w-auto
                  rounded-xl
                  bg-gradient-to-r
                  from-emerald-600
                  to-green-600
                  px-6
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  shadow-[0_8px_20px_rgba(16,185,129,0.20)]
                  transition-all
                  hover:from-emerald-700
                  hover:to-green-700
                  hover:shadow-[0_10px_25px_rgba(16,185,129,0.28)]
                  active:scale-[0.98]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  flex
                  items-center
                  justify-center
                  gap-2
                "
              >

                {isUploading ? (
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

                    <span>
                      Uploading...
                    </span>

                  </>
                ) : (
                  <>

                    <span className="material-symbols-outlined text-[18px]">
                      cloud_upload
                    </span>

                    <span>
                      Upload CIS
                    </span>

                  </>
                )}

              </button>

            </div>
          </div>

        </div>
      </form>
    </div>
  );
}