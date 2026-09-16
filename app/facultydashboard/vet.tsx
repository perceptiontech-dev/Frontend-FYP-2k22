"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

interface CISItem {
  cis_id: string;
  course_id: string;
  course_name: string;
  department: string;
  semester?: number | null;
  link?: string;
  last_update_time?: string;
}

interface VetProps {
  onClose: () => void;
  nextStep?: (link: string, department: string, courseId: string) => void;
  cisItems?: CISItem[];
  defaultDepartment?: string;
  defaultSemester?: number;
  defaultCourseId?: string;
}

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function Vet({
  onClose,
  nextStep,
  cisItems = [],
  defaultDepartment = "",
  defaultSemester,
  defaultCourseId = "",
}: VetProps) {
  const departments = useMemo(
    () => [...new Set(cisItems.map((item) => item.department).filter(Boolean))].sort(),
    [cisItems]
  );

  const [selectedDepartment, setSelectedDepartment] = useState(
    () => defaultDepartment || ""
  );
  const [selectedSemester, setSelectedSemester] = useState<number | "">(
    () => defaultSemester ?? ""
  );
  const [selectedCourseId, setSelectedCourseId] = useState(
    () => defaultCourseId || ""
  );

  // If no default department given, pick first available once departments load
  useEffect(() => {
    if (!selectedDepartment && departments.length > 0) {
      setSelectedDepartment(departments[0]);
    }
  }, [departments]);

  // Courses filtered by department only, used to know which semesters exist
  const departmentCourses = useMemo(() => {
    return cisItems.filter((item) => !selectedDepartment || item.department === selectedDepartment);
  }, [cisItems, selectedDepartment]);

  const filteredCourses = useMemo(() => {
    return departmentCourses.filter(
      (item) => selectedSemester === "" || item.semester === selectedSemester
    );
  }, [departmentCourses, selectedSemester]);

  // When department changes, keep current semester if still valid; else reset
  useEffect(() => {
    if (selectedSemester === "") return;
    const stillValid = departmentCourses.some((item) => item.semester === selectedSemester);
    if (!stillValid) {
      setSelectedSemester("");
    }
  }, [departmentCourses]);

  // When department or semester changes, keep current course if still valid; else pick first
  useEffect(() => {
    if (filteredCourses.length === 0) {
      setSelectedCourseId("");
      return;
    }
    if (!filteredCourses.some((item) => item.cis_id === selectedCourseId)) {
      setSelectedCourseId(filteredCourses[0]?.cis_id || "");
    }
  }, [filteredCourses]);

  const selectedCourse = useMemo(() => {
    return filteredCourses.find((item) => item.cis_id === selectedCourseId) || null;
  }, [filteredCourses, selectedCourseId]);

  const allowedPreviewExts = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

  const previewUrl = selectedCourse?.link
    ? (() => {
        const lower = selectedCourse.link.toLowerCase();
        if (!allowedPreviewExts.some((ext) => lower.includes(ext))) return null;
        return `https://docs.google.com/viewer?url=${encodeURIComponent(selectedCourse.link)}&embedded=true`;
      })()
    : null;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-xl border border-[#8b1cf7] w-full max-w-3xl mx-auto flex flex-col" style={{ height: "90vh" }}>

      <div className="bg-[#b300e8] rounded-xl py-3 mb-4">
        <h1 className="text-xl text-center text-white font-semibold tracking-wide">
          VET
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 justify-center">
        <div className="relative w-full sm:w-56">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-[#8b1cf7] rounded-lg appearance-none text-sm text-black pr-8 focus:outline-none focus:ring-2 focus:ring-[#f6c400]"
          >
            <option value="">Select Department</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
        </div>

        <div className="relative w-full sm:w-56">
          <select
            value={selectedSemester}
            onChange={(e) =>
              setSelectedSemester(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full px-3 py-2 bg-white border border-[#8b1cf7] rounded-lg appearance-none text-sm text-black pr-8 focus:outline-none focus:ring-2 focus:ring-[#f6c400]"
          >
            <option value="">Select Semester</option>
            {SEMESTERS.map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
        </div>

        <div className="relative w-full sm:w-56">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            disabled={filteredCourses.length === 0}
            className="w-full px-3 py-2 bg-white border border-[#8b1cf7] rounded-lg appearance-none text-sm text-black pr-8 focus:outline-none focus:ring-2 focus:ring-[#f6c400] disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">Select Course</option>
            {filteredCourses.map((course) => (
              <option key={course.cis_id} value={course.cis_id}>
                {course.course_name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
        </div>
      </div>

      <div className="flex-1 min-h-0 mb-4 overflow-hidden rounded-xl border border-[#d8b4fe]">
        {selectedCourse ? (
          <div className="h-full flex flex-col min-h-0">
            {previewUrl ? (
              <>
                <div className="px-3 py-2 bg-purple-50 border-b border-[#e9d5ff] text-sm font-medium text-[#6b21a8] shrink-0">
                  {selectedCourse.course_name}
                </div>
                <iframe
                  src={previewUrl}
                  className="w-full flex-1 min-h-0 bg-white"
                />
              </>
            ) : selectedCourse.link ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-500 text-sm p-6">
                <p>Preview not available for this file type.</p>
                <a
                  href={selectedCourse.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#8b1cf7] underline"
                >
                  Open CIS file
                </a>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm p-6">
                No CIS file available for the selected course.
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-500 p-6">
            {cisItems.length === 0
              ? "No CIS records are available yet."
              : "Select a department, semester, and course to view CIS."}
          </div>
        )}
      </div>

      {selectedCourse?.link && previewUrl && (
        <div className="text-center mb-3">
          <a
            href={selectedCourse.link}
            target="_blank"
            rel="noreferrer"
            className="text-[#8b1cf7] text-sm underline"
          >
            Open in new tab
          </a>
        </div>
      )}

      <div className="flex gap-4 justify-center shrink-0">
        <button
          onClick={onClose}
          className="px-10 py-2 bg-[#b300e8] text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (selectedCourse?.link) {
              nextStep?.(selectedCourse.link, selectedDepartment, selectedCourseId);
            } else {
              alert("Please select a course with an uploaded CIS document first.");
            }
          }}
          className="px-10 py-2 bg-[#f6c400] text-black rounded-lg text-sm font-semibold hover:opacity-90 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}