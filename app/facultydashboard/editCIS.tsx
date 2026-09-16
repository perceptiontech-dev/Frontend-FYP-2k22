"use client";

import { useState } from "react";

interface EditCISFormProps {
  onClose?: () => void;
}

export default function EditCISForm({
  onClose,
}: EditCISFormProps) {
  const [department, setDepartment] = useState("");
  const [course, setCourse] = useState("");
  const [courseId, setCourseId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    console.log({
      department,
      course,
      courseId,
      file,
    });
  };

  return (
    <div
      className="
        w-full
        max-w-md
        mx-auto

        mt-2
        min-[320px]:mt-4
        sm:mt-20

        px-2
        min-[320px]:px-3
        sm:px-0

        overflow-x-hidden
      "
    >
      {/* FORM CARD */}
      <div
        className="
          w-full
          bg-white

          rounded-xl
          min-[320px]:rounded-2xl

          shadow-lg

          p-3
          min-[320px]:p-4
          sm:p-6
        "
      >
        {/* TITLE */}
        <h2
          className="
            text-lg
            min-[320px]:text-xl
            sm:text-2xl

            font-bold
            text-center

            mb-4
            min-[320px]:mb-5
            sm:mb-6

            text-gray-800
          "
        >
          Edit CIS
        </h2>

        <form
          onSubmit={handleSubmit}
          className="
            space-y-3
            min-[320px]:space-y-4
          "
        >
          {/* DEPARTMENT */}
          <div className="min-w-0">
            <label
              className="
                block
                text-xs
                min-[320px]:text-sm
                font-medium
                text-gray-600
                mb-1
              "
            >
              Department
            </label>

            <select
              value={department}
              onChange={(e) =>
                setDepartment(e.target.value)
              }
              className="
                w-full
                min-w-0

                border
                border-gray-300

                rounded-md

                px-2
                min-[320px]:px-3

                py-2

                text-xs
                min-[320px]:text-sm

                bg-white
                text-gray-800

                focus:outline-none
                focus:ring-2
                focus:ring-blue-500

                truncate
              "
            >
              <option value="">
                Select Department
              </option>

              <option value="cis">
                CIS
              </option>

              <option value="math">
                Math
              </option>

              <option value="physics">
                Physics
              </option>
            </select>
          </div>

          {/* COURSE */}
          <div className="min-w-0">
            <label
              className="
                block
                text-xs
                min-[320px]:text-sm
                font-medium
                text-gray-600
                mb-1
              "
            >
              Course
            </label>

            <input
              type="text"
              placeholder="Course Name"
              value={course}
              onChange={(e) =>
                setCourse(e.target.value)
              }
              className="
                w-full
                min-w-0

                border
                border-gray-300

                rounded-md

                px-2
                min-[320px]:px-3

                py-2

                text-xs
                min-[320px]:text-sm

                text-gray-800

                placeholder:text-gray-400

                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            />
          </div>

          {/* COURSE ID */}
          <div className="min-w-0">
            <label
              className="
                block
                text-xs
                min-[320px]:text-sm
                font-medium
                text-gray-600
                mb-1
              "
            >
              Course ID
            </label>

            <input
              type="text"
              placeholder="Course ID"
              value={courseId}
              onChange={(e) =>
                setCourseId(e.target.value)
              }
              className="
                w-full
                min-w-0

                border
                border-gray-300

                rounded-md

                px-2
                min-[320px]:px-3

                py-2

                text-xs
                min-[320px]:text-sm

                text-gray-800

                placeholder:text-gray-400

                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
              "
            />
          </div>

          {/* FILE UPLOAD */}
          <div
            className="
              border
              border-dashed
              border-gray-300

              rounded-md

              p-3
              min-[320px]:p-4

              text-center

              overflow-hidden
            "
          >
            <label
              className="
                cursor-pointer

                flex
                flex-col
                items-center
                justify-center

                text-gray-500

                min-w-0
              "
            >
              {/* UPLOAD ICON */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="
                  h-7
                  w-7
                  min-[320px]:h-8
                  min-[320px]:w-8

                  mb-2

                  text-gray-400

                  shrink-0
                "
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12v6m0 0l-3-3m3 3l3-3m-3-6V3"
                />
              </svg>

              {/* FILE TEXT */}
              <span
                className="
                  text-[10px]
                  min-[320px]:text-xs

                  leading-4

                  break-words
                  max-w-full
                "
              >
                {file
                  ? file.name
                  : "Browse and choose the files you want to upload from your computer"}
              </span>

              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* BUTTONS */}
          <div
            className="
              flex
              flex-col

              min-[360px]:flex-row

              gap-2

              min-[360px]:justify-between
              min-[360px]:items-center

              mt-3
              min-[320px]:mt-4
            "
          >
            {/* BACK */}
            <button
              type="button"
              onClick={onClose}
              className="
                w-full
                min-[360px]:w-auto

                px-4
                min-[360px]:px-5

                py-2

                bg-gray-400
                hover:bg-gray-500

                text-white

                text-xs
                min-[360px]:text-sm

                rounded-md

                transition-colors
              "
            >
              Back
            </button>

            {/* SAVE */}
            <button
              type="submit"
              className="
                w-full
                min-[360px]:w-auto

                px-4
                min-[360px]:px-5

                py-2

                bg-blue-600
                hover:bg-blue-700

                text-white

                text-xs
                min-[360px]:text-sm

                rounded-md

                transition-colors
              "
            >
              Save Edit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}