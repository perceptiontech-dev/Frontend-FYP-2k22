"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "../lib/api";

interface CreateUserFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  email: string;
  username: string;
  faculty_id: string;
  department: string;
  role: string;
  password: string;
}

export function CreateUserForm({
  onClose,
  onSuccess,
}: CreateUserFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    username: "",
    faculty_id: "",
    department: "",
    role: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profilePicFile, setProfilePicFile] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    return () => {
      if (profilePicPreview) {
        URL.revokeObjectURL(profilePicPreview);
      }
    };
  }, [profilePicPreview]);

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
     VALIDATION
  ========================================================= */

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) {
      errs.name = "Full name is required";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Enter a valid email address";
    }

    if (!formData.username.trim()) {
      errs.username = "Username is required";
    }

    if (!formData.faculty_id.trim()) {
      errs.faculty_id = "ID is required";
    }

    if (!formData.role) {
      errs.role = "Select a role";
    }

    if (!formData.department.trim()) {
      errs.department = "Department is required";
    }

    if (!formData.password) {
      errs.password = "Password is required";
    } else if (formData.password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    }

    setErrors(errs);

    return Object.keys(errs).length === 0;
  };

  /* =========================================================
     SET FORM FIELD
  ========================================================= */

  const set = (key: keyof FormData, value: string) => {
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
     PROFILE PICTURE
  ========================================================= */

  const handleProfilePicture = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        profilePicture: "Image must be smaller than 5MB",
      }));
      return;
    }

    if (profilePicPreview) {
      URL.revokeObjectURL(profilePicPreview);
    }

    setProfilePicFile(file);
    setProfilePicPreview(URL.createObjectURL(file));

    setErrors((prev) => {
      const next = { ...prev };
      delete next.profilePicture;
      return next;
    });
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const token =
        localStorage.getItem("access_token") || "";

      let profileImageUrl: string | null = null;

      /* Upload profile picture first */

      if (profilePicFile) {
        const picFormData = new FormData();

        picFormData.append("file", profilePicFile);

        const uploadRes = await fetch(
          `${API_BASE_URL}/api/v1/users/profile-picture`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: picFormData,
          }
        );

        if (!uploadRes.ok) {
          const err = await uploadRes
            .json()
            .catch(() => null);

          throw new Error(
            err?.detail ||
              "Failed to upload profile picture"
          );
        }

        const uploadData = await uploadRes.json();

        profileImageUrl = uploadData.public_url;
      }

      /* Create user */

      const response = await fetch(
        `${API_BASE_URL}/api/v1/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            role: formData.role.toLowerCase(),
            username:
              formData.username || undefined,
            faculty_id:
              formData.faculty_id || undefined,
            department:
              formData.department || undefined,
            name: formData.name || undefined,
            user_profile_image_link:
              profileImageUrl || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Failed to create user"
        );
      }

      onSuccess?.();

      handleCancel();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to create user"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================================================
     CANCEL
  ========================================================= */

  const handleCancel = () => {
    if (profilePicPreview) {
      URL.revokeObjectURL(profilePicPreview);
    }

    setFormData({
      name: "",
      email: "",
      username: "",
      faculty_id: "",
      department: "",
      role: "",
      password: "",
    });

    setErrors({});
    setProfilePicFile(null);
    setProfilePicPreview(null);
    setShowPassword(false);

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
          dark:from-emerald-500/[0.08]
          dark:via-[#0B1220]
          dark:to-[#0B1220]
        "
      >
        <div className="flex items-start justify-between gap-4">

          <div className="flex min-w-0 items-center gap-3.5">

            {/* =================================================
                CLEAN LOGO
                NO BACKGROUND
                NO BOX
                NO SHADOW
            ================================================== */}

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
                person_add
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
                  Create New User
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
                  New Account
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
                Add a new member to your institution
              </p>

            </div>

          </div>

          {/* CLOSE BUTTON */}

          <button
            type="button"
            onClick={handleCancel}
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
              transition-all
              hover:bg-emerald-100
              hover:text-emerald-800
              dark:text-slate-300
              dark:hover:bg-emerald-500/10
              dark:hover:text-emerald-300
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
              PROFILE PICTURE
          ================================================== */}

          <section
            className="
              relative
              overflow-hidden
              rounded-2xl
              border
              border-emerald-100
              bg-gradient-to-br
              from-emerald-50/90
              via-white
              to-green-50/50
              p-5
              sm:p-6
              dark:border-emerald-500/15
              dark:from-emerald-500/[0.08]
              dark:via-white/[0.025]
              dark:to-green-500/[0.04]
            "
          >

            <div
              className="
                pointer-events-none
                absolute
                -right-12
                -top-12
                h-32
                w-32
                rounded-full
                bg-emerald-300/20
                blur-3xl
                dark:bg-emerald-400/10
              "
            />

            <div className="relative flex flex-col items-center">

              <label
                className="
                  group
                  relative
                  h-28
                  w-28
                  sm:h-32
                  sm:w-32
                  cursor-pointer
                  overflow-hidden
                  rounded-full
                  border-[3px]
                  border-white
                  bg-white
                  shadow-[0_10px_35px_rgba(16,185,129,0.18)]
                  ring-2
                  ring-emerald-400/60
                  transition-all
                  hover:scale-[1.03]
                  hover:ring-emerald-500
                  dark:border-[#0B1220]
                  dark:bg-[#111827]
                  dark:ring-emerald-400/40
                "
              >

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleProfilePicture}
                />

                {profilePicPreview ? (
                  <>
                    <img
                      src={profilePicPreview}
                      alt="Profile preview"
                      className="
                        absolute
                        inset-0
                        h-full
                        w-full
                        object-cover
                      "
                    />

                    <div
                      className="
                        absolute
                        inset-0
                        flex
                        items-center
                        justify-center
                        bg-black/55
                        opacity-0
                        transition-opacity
                        group-hover:opacity-100
                      "
                    >
                      <span className="material-symbols-outlined text-white">
                        photo_camera
                      </span>
                    </div>
                  </>
                ) : (
                  <div
                    className="
                      absolute
                      inset-0
                      flex
                      flex-col
                      items-center
                      justify-center
                      bg-gradient-to-br
                      from-emerald-50
                      to-green-100
                      text-emerald-700
                      dark:from-emerald-500/10
                      dark:to-green-500/5
                      dark:text-emerald-300
                    "
                  >
                    <span className="material-symbols-outlined text-3xl">
                      add_a_photo
                    </span>

                    <span className="mt-1 text-[10px] font-bold">
                      Add photo
                    </span>
                  </div>
                )}

              </label>

              <h3
                className="
                  mt-3
                  text-sm
                  font-bold
                  text-[#111827]
                  dark:text-white
                "
              >
                Profile Picture
              </h3>

              <p
                className="
                  mt-1
                  text-[11px]
                  font-medium
                  text-slate-600
                  dark:text-slate-300
                "
              >
                JPG, PNG or WEBP · Maximum 5MB
              </p>

              {errors.profilePicture && (
                <span className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                  {errors.profilePicture}
                </span>
              )}

            </div>
          </section>

          {/* =================================================
              ACCOUNT INFORMATION
          ================================================== */}

          <section>

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
                  Account Information
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
                  Enter the user's basic account details.
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

              {/* FULL NAME */}

              <div className="space-y-1.5">

                <label
                  htmlFor="name"
                  className={labelClass}
                >
                  Full Name
                </label>

                <input
                  id="name"
                  className={inputClass(!!errors.name)}
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) =>
                    set("name", e.target.value)
                  }
                  type="text"
                  autoComplete="name"
                />

                {errors.name && (
                  <span className={errorClass}>
                    {errors.name}
                  </span>
                )}

              </div>

              {/* EMAIL */}

              <div className="space-y-1.5">

                <label
                  htmlFor="email"
                  className={labelClass}
                >
                  Email Address
                </label>

                <input
                  id="email"
                  className={inputClass(!!errors.email)}
                  placeholder="user@university.edu"
                  value={formData.email}
                  onChange={(e) =>
                    set("email", e.target.value)
                  }
                  type="email"
                  autoComplete="email"
                />

                {errors.email && (
                  <span className={errorClass}>
                    {errors.email}
                  </span>
                )}

              </div>

              {/* USERNAME */}

              <div className="space-y-1.5">

                <label
                  htmlFor="username"
                  className={labelClass}
                >
                  Username
                </label>

                <input
                  id="username"
                  className={inputClass(
                    !!errors.username
                  )}
                  placeholder="johndoe123"
                  value={formData.username}
                  onChange={(e) =>
                    set(
                      "username",
                      e.target.value
                    )
                  }
                  type="text"
                  autoComplete="username"
                />

                {errors.username && (
                  <span className={errorClass}>
                    {errors.username}
                  </span>
                )}

              </div>

              {/* FACULTY ID */}

              <div className="space-y-1.5">

                <label
                  htmlFor="faculty_id"
                  className={labelClass}
                >
                  Faculty / Admin ID
                </label>

                <input
                  id="faculty_id"
                  className={inputClass(
                    !!errors.faculty_id
                  )}
                  placeholder="e.g. FAC-1234"
                  value={formData.faculty_id}
                  onChange={(e) =>
                    set(
                      "faculty_id",
                      e.target.value
                    )
                  }
                  type="text"
                />

                {errors.faculty_id && (
                  <span className={errorClass}>
                    {errors.faculty_id}
                  </span>
                )}

              </div>

              {/* ROLE */}

              <div className="space-y-1.5">

                <label
                  htmlFor="role"
                  className={labelClass}
                >
                  Role
                </label>

                <div className="relative">

                  <select
                    id="role"
                    className={`
                      ${inputClass(!!errors.role)}
                      appearance-none
                      pr-10
                    `}
                    value={formData.role}
                    onChange={(e) =>
                      set(
                        "role",
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select role...
                    </option>

                    <option value="Admin">
                      Admin
                    </option>

                    <option value="Faculty">
                      Faculty
                    </option>

                

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

                {errors.role && (
                  <span className={errorClass}>
                    {errors.role}
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

              {/* PASSWORD */}

              <div className="sm:col-span-2 space-y-1.5">

                <label
                  htmlFor="password"
                  className={labelClass}
                >
                  Password
                </label>

                <div className="relative">

                  <input
                    id="password"
                    className={`
                      ${inputClass(
                        !!errors.password
                      )}
                      pr-12
                    `}
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={(e) =>
                      set(
                        "password",
                        e.target.value
                      )
                    }
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    className="
                      absolute
                      right-2
                      top-1/2
                      flex
                      h-8
                      w-8
                      -translate-y-1/2
                      items-center
                      justify-center
                      rounded-lg
                      text-slate-600
                      transition-colors
                      hover:bg-emerald-50
                      hover:text-emerald-700
                      dark:text-slate-300
                      dark:hover:bg-emerald-500/10
                      dark:hover:text-emerald-300
                    "
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    <span className="material-symbols-outlined text-[19px]">
                      {showPassword
                        ? "visibility_off"
                        : "visibility"}
                    </span>

                  </button>

                </div>

                {errors.password ? (
                  <span className={errorClass}>
                    {errors.password}
                  </span>
                ) : (
                  <span
                    className="
                      text-[11px]
                      font-medium
                      text-slate-600
                      dark:text-slate-300
                    "
                  >
                    Use at least 8 characters.
                  </span>
                )}

              </div>

            </div>
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
                disabled={isSubmitting}
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
                  transition-all
                  hover:border-emerald-200
                  hover:bg-emerald-50
                  hover:text-emerald-800
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  dark:border-white/[0.10]
                  dark:bg-white/[0.03]
                  dark:text-slate-200
                  dark:hover:bg-emerald-500/10
                  dark:hover:text-emerald-300
                "
              >
                Cancel
              </button>

              {/* CREATE USER */}

              <button
                type="submit"
                disabled={isSubmitting}
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

                {isSubmitting ? (
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
                      Creating...
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">
                      person_add
                    </span>

                    <span>
                      Create User
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