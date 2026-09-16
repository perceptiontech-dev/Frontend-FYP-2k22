"use client";

import { useState } from "react";

export default function Page() {
  const [openEditUser, setOpenEditUser] = useState(false);

  return (
    <div className="relative h-screen bg-gray-100 overflow-hidden">

      {/* PAGE BACKDROP */}
      {openEditUser && (
        <div
          className="
            fixed inset-0
            bg-black/20
            backdrop-blur-[2px]
            flex
            items-center
            justify-center
            z-50

            px-2
            min-[320px]:px-3
            sm:px-4

            py-2
            min-[320px]:py-4

            overflow-y-auto
          "
        >

          {/* MODAL BOX */}
          <div
            className="
              bg-white
              w-full
              max-w-[600px]

              rounded-xl
              min-[320px]:rounded-2xl

              shadow-[0_10px_60px_rgba(0,0,0,0.15)]

              p-3
              min-[320px]:p-4
              sm:p-8
              lg:p-10

              max-h-[calc(100vh-1rem)]
              min-[320px]:max-h-[calc(100vh-2rem)]

              overflow-y-auto
              overflow-x-hidden
            "
          >

            {/* TITLE */}
            <h1
              className="
                text-xl
                min-[320px]:text-2xl
                sm:text-3xl

                font-bold
                text-[#0A0F2D]

                text-center

                mb-5
                min-[320px]:mb-6
                sm:mb-10
              "
            >
              Edit User
            </h1>

            {/* FORM */}
            <div
              className="
                space-y-4
                min-[320px]:space-y-5
                sm:space-y-6
              "
            >

              {/* NAME */}
              <div className="min-w-0">
                <label
                  className="
                    block
                    text-sm
                    min-[320px]:text-base
                    sm:text-lg

                    text-[#2E2E2E]

                    mb-1.5
                    min-[320px]:mb-2
                  "
                >
                  Name
                </label>

                <input
                  type="text"
                  placeholder="Name"
                  className="
                    w-full
                    min-w-0

                    border
                    border-gray-300

                    rounded-lg

                    px-3
                    min-[320px]:px-4

                    py-2

                    text-sm
                    min-[320px]:text-base
                    sm:text-lg

                    text-gray-700

                    placeholder:text-gray-400

                    focus:ring-2
                    focus:ring-blue-500

                    outline-none

                    transition
                  "
                />
              </div>

              {/* EMAIL */}
              <div className="min-w-0">
                <label
                  className="
                    block
                    text-sm
                    min-[320px]:text-base
                    sm:text-lg

                    text-[#2E2E2E]

                    mb-1.5
                    min-[320px]:mb-2
                  "
                >
                  E-mail
                </label>

                <input
                  type="email"
                  placeholder="E-mail"
                  className="
                    w-full
                    min-w-0

                    border
                    border-gray-300

                    rounded-lg

                    px-3
                    min-[320px]:px-4

                    py-2

                    text-sm
                    min-[320px]:text-base
                    sm:text-lg

                    text-gray-700

                    placeholder:text-gray-400

                    focus:ring-2
                    focus:ring-blue-500

                    outline-none

                    transition
                  "
                />
              </div>

              {/* DEPARTMENT */}
              <div className="min-w-0">
                <label
                  className="
                    block
                    text-sm
                    min-[320px]:text-base
                    sm:text-lg

                    text-[#2E2E2E]

                    mb-1.5
                    min-[320px]:mb-2
                  "
                >
                  Department
                </label>

                <select
                  className="
                    w-full
                    min-w-0

                    border
                    border-gray-300

                    rounded-lg

                    px-3
                    min-[320px]:px-4

                    py-2

                    text-sm
                    min-[320px]:text-base
                    sm:text-lg

                    text-gray-700

                    bg-white

                    focus:ring-2
                    focus:ring-blue-500

                    outline-none

                    truncate
                  "
                >
                  <option>Select Department</option>
                  <option>Computer Science</option>
                  <option>Software Engineering</option>
                  <option>Business Management</option>
                </select>
              </div>

              {/* PASSWORD */}
              <div className="min-w-0">
                <label
                  className="
                    block
                    text-sm
                    min-[320px]:text-base
                    sm:text-lg

                    text-[#2E2E2E]

                    mb-1.5
                    min-[320px]:mb-2
                  "
                >
                  Password
                </label>

                <input
                  type="password"
                  placeholder="Password"
                  className="
                    w-full
                    min-w-0

                    border
                    border-gray-300

                    rounded-lg

                    px-3
                    min-[320px]:px-4

                    py-2

                    text-sm
                    min-[320px]:text-base
                    sm:text-lg

                    text-gray-700

                    placeholder:text-gray-400

                    focus:ring-2
                    focus:ring-blue-500

                    outline-none

                    transition
                  "
                />
              </div>
            </div>

            {/* BUTTONS */}
            <div
              className="
                flex
                flex-col

                min-[380px]:flex-row

                gap-2
                min-[380px]:gap-3

                min-[380px]:justify-between
                min-[380px]:items-center

                mt-5
                min-[320px]:mt-6
                sm:mt-10
              "
            >

              {/* BACK */}
              <button
                onClick={() => setOpenEditUser(false)}
                className="
                  w-full
                  min-[380px]:w-auto

                  px-5
                  min-[380px]:px-7
                  sm:px-10

                  py-2
                  min-[380px]:py-2.5
                  sm:py-3

                  bg-[#5B5B5B]
                  hover:bg-[#4A4A4A]

                  text-white

                  text-sm
                  min-[380px]:text-base
                  sm:text-lg

                  rounded-lg

                  shadow

                  transition
                "
              >
                Back
              </button>

              {/* SAVE EDIT */}
              <button
                onClick={() => alert("Saved!")}
                className="
                  w-full
                  min-[380px]:w-auto

                  px-5
                  min-[380px]:px-7
                  sm:px-10

                  py-2
                  min-[380px]:py-2.5
                  sm:py-3

                  bg-[#1A56DB]
                  hover:bg-[#1449B3]

                  text-white

                  text-sm
                  min-[380px]:text-base
                  sm:text-lg

                  rounded-lg

                  shadow

                  transition
                "
              >
                Save Edit
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}