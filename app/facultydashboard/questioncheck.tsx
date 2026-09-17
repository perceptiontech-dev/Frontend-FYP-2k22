"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { readReportStream } from "./utils/streamParser";
import { API_BASE_URL } from "../lib/api";

interface QuestionCheckProps {
  onNext?: () => void;
  onBack?: () => void;
  cisLink?: string | null;
  paperLink?: string | null;
  sessionId?: string | null;
  lectureFiles?: File[] | null;
  initialReport?: string;
  onReportChange?: (report: string) => void;
}

function parseMdTable(md: string): { headers: string[]; rows: string[][] } | null {
  const lines = md.split("\n").filter((l) => l.trim().startsWith("|"));
  if (lines.length < 2) return null;
  const split = (line: string) =>
    line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const headers = split(lines[0]);
  const rows = lines.slice(2).map(split);
  return { headers, rows };
}

interface ColIdx { no: number; question: number; cis: number; lecture: number; status: number; remarks: number; final: number; }

function detectCols(headers: string[]): ColIdx | null {
  const lower = headers.map((h) => h.toLowerCase().trim());
  // Exact match first, then partial match
  const findExact = (needle: string) => {
    let i = lower.findIndex((h) => h === needle);
    if (i >= 0) return i;
    i = lower.findIndex((h) => h.includes(needle));
    return i >= 0 ? i : -1;
  };
  // For "question" column, find the one that does NOT also match "question no"
  const findQuestion = () => {
    const i = lower.findIndex((h) => h.includes("question") && !h.includes("no"));
    return i >= 0 ? i : -1;
  };
  const no = findExact("question no"); const question = findQuestion(); const cis = findExact("cis check");
  const lecture = findExact("lecture check"); const status = findExact("status"); const remarks = findExact("remark"); const final_ = findExact("final");
  if (no < 0 || question < 0 || cis < 0 || lecture < 0 || status < 0 || remarks < 0 || final_ < 0) return null;
  return { no, question, cis, lecture, status, remarks, final: final_ };
}

function Badge({ value }: { value: string }) {
  const upper = value.toUpperCase();
  const isYes = upper === "YES";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${isYes ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isYes ? "bg-emerald-500" : "bg-red-500"}`} />
      {value}
    </span>
  );
}

function InteractiveQuestionTable({ report, onReportChange }: { report: string; onReportChange?: (r: string) => void }) {
  const [remarks, setRemarks] = React.useState<Record<number, string>>({});
  const table = React.useMemo(() => parseMdTable(report), [report]);
  const cols = React.useMemo(() => (table ? detectCols(table.headers) : null), [table]);

  if (!table || !cols) {
    return <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{report}</ReactMarkdown>;
  }

  const handleRemarkChange = (rowIdx: number, value: string) => { setRemarks((prev) => ({ ...prev, [rowIdx]: value })); };

  const handleSaveRemark = (rowIdx: number) => {
    const remarkText = remarks[rowIdx] || "";
    if (!remarkText.trim()) return;
    const lines = report.split("\n");
    let dataRowIdx = -1; let count = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("|") && !lines[i].includes("---")) {
        if (count === 0) { count++; continue; }
        if (count === rowIdx + 1) { dataRowIdx = i; break; }
        count++;
      }
    }
    if (dataRowIdx < 0) return;
    const cells = lines[dataRowIdx].replace(/^\|/, "").replace(/\|$/, "").split("|");
    cells[cols.remarks] = ` ${remarkText} `;
    cells[cols.final] = ` Yes `;
    lines[dataRowIdx] = "| " + cells.join("|") + " |";
    onReportChange?.(lines.join("\n"));
    setRemarks((prev) => { const next = { ...prev }; delete next[rowIdx]; return next; });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead>
          <tr className="bg-[#f0fdf4] dark:bg-emerald-900/20">
            {table.headers.map((h, i) => (
              <th key={i} className={`px-3 py-2 font-bold text-emerald-800 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-700 ${i === cols.question ? "min-w-[180px]" : ""} ${i === cols.remarks ? "min-w-[200px]" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIdx) => {
            const statusVal = (row[cols.status] || "").toUpperCase();
            const isNo = statusVal === "NO";
            const hasSavedRemark = row[cols.remarks] && row[cols.remarks] !== "---" && row[cols.remarks] !== " --- ";
            const finalVal = row[cols.final] || "";
            const isPending = finalVal.toUpperCase().includes("PENDING");
            return (
              <tr key={rowIdx} className={`${isNo ? "bg-red-50/60 dark:bg-red-900/10" : "bg-white dark:bg-transparent"} hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors`}>
                {row.map((cell, cellIdx) => {
                  if (cellIdx === cols.no) return <td key={cellIdx} className="px-3 py-2 font-semibold whitespace-nowrap border-b border-gray-100 dark:border-white/[0.06]">{cell}</td>;
                  if (cellIdx === cols.status || cellIdx === cols.cis || cellIdx === cols.lecture) return <td key={cellIdx} className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.06]"><Badge value={cell} /></td>;
                  if (cellIdx === cols.remarks) {
                    const editing = remarks[rowIdx] !== undefined;
                    const savedRemarks = hasSavedRemark ? cell : "";
                    if (isNo || isPending) {
                      return (
                        <td key={cellIdx} className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.06]">
                          {editing ? (
                            <div className="flex items-center gap-1.5">
                              <input type="text" value={remarks[rowIdx]} onChange={(e) => handleRemarkChange(rowIdx, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveRemark(rowIdx); }} placeholder="Type remarks..." className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400" autoFocus />
                              <button onClick={() => handleSaveRemark(rowIdx)} className="px-2 py-1 text-[10px] font-semibold text-white bg-emerald-500 rounded-md hover:bg-emerald-600 transition-colors whitespace-nowrap">Save</button>
                            </div>
                          ) : savedRemarks ? (
                            <span className="text-xs text-gray-700 dark:text-gray-300">{savedRemarks}</span>
                          ) : (
                            <button onClick={() => setRemarks((prev) => ({ ...prev, [rowIdx]: "" }))} className="px-2 py-1 text-[10px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors cursor-pointer">Add Remark</button>
                          )}
                        </td>
                      );
                    }
                    return <td key={cellIdx} className="px-3 py-2 text-gray-400 border-b border-gray-100 dark:border-white/[0.06]">{cell}</td>;
                  }
                  if (cellIdx === cols.final) {
                    const upper = cell.toUpperCase();
                    const isYes = upper.includes("YES") && !upper.includes("NO");
                    return <td key={cellIdx} className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.06]">{isYes ? <Badge value="Yes" /> : <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{cell}</span>}</td>;
                  }
                  if (cellIdx === cols.question) {
                    if (cell.trim() === "-") return <td key={cellIdx} className="px-3 py-2 text-center text-gray-400 border-b border-gray-100 dark:border-white/[0.06]">—</td>;
                    return <td key={cellIdx} className="px-3 py-2 text-gray-800 dark:text-gray-200 leading-relaxed border-b border-gray-100 dark:border-white/[0.06]">{cell}</td>;
                  }
                  return <td key={cellIdx} className="px-3 py-2 border-b border-gray-100 dark:border-white/[0.06]">{cell}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function QuestionCheckScreen({ onNext, onBack, cisLink, paperLink, sessionId, lectureFiles, initialReport = "", onReportChange }: QuestionCheckProps) {
  const [report, setReport] = React.useState(initialReport);
  const [isLoading, setIsLoading] = React.useState(false);
  const controllerRef = React.useRef<AbortController | null>(null);

  const issueCount = React.useMemo(() => {
    const table = parseMdTable(report);
    const cols = table ? detectCols(table.headers) : null;
    if (!table || !cols) return 0;
    return table.rows.filter((row) => (row[cols.status] || "").toUpperCase() === "NO").length;
  }, [report]);

  const handleReportChange = (newReport: string) => { setReport(newReport); onReportChange?.(newReport); };

  const generateReport = async (signal: AbortSignal) => {
    setIsLoading(true); setReport("");
    try {
      let url: string; let init: RequestInit;
      const token = localStorage.getItem("access_token") || "";
      if (lectureFiles && lectureFiles.length > 0) {
        const formData = new FormData();
        formData.append("cis_link", cisLink!); formData.append("paper_link", paperLink!); formData.append("session_id", sessionId || "");
        lectureFiles.forEach((file) => formData.append("files", file));
        url = `${API_BASE_URL}/api/v1/analyzer/reports/questions-check-with-lectures`;
        init = { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData, signal };
      } else {
        url = `${API_BASE_URL}/api/v1/analyzer/reports/questions-check`;
        init = { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ cis_link: cisLink, paper_link: paperLink, session_id: sessionId || null }), signal };
      }
      const response = await fetch(url, init);
      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const fullReport = await readReportStream(response, signal, (text) => setReport(text));
      if (!signal.aborted) onReportChange?.(fullReport);
    } catch (error: any) {
      if (error.name === "AbortError") return;
      console.error("QuestionCheck error:", error);
      setReport("Error generating report. Please try again.");
    } finally { setIsLoading(false); }
  };

  const handleRegenerate = () => { controllerRef.current?.abort(); const controller = new AbortController(); controllerRef.current = controller; generateReport(controller.signal); };

  React.useEffect(() => {
    if (initialReport) return;
    const controller = new AbortController(); controllerRef.current = controller;
    if (cisLink && paperLink) generateReport(controller.signal);
    return () => controller.abort();
  }, [cisLink, paperLink]);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-1 min-[320px]:px-2 min-[375px]:px-3 sm:px-4 py-1 min-[320px]:py-2 min-[375px]:py-3 sm:py-6">
        <div className="bg-white w-full max-w-5xl min-w-0 h-[calc(100vh-0.5rem)] min-[320px]:h-[calc(100vh-1rem)] min-[375px]:h-[calc(100vh-1.5rem)] sm:h-[calc(100vh-2rem)] rounded-xl min-[375px]:rounded-2xl sm:rounded-3xl p-1 min-[320px]:p-2 min-[375px]:p-3 sm:p-6 shadow-xl overflow-hidden flex">
          <div className="flex-1 min-w-0 min-h-0 p-1 min-[320px]:p-2 min-[375px]:p-3 sm:p-6">
            <div className="h-full min-h-0 min-w-0 flex flex-col p-2 min-[320px]:p-3 min-[375px]:p-4 sm:p-6 rounded-lg min-[375px]:rounded-2xl sm:rounded-3xl" style={{ backgroundColor: "#f2e6fa" }}>
              <div className="flex items-center justify-between mb-2 min-[375px]:mb-3 sm:mb-4 shrink-0">
                <h1 className="text-base min-[320px]:text-lg min-[375px]:text-xl sm:text-2xl font-bold text-gray-800">Question Check</h1>
                {report && !isLoading && issueCount > 0 && <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Issues: {issueCount}</span>}
                {report && !isLoading && issueCount === 0 && <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Issues: 0</span>}
              </div>
              <div className="flex-1 min-h-0 min-w-0 bg-white rounded-lg min-[375px]:rounded-xl sm:rounded-2xl p-2 min-[320px]:p-3 min-[375px]:p-4 sm:p-5 mb-2 min-[375px]:mb-3 sm:mb-5 overflow-auto">
                <h2 className="text-center text-sm min-[320px]:text-base min-[375px]:text-lg font-bold text-black mb-2 min-[375px]:mb-3">REPORT</h2>
                <div className="text-black text-xs min-[320px]:text-sm break-words min-w-0 max-w-full leading-relaxed overflow-wrap-anywhere">
                  {isLoading && !report ? (
                    <div className="flex items-center justify-center h-24 min-[375px]:h-32">
                      <p className="animate-pulse text-gray-500 text-xs min-[375px]:text-sm text-center">Generating Report...</p>
                    </div>
                  ) : report ? (
                    <InteractiveQuestionTable report={report} onReportChange={handleReportChange} />
                  ) : null}
                </div>
              </div>
              <div className="flex items-center justify-between gap-1 min-[320px]:gap-2 min-[375px]:gap-3 w-full min-w-0 shrink-0">
                <button onClick={onBack} className="flex-1 sm:flex-none min-w-0 px-1 min-[320px]:px-2 min-[375px]:px-4 sm:px-10 py-1.5 min-[375px]:py-2 sm:py-2.5 text-white rounded-md min-[375px]:rounded-lg text-[10px] min-[320px]:text-xs min-[375px]:text-sm font-medium whitespace-nowrap transition active:scale-95 hover:opacity-90" style={{ backgroundColor: "#b300e8" }}>Back</button>
                <button onClick={handleRegenerate} disabled={isLoading} className="flex-1 sm:flex-none min-w-0 flex items-center justify-center gap-0.5 min-[320px]:gap-1 min-[375px]:gap-2 px-1 min-[320px]:px-2 min-[375px]:px-3 sm:px-6 py-1.5 min-[375px]:py-2 sm:py-2.5 text-white rounded-md min-[375px]:rounded-lg text-[9px] min-[320px]:text-[10px] min-[375px]:text-xs sm:text-sm font-medium whitespace-nowrap disabled:opacity-50 transition active:scale-95 hover:opacity-90" style={{ backgroundColor: "#374151" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 min-[375px]:w-4 min-[375px]:h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                  <span className="truncate">{isLoading ? "Generating..." : "Regenerate"}</span>
                </button>
                {onNext && <button onClick={onNext} className="flex-1 sm:flex-none min-w-0 px-1 min-[320px]:px-2 min-[375px]:px-4 sm:px-10 py-1.5 min-[375px]:py-2 sm:py-2.5 text-black rounded-md min-[375px]:rounded-lg text-[10px] min-[320px]:text-xs min-[375px]:text-sm font-medium whitespace-nowrap transition active:scale-95 hover:opacity-90" style={{ backgroundColor: "#f6c400" }}>Next</button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
