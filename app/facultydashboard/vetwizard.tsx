"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import { readReportStream } from "./utils/streamParser";
import { generateReportPDF } from "./pdfGenerator";
import { getAuthContext, saveToHistory } from "./history";

// ─────────────────────────────────────────────────────────────
// SEARCHABLE SELECT
// ─────────────────────────────────────────────────────────────

interface SearchableOption {
  value: string;
  label: string;
}

function SearchableSelect({
  value,
  options,
  placeholder,
  disabled,
  loading,
  onChange,
}: {
  value: string;
  options: SearchableOption[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value]
  );

  useEffect(() => {
    if (!open) {
      setQuery(selectedOption?.label ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOption, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !open) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery(selectedOption?.label ?? "");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, selectedOption]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const commit = (opt: SearchableOption | undefined) => {
    if (!opt) return;
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[highlight]) {
        commit(filtered[highlight]);
      } else if (filtered.length === 1) {
        commit(filtered[0]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(selectedOption?.label ?? "");
      inputRef.current?.blur();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const showClear =
    !!value && !disabled && !loading && !open && query.length > 0;

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={loading ? "" : query}
          placeholder={loading ? "Loading..." : placeholder}
          disabled={disabled || loading}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          className="w-full min-w-0 p-2.5 min-[360px]:p-3 pr-9 bg-surface border border-outline-variant rounded-lg font-body-sm text-[13px] min-[360px]:text-body-sm text-on-surface focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 disabled:bg-surface-container-low disabled:text-on-surface-variant dark:bg-[#0A0C10] dark:border-[#1F2937] dark:text-[#E1E4E8] transition-shadow"
        />

        {showClear ? (
          <button
            type="button"
            aria-label="Clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(true);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-high dark:text-[#E1E4E8] dark:hover:bg-[#1F2937]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        ) : (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-on-surface-variant dark:text-[#E1E4E8]">
            expand_more
          </span>
        )}
      </div>

      {open && !disabled && !loading && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-1 max-h-52 min-[360px]:max-h-64 w-full overflow-y-auto rounded-lg border border-outline-variant bg-surface shadow-lg dark:bg-[#0A0C10] dark:border-[#1F2937]"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-on-surface-variant dark:text-[#94a3b8]">
              No matches
            </li>
          ) : (
            filtered.map((opt, i) => {
              const isSelected = opt.value === value;
              const isHighlighted = i === highlight;
              return (
                <li
                  key={opt.value || `__opt-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => commit(opt)}
                  className={`cursor-pointer px-3 py-2 text-sm flex items-center justify-between gap-2 ${
                    isHighlighted
                      ? "bg-[#0F766E]/10 text-[#0F766E] dark:text-[#5eead4]"
                      : "text-on-surface dark:text-[#E1E4E8]"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[16px] shrink-0">
                      check
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REPORT TABLE TYPES / HELPERS
// ─────────────────────────────────────────────────────────────

interface ReportTable {
  headers: string[];
  rows: string[][];
}

function splitTableRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function renderCellContent(text: string, isFirstCol = false) {
  if (!text) return "";

  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className={isFirstCol ? "font-bold text-on-surface dark:text-[#FFFFFF]" : ""}>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-bold text-on-surface dark:text-[#FFFFFF]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </span>
  );
}

function findTableBlocks(md: string): string[][] {
  const blocks: string[][] = [];
  const lines = md.split("\n");

  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line.startsWith("|")) {
      i++;
      continue;
    }

    const block: string[] = [];

    while (i < lines.length && lines[i].trim().startsWith("|")) {
      block.push(lines[i].trim());
      i++;
    }

    if (block.length >= 2 && /^\|[\s\-:|]+\|$/.test(block[1])) {
      blocks.push(block);
    }
  }

  return blocks;
}

function parseMarkdownTables(md: string): ReportTable[] {
  if (!md || typeof md !== "string") return [];
  return findTableBlocks(md).map((lines) => ({
    headers: splitTableRow(lines[0] || ""),
    rows: lines.slice(2).map((l) => splitTableRow(l || "")),
  }));
}

function tableToMarkdown(table: ReportTable): string {
  if (!table || !Array.isArray(table.headers) || table.headers.length === 0) return "";
  const headerLine = `| ${table.headers.join(" | ")} |`;
  const alignLine = `| ${table.headers.map(() => ":---").join(" | ")} |`;
  const rowLines = (table.rows || []).map((row) => {
    const filledRow = table.headers.map((_, i) =>
      row && row[i] !== undefined ? String(row[i]) : "---"
    );
    return `| ${filledRow.join(" | ")} |`;
  });
  return [headerLine, alignLine, ...rowLines].join("\n");
}

function updateMarkdownTable(md: string, tableIndex: number, newTable: ReportTable): string {
  if (!md || typeof md !== "string") return "";
  const lines = md.split("\n");
  const blocks: { start: number; end: number }[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]?.trim() || "";

    if (!line.startsWith("|")) {
      i++;
      continue;
    }

    const start = i;

    while (i < lines.length && (lines[i]?.trim() || "").startsWith("|")) {
      i++;
    }

    if (i - start >= 2 && /^\|[\s\-:|]+\|$/.test(lines[start + 1]?.trim() || "")) {
      blocks.push({ start, end: i });
    }
  }

  if (tableIndex < 0 || tableIndex >= blocks.length) return md;

  const { start, end } = blocks[tableIndex];
  const newTableLines = tableToMarkdown(newTable).split("\n");
  const updatedLines = [...lines.slice(0, start), ...newTableLines, ...lines.slice(end)];

  return updatedLines.join("\n");
}

const normalizeStatus = (value?: string | null): string =>
  (typeof value === "string" ? value : "")
    .replace(/\*\*/g, "")
    .replace(/[✅❌⚠️🟢🔴🟡]/g, "")
    .trim()
    .toLowerCase();

const isIssueValue = (value?: string | null): boolean => {
  if (!value || typeof value !== "string") return false;
  const t = normalizeStatus(value);

  if (!t) return false;

  return (
    t === "no" ||
    t === "n" ||
    t === "none" ||
    t === "not" ||
    t === "false" ||
    t === "unmapped" ||
    t === "missing" ||
    t === "fail" ||
    t === "failed" ||
    t === "rejected" ||
    t.startsWith("no ") ||
    t.startsWith("not ") ||
    t.startsWith("no,")
  );
};

const isYesValue = (value?: string | null): boolean => {
  if (!value || typeof value !== "string") return false;
  const t = normalizeStatus(value);

  if (!t) return false;

  return (
    t === "yes" ||
    t === "y" ||
    t === "true" ||
    t === "covered" ||
    t === "mapped" ||
    t === "compliant" ||
    t === "ok" ||
    t === "accept" ||
    t === "in-syllabus" ||
    t.startsWith("yes ")
  );
};

const STATUS_COLUMN =
  /meets|map|cover|match|status|assessed|resolved|syllabus|check/i;

function StatusBadge({ value }: { value?: string | null }) {
  const safeVal = value ?? "";
  if (isYesValue(safeVal)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 min-[360px]:px-2.5 py-1 rounded-full text-[11px] min-[360px]:text-[12px] font-semibold bg-panel-tint text-tertiary-container border border-soft-accent dark:bg-transparent dark:text-tertiary-fixed-dim dark:border-tertiary-fixed-dim animate-[popIn_0.25s_ease-out]">
        <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container dark:bg-tertiary-fixed-dim" />
        Yes
      </span>
    );
  }

  if (isIssueValue(safeVal)) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 min-[360px]:px-2.5 py-1 rounded-full text-[11px] min-[360px]:text-[12px] font-semibold bg-danger/10 text-danger border border-danger/20 dark:bg-transparent dark:text-danger dark:border-danger animate-[popIn_0.25s_ease-out]">
        <span className="w-1.5 h-1.5 rounded-full bg-danger" />
        No
      </span>
    );
  }

  if (normalizeStatus(safeVal) === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 min-[360px]:px-2.5 py-1 rounded-full text-[11px] min-[360px]:text-[12px] font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:bg-transparent dark:text-amber-400 dark:border-amber-500/40">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Pending
      </span>
    );
  }

  return <span className="text-on-surface dark:text-[#FFFFFF]">{renderCellContent(safeVal)}</span>;
}

function ReportTable({
  table,
  onRowRemarkChange,
}: {
  table: ReportTable;
  onRowRemarkChange?: (rowIndex: number, remarks: string) => void;
}) {
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [draftRemark, setDraftRemark] = useState("");

  if (!table || !Array.isArray(table.headers) || !Array.isArray(table.rows)) {
    return null;
  }

  const statusCols = table.headers.map((h) => STATUS_COLUMN.test(h || ""));
  const teacherRemarksColIdx = table.headers.findIndex((h) => /teacher\s*remarks?/i.test(h || ""));
  const finalStatusColIdx = table.headers.findIndex((h) => /final\s*status/i.test(h || ""));
  const statusColIdx = table.headers.findIndex((h) => /^status$/i.test(h || "") || /status/i.test(h || ""));
  const isQuestionCheckTable =
    table.headers.some((h) => /cis\s*check/i.test(h || "")) ||
    table.headers.some((h) => /lecture\s*check/i.test(h || ""));
  const questionColIdx = table.headers.findIndex(
    (h) => /^question$/i.test((h || "").trim()) || /^question\s*text$/i.test((h || "").trim())
  );
  const isBloomTable = table.headers.some(
    (h) => /bloom/i.test(h || "") || /matched\s*words/i.test(h || "")
  );
  const bloomQuestionColIdx = isBloomTable
    ? table.headers.findIndex(
        (h) =>
          /matched\s*words/i.test(h || "") ||
          (/question/i.test(h || "") && !/no\b|#/i.test(h || ""))
      )
    : -1;

  const rowHasIssue = (row: string[]) => {
    if (!row || !Array.isArray(row)) return false;
    if (finalStatusColIdx !== -1 && finalStatusColIdx < row.length && isYesValue(row[finalStatusColIdx])) {
      return false;
    }
    return row.some((cell, ci) => statusCols[ci] && isIssueValue(cell));
  };

  const beginRemarkEdit = (rowIndex: number, currentValue: string) => {
    setEditingRow(rowIndex);
    setDraftRemark(currentValue === "---" ? "" : currentValue);
  };

  const saveRemark = (rowIndex: number) => {
    const trimmed = draftRemark.trim();
    onRowRemarkChange?.(rowIndex, trimmed);
    setEditingRow(null);
    setDraftRemark("");
  };

  const cancelRemark = () => {
    setEditingRow(null);
    setDraftRemark("");
  };

  return (
    <div className="w-full border border-outline-variant rounded-xl overflow-hidden mb-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[#1F2937]">
      <div className="w-full overflow-x-auto">
        <table className="w-full table-auto text-left border-collapse text-[13px] min-[360px]:text-sm">
          <thead className="bg-surface-container-high dark:bg-[#1F2937]">
            <tr>
              {table.headers.map((h, i) => (
                <th
                  key={i}
                  className="p-2 min-[360px]:p-3 font-semibold text-[12px] min-[360px]:text-[13px] tracking-tight text-on-surface-variant dark:text-[#FFFFFF] whitespace-normal break-words align-top border-b border-outline-variant dark:border-[#1F2937]"
                >
                  {renderCellContent(h)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-outline-variant dark:divide-[#1F2937]">
            {table.rows.map((row, ri) => (
              <tr
                key={ri}
                className={
                  (rowHasIssue(row)
                    ? "bg-danger/5"
                    : "hover:bg-panel-tint transition-colors duration-150 dark:hover:bg-[#1F2937]") +
                  " animate-[rowIn_0.3s_ease-out_both]"
                }
                style={{ animationDelay: `${Math.min(ri, 12) * 25}ms` }}
              >
                {row.map((cell, ci) => {
                  const isTeacherRemarks = ci === teacherRemarksColIdx;
                  const isFinalStatus = ci === finalStatusColIdx;
                  const isQuestionCol = isQuestionCheckTable && ci === questionColIdx;
                  const rowFailed =
                    statusColIdx !== -1
                      ? isIssueValue(row[statusColIdx])
                      : row.some((c, i) => statusCols[i] && isIssueValue(c));
                  const hasRemark = cell && cell !== "---" && cell.trim().length > 0;
                  const needsRemark = rowFailed ||
                    (finalStatusColIdx !== -1 && !isYesValue(row[finalStatusColIdx]));

                  if (isTeacherRemarks && onRowRemarkChange) {
                    if (editingRow === ri) {
                      return (
                        <td key={ci} className="p-2 min-[360px]:p-3 text-on-surface dark:text-[#FFFFFF] align-top min-w-0">
                          <div className="flex flex-col gap-2 w-full min-w-0">
                            <input
                              type="text"
                              value={draftRemark}
                              placeholder="Add teacher remarks..."
                              autoFocus
                              onChange={(e) => setDraftRemark(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveRemark(ri);
                                if (e.key === "Escape") cancelRemark();
                              }}
                              className="w-full min-w-0 text-sm px-2.5 min-[360px]:px-3 py-2 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary dark:bg-[#111827] dark:border-[#374151] dark:text-[#FFFFFF] dark:placeholder-[#6B7280]"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => saveRemark(ri)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] text-white text-xs font-semibold hover:bg-primary-hover active:scale-[0.97] transition-all"
                              >
                                <span className="material-symbols-outlined text-[16px]">check</span>
                                OK
                              </button>
                              <button
                                type="button"
                                onClick={cancelRemark}
                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-outline-variant text-on-surface-variant text-xs font-semibold hover:bg-surface-container-high transition-colors dark:border-[#374151] dark:text-[#E1E4E8] dark:hover:bg-[#1F2937]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      );
                    }

                    if (hasRemark) {
                      return (
                        <td key={ci} className="p-2 min-[360px]:p-3 text-on-surface dark:text-[#FFFFFF] align-top min-w-0">
                          <div className="flex flex-col gap-2 min-w-0">
                            <p className="text-[13px] min-[360px]:text-sm leading-6 whitespace-normal break-words">
                              {cell}
                            </p>
                            <button
                              type="button"
                              onClick={() => beginRemarkEdit(ri, cell)}
                              className="self-start inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] hover:underline dark:text-[#5eead4]"
                            >
                              <span className="material-symbols-outlined text-[15px]">edit</span>
                              Edit remark
                            </button>
                          </div>
                        </td>
                      );
                    }

                    if (needsRemark) {
                      return (
                        <td key={ci} className="p-2 min-[360px]:p-3 text-on-surface dark:text-[#FFFFFF] align-top min-w-0">
                          <button
                            type="button"
                            onClick={() => beginRemarkEdit(ri, "")}
                            className="inline-flex items-center gap-1.5 px-2.5 min-[360px]:px-3 py-2 rounded-md border border-[#0F766E] text-[#0F766E] text-xs font-semibold hover:bg-panel-tint active:scale-[0.97] transition-all dark:hover:bg-[#1F2937]"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit_note</span>
                            Add remark
                          </button>
                        </td>
                      );
                    }

                    return (
                      <td key={ci} className="p-2 min-[360px]:p-3 text-on-surface-variant dark:text-[#94a3b8] align-top min-w-0">
                        —
                      </td>
                    );
                  }

                  if (isFinalStatus || statusCols[ci]) {
                    return (
                      <td key={ci} className="p-2 min-[360px]:p-3 text-on-surface dark:text-[#FFFFFF] align-top whitespace-normal break-words">
                        <StatusBadge value={cell} />
                      </td>
                    );
                  }

                  if (isBloomTable && ci === bloomQuestionColIdx) {
                    const boldMatches = cell.match(/\*\*([^*]+)\*\*/g) || [];
                    if (boldMatches.length === 0) {
                      const clean = cell.replace(/---+/g, "").trim();
                      return (
                        <td key={ci} className="p-2 min-[360px]:p-3 text-on-surface-variant dark:text-[#94a3b8] align-top whitespace-normal break-words min-w-0">
                          {clean && clean.toLowerCase() !== "none" ? clean : "—"}
                        </td>
                      );
                    }
                    return (
                      <td key={ci} className="p-2 min-[360px]:p-3 text-on-surface dark:text-[#FFFFFF] align-top whitespace-normal break-words min-w-0">
                        {boldMatches.map((m, i) => (
                          <strong key={i} className="font-bold text-[#0f766e] dark:text-[#5eead4]">
                            {m.slice(2, -2)}{i < boldMatches.length - 1 ? ", " : ""}
                          </strong>
                        ))}
                      </td>
                    );
                  }

                  if (isQuestionCol) {
                    if (!rowFailed) {
                      return (
                        <td key={ci} className="p-2 min-[360px]:p-3 text-on-surface-variant dark:text-[#94a3b8] align-top whitespace-normal break-words min-w-0">
                          —
                        </td>
                      );
                    }
                    return (
                      <td key={ci} className="p-2 min-[360px]:p-3 text-on-surface dark:text-[#FFFFFF] align-top whitespace-normal break-words min-w-0">
                        {renderCellContent(cell, false)}
                      </td>
                    );
                  }

                  return (
                    <td key={ci} className="p-2 min-[360px]:p-3 text-on-surface dark:text-[#FFFFFF] align-top whitespace-normal break-words min-w-0">
                      {renderCellContent(cell, ci === 0)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SKELETON / LOADING PRIMITIVES
// ─────────────────────────────────────────────────────────────

function SkeletonBar({ width = "100%", height = 12 }: { width?: string; height?: number }) {
  return (
    <div
      className="rounded-md bg-gradient-to-r from-surface-container-high via-[#e7ecef] to-surface-container-high bg-[length:200%_100%] animate-[shimmer_1.6s_ease-in-out_infinite] dark:from-[#1F2937] dark:via-[#273548] dark:to-[#1F2937]"
      style={{ width, height }}
    />
  );
}

function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full border border-outline-variant rounded-xl overflow-hidden mb-4 dark:border-[#1F2937]">
      <div className="grid gap-px bg-outline-variant/40 dark:bg-[#1F2937]" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, c) => (
          <div key={`h-${c}`} className="bg-surface-container-high dark:bg-[#1F2937] p-2 min-[360px]:p-3">
            <SkeletonBar width={c === 0 ? "70%" : "55%"} height={11} />
          </div>
        ))}
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <div
              key={`c-${r}-${c}`}
              className="bg-surface dark:bg-[#0A0C10] p-2 min-[360px]:p-3 animate-[fadeIn_0.4s_ease-out_both]"
              style={{ animationDelay: `${r * 70}ms` }}
            >
              <SkeletonBar width={c === 0 ? "85%" : `${45 + ((r * 13 + c * 21) % 40)}%`} height={11} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const CONVERGENCE_SOURCES = [
  { icon: "library_books", tx: -72, ty: -46 },
  { icon: "article", tx: 72, ty: -46 },
  { icon: "menu_book", tx: -72, ty: 46 },
  { icon: "fact_check", tx: 72, ty: 46 },
];

function StreamingIndicator({ label }: { label: string }) {
  const phrases = useMemo(
    () => [
      label,
      "Reading the CIS and exam paper...",
      "Cross-referencing your source material...",
    ],
    [label]
  );
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    setPhraseIndex(0);
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }, 2200);
    return () => clearInterval(id);
  }, [phrases]);

  return (
    <div className="flex flex-col items-center justify-center py-4 min-[360px]:py-5 mb-1">
      <div className="relative w-[130px] h-[100px] min-[360px]:w-[160px] min-[360px]:h-[124px] shrink-0">
        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 160 124">
          {CONVERGENCE_SOURCES.map((n, i) => (
            <line
              key={i}
              x1={80 + n.tx}
              y1={62 + n.ty}
              x2={80}
              y2={62}
              strokeWidth="1.5"
              strokeDasharray="3 6"
              strokeLinecap="round"
              className="stroke-[#0F766E]/25 dark:stroke-[#5eead4]/20"
              style={{
                animation: "traceFlow 1.4s linear infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </svg>

        {CONVERGENCE_SOURCES.map((n, i) => (
          <div
            key={i}
            className="absolute w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 -ml-3.5 min-[360px]:-ml-4 -mt-3.5 min-[360px]:-mt-4 rounded-lg bg-surface border border-[#0F766E]/25 flex items-center justify-center shadow-[0_1px_4px_rgba(15,118,110,0.15)] dark:bg-[#111827] dark:border-[#0F766E]/40"
            style={{
              left: `calc(50% + ${n.tx}px)`,
              top: `calc(50% + ${n.ty}px)`,
              animation: "docConverge 2.6s ease-in-out infinite",
              animationDelay: `${i * 0.3}s`,
              ["--tx" as any]: `${n.tx * -0.22}px`,
              ["--ty" as any]: `${n.ty * -0.22}px`,
            }}
          >
            <span className="material-symbols-outlined text-[14px] min-[360px]:text-[16px] text-[#0F766E] dark:text-[#5eead4]">
              {n.icon}
            </span>
          </div>
        ))}

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute -inset-3 rounded-full bg-[#0F766E]/15 dark:bg-[#5eead4]/10 animate-ping" />
          <span className="absolute -inset-5 rounded-full border border-[#0F766E]/20 dark:border-[#5eead4]/20 animate-[hubRing_2s_ease-out_infinite]" />
          <span
            className="absolute -inset-5 rounded-full border border-[#0F766E]/20 dark:border-[#5eead4]/20 animate-[hubRing_2s_ease-out_infinite]"
            style={{ animationDelay: "1s" }}
          />
          <div className="relative w-8 h-8 min-[360px]:w-9 min-[360px]:h-9 rounded-full bg-[#0F766E] flex items-center justify-center shadow-[0_0_0_5px_rgba(15,118,110,0.12)]">
            <span className="material-symbols-outlined text-[15px] min-[360px]:text-[17px] text-white animate-[hubPulse_1.6s_ease-in-out_infinite]">
              auto_awesome
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-2 h-10 min-[360px]:h-9 w-full max-w-[300px] text-center px-2">
        <p
          key={phraseIndex}
          className="absolute inset-0 flex items-center justify-center text-[13px] min-[360px]:text-sm font-semibold leading-snug text-[#0F766E] dark:text-[#5eead4] animate-[fadeSlideUp_0.35s_ease-out]"
        >
          {phrases[phraseIndex]}
        </p>
      </div>
    </div>
  );
}

function ComplianceGauge({ value }: { value: string }) {
  const numeric = parseInt(value, 10);
  const pct = Number.isFinite(numeric) ? Math.max(0, Math.min(100, numeric)) : 0;
  const hasValue = value !== "—";
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 80 ? "#15803D" : pct >= 50 ? "#B45309" : "#B91C1C";

  return (
    <div className="relative w-[110px] h-[110px] min-[360px]:w-[132px] min-[360px]:h-[132px] mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-surface-container-high dark:stroke-[#1F2937]" />
        {hasValue && (
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-[1200ms] ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display-lg text-2xl min-[360px]:text-3xl font-bold text-on-surface dark:text-[#FFFFFF] tabular-nums">
          {hasValue ? `${pct}%` : "—"}
        </span>
        <span className="text-[10px] min-[360px]:text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant dark:text-[#94a3b8] mt-0.5">
          Compliant
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface CISItem {
  cis_id: string;
  course_id: string;
  course_name: string;
  department: string;
  semester?: number | null;
  link?: string;
  last_update_time?: string;
}

interface VetWizardProps {
  onClose: () => void;
  cisItems?: CISItem[];
  defaultDepartment?: string;
  defaultSemester?: number;
  onToast?: (message: string, type?: "success" | "error") => void;
  onFinish?: (result: {
    finalReport: string;
    sessionId: string;
    filePath: string | null;
    courseName: string;
    courseCode: string;
    paperType: string;
  }) => Promise<void>;
  onHistorySaved?: (reportId: string) => void;
}

const STEPS = [
  "Select CIS",
  "Upload Lectures",
  "Upload Paper",
  "Marks Division",
  "CLO Mapping",
  "Question Check",
  "Bloom's Taxonomy",
  "Final Report",
];

const STEP_ICONS = [
  "library_books",
  "upload_file",
  "article",
  "analytics",
  "fact_check",
  "rule",
  "psychology",
  "verified",
];

const STEP_LOADING_LABEL: Record<number, string> = {
  4: "Cross-checking marks distribution against the CIS...",
  5: "Mapping questions to course learning outcomes...",
  6: "Comparing questions against lecture content...",
  7: "Classifying questions by cognitive level...",
};

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function VetWizard({
  onClose,
  cisItems,
  defaultDepartment = "",
  defaultSemester,
  onToast,
  onFinish,
  onHistorySaved,
}: VetWizardProps) {
  const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  const API = `${BASE_URL}/api/v1`;

  const token = () =>
    typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";

  const refreshAccessToken = async (): Promise<string | null> => {
    if (typeof window === "undefined") return null;

    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const nextAccessToken =
        data?.access_token || data?.session?.access_token || null;

      if (!nextAccessToken) return null;

      localStorage.setItem("access_token", nextAccessToken);

      if (data?.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }

      return nextAccessToken;
    } catch {
      return null;
    }
  };

  const clearAuthAndNotify = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    onToast?.("Your session has expired. Please log in again.", "error");
  };

  const authFetch = async (
    input: RequestInfo | URL,
    init: RequestInit = {},
    retry = true
  ): Promise<Response> => {
    const headers = new Headers(init.headers || {});
    const currentToken = token();

    if (currentToken) {
      headers.set("Authorization", `Bearer ${currentToken}`);
    }

    let response = await fetch(input, { ...init, headers });

    if (response.status === 401 && retry) {
      const nextToken = await refreshAccessToken();

      if (!nextToken) {
        clearAuthAndNotify();
        return response;
      }

      headers.set("Authorization", `Bearer ${nextToken}`);
      response = await fetch(input, { ...init, headers });
    }

    return response;
  };

  const extractErrorDetail = async (response: Response): Promise<string> => {
    try {
      const data = await response.clone().json();

      if (typeof data?.detail === "string") return data.detail;

      if (Array.isArray(data?.detail)) {
        return data.detail
          .map((item: any) => item?.msg || item?.message || JSON.stringify(item))
          .join(", ");
      }

      if (typeof data?.message === "string") return data.message;
    } catch {
      // Fall through to text response.
    }

    try {
      const text = await response.clone().text();
      if (text.trim()) return text.trim();
    } catch {
      // Ignore unreadable response bodies.
    }

    return `Server error ${response.status}`;
  };

  const [step, setStep] = useState(1);
  const [sessionId, setSessionId] = useState("");

  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const markStepComplete = (stepNumber: number, complete = true) => {
    setCompletedSteps((prev) => ({ ...prev, [stepNumber]: complete }));
  };

  const invalidateFromStep = (fromStep: number) => {
    setCompletedSteps((prev) => {
      const next = { ...prev };
      for (let i = fromStep; i <= 8; i++) next[i] = false;
      return next;
    });
  };

  const [allCIS, setAllCIS] = useState<CISItem[]>([]);
  const [cisLoading, setCisLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState(defaultDepartment || "");
  const [selectedSemester, setSelectedSemester] = useState<number | "">(defaultSemester ?? "");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          allCIS
            .map((item) => item.department)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [allCIS]
  );

  const semesters = useMemo(
    () =>
      Array.from(
        new Set(
          allCIS
            .filter((item) => item.department === selectedDepartment)
            .map((item) => item.semester)
            .filter((value): value is number => typeof value === "number")
        )
      ).sort((a, b) => a - b),
    [allCIS, selectedDepartment]
  );

  const courses = useMemo(
    () =>
      allCIS.filter(
        (item) =>
          item.department === selectedDepartment &&
          (selectedSemester === "" || item.semester === selectedSemester)
      ),
    [allCIS, selectedDepartment, selectedSemester]
  );

  const departmentOptions: SearchableOption[] = useMemo(
    () => departments.map((d) => ({ value: d, label: d })),
    [departments]
  );

  const semesterOptions: SearchableOption[] = useMemo(
    () =>
      semesters.map((s) => ({
        value: String(s),
        label: `Semester ${s}`,
      })),
    [semesters]
  );

  const courseOptions: SearchableOption[] = useMemo(
    () =>
      courses.map((c) => ({
        value: c.cis_id,
        label: `${c.course_id} · ${c.course_name}`,
      })),
    [courses]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setCisLoading(true);

      try {
        const response = await authFetch(`${API}/cis`);

        if (!response.ok) {
          throw new Error(await extractErrorDetail(response));
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid CIS response from backend.");
        }

        if (cancelled) return;

        setAllCIS(data as CISItem[]);
        setSelectedDepartment((prev) => {
          if (prev && data.some((item: CISItem) => item.department === prev)) {
            return prev;
          }
          return data[0]?.department || "";
        });
      } catch (error) {
        if (!cancelled) {
          onToast?.(
            error instanceof Error ? error.message : "Failed to load CIS documents",
            "error"
          );
        }
      } finally {
        if (!cancelled) setCisLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedDepartment) {
      setSelectedSemester("");
      setSelectedCourseId("");
      return;
    }

    setSelectedSemester((prev) =>
      prev !== "" && semesters.includes(prev) ? prev : semesters[0] ?? ""
    );
  }, [selectedDepartment, semesters]);

  useEffect(() => {
    setSelectedCourseId((prev) =>
      courses.some((item) => item.cis_id === prev) ? prev : courses[0]?.cis_id || ""
    );
  }, [courses]);

  const handleDepartmentChange = (dept: string) => {
    setSelectedDepartment(dept);
    setSelectedSemester("");
    setSelectedCourseId("");
  };

  const handleSemesterChange = (sem: number | "") => {
    setSelectedSemester(sem);
    setSelectedCourseId("");
  };

  const selectedCourse = useMemo(
    () => courses.find((item) => item.cis_id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const [lectureFiles, setLectureFiles] = useState<File[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isIngestDone, setIsIngestDone] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestProgress, setIngestProgress] = useState(0);
  const [ingestDetail, setIngestDetail] = useState("");

  const ingestStartRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [paperType, setPaperType] = useState("");
  const [paperLink, setPaperLink] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isUploadingPaper, setIsUploadingPaper] = useState(false);

  const [reportMarks, setReportMarks] = useState("");
  const [reportCLO, setReportCLO] = useState("");
  const [reportQuestions, setReportQuestions] = useState("");
  const [reportBloom, setReportBloom] = useState("");
  const [reportFinal, setReportFinal] = useState("");
  const [loadingReports, setLoadingReports] = useState<Record<number, boolean>>({});

  const controllersRef = useRef<Record<number, AbortController | null>>({});

  const [isFinishing, setIsFinishing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const stepsRef = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      Object.values(controllersRef.current).forEach((controller) => controller?.abort());
    };
  }, []);

  const scrollToStep = (target: number) => {
    setTimeout(() => {
      stepsRef.current[target]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const goToStep = (target: number, justCompletedStep?: number) => {
    const safeTarget = Math.min(8, Math.max(1, target));

    if (safeTarget > step) {
      for (let required = 1; required < safeTarget; required++) {
        if (required !== justCompletedStep && !completedSteps[required]) {
          onToast?.(
            `Step ${required} (${STEPS[required - 1]}) must be completed before continuing.`,
            "error"
          );
          scrollToStep(step);
          return;
        }
      }
    }

    setStep(safeTarget);
    scrollToStep(safeTarget);
  };

  const startVetting = () => {
    if (!selectedCourse?.link) {
      onToast?.("Please select a course with an uploaded CIS document first", "error");
      return;
    }

    const newSessionId = crypto
      .randomUUID()
      .replace(/[^A-Za-z0-9_-]/g, "")
      .slice(0, 64);
    setSessionId(newSessionId);
    markStepComplete(1);
    goToStep(2, 1);
  };

  const startIngestion = async () => {
    if (lectureFiles.length === 0) {
      onToast?.("Please select at least one lecture file.", "error");
      return;
    }

    if (!sessionId) {
      onToast?.("Session is not ready. Please start vetting again.", "error");
      return;
    }

    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    setIsIngesting(true);
    setIngestError(null);
    setIsIngestDone(false);
    setProgressMsg("Uploading files...");
    setIngestProgress(5);
    setIngestDetail("Preparing upload...");
    ingestStartRef.current = Date.now();

    const formData = new FormData();
    formData.append("session_id", sessionId);
    lectureFiles.forEach((file) => formData.append("files", file, file.name));

    try {
      const response = await authFetch(`${API}/analyzer/lectures/ingest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });

      const responseText = await response.text();

      if (!response.ok) {
        const detail = await extractErrorDetail(response);
        throw new Error(detail || `Upload failed (${response.status})`);
      }

      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("Backend returned invalid JSON.");
      }

      if (data.status !== "ok") {
        throw new Error(data.detail || data.message || "Failed to start embedding generation.");
      }

      setProgressMsg(data.message || "Files uploaded. Generating embeddings...");
      setIngestProgress(10);
      setIngestDetail("Embedding generation started...");

      let consecutiveFailures = 0;
      let consecutiveUnknown = 0;
      const MAX_POLL_MS = 20 * 60 * 1000;

      const failWith = (message: string) => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }

        setIsIngesting(false);
        setIsIngestDone(false);
        setIngestProgress(0);
        setIngestError(message);
        setProgressMsg("Embedding generation failed.");
        setIngestDetail("");
        onToast?.(message, "error");
      };

      pollRef.current = setInterval(async () => {
        const elapsed = Date.now() - ingestStartRef.current;

        if (elapsed > MAX_POLL_MS) {
          failWith("Embedding generation took too long. Please check your backend and AI service.");
          return;
        }

        try {
          const statusResponse = await authFetch(
            `${API}/analyzer/lectures/ingest-status/${sessionId}`,
            { method: "GET", headers: { Authorization: `Bearer ${token()}` } }
          );

          const statusText = await statusResponse.text();

          if (!statusResponse.ok) {
            throw new Error(`Status API failed (${statusResponse.status}): ${statusText}`);
          }

          let status: any;

          try {
            status = JSON.parse(statusText);
          } catch {
            throw new Error("Invalid JSON from embedding status API.");
          }

          consecutiveFailures = 0;

          if (status.status === "processing") {
            consecutiveUnknown = 0;

            const total = Number(status.total_files) || lectureFiles.length;
            const completed = Number(status.completed_files) || 0;

            const progress =
              total > 0
                ? Math.min(95, Math.max(10, Math.round((completed / total) * 100)))
                : 10;

            setIngestProgress(progress);
            setProgressMsg(status.message || "Generating embeddings...");
            setIngestDetail(
              status.current_file
                ? `${completed} of ${total} files • ${status.total_chunks || 0} chunks`
                : `${total} file${total === 1 ? "" : "s"} being processed...`
            );

            return;
          }

          if (status.status === "completed") {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }

            setIngestProgress(100);
            setProgressMsg(status.message || "Embeddings generated successfully!");
            setIngestDetail(`${status.total_chunks || 0} chunks stored`);
            setIsIngesting(false);
            setIsIngestDone(true);
            markStepComplete(2);

            autoAdvanceRef.current = setTimeout(() => {
              goToStep(3, 2);
            }, 800);

            return;
          }

          if (status.status === "failed" || status.status === "error") {
            failWith(status.message || status.detail || "Embedding generation failed on the server.");
            return;
          }

          consecutiveUnknown++;

          if (consecutiveUnknown >= 10) {
            failWith("Embedding job was not found. Please make sure the AI embedding service is running.");
            return;
          }

          setProgressMsg("Waiting for embedding service...");
          setIngestDetail(`Waiting for job... ${Math.round(elapsed / 1000)}s`);
        } catch (error) {
          consecutiveFailures++;

          if (consecutiveFailures >= 5) {
            failWith(error instanceof Error ? error.message : "Lost connection to embedding service.");
          } else {
            setProgressMsg("Reconnecting to embedding service...");
            setIngestDetail(`Retrying... attempt ${consecutiveFailures}/5`);
          }
        }
      }, 1500);
    } catch (error) {
      setIsIngesting(false);
      setIngestProgress(0);

      const message = error instanceof Error ? error.message : "Failed to upload files.";
      setIngestError(message);
      onToast?.(message, "error");
    }
  };

  const handleUploadPaper = async () => {
    if (!paperFile) {
      onToast?.("Please upload the exam paper first", "error");
      return;
    }

    if (paperType !== "midterm" && paperType !== "final") {
      onToast?.("Please select Midterm or Final paper type", "error");
      return;
    }

    setIsUploadingPaper(true);

    try {
      const formData = new FormData();
      formData.append("file", paperFile, paperFile.name);

      const response = await authFetch(`${API}/paper/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });

      const responseText = await response.text();

      if (!response.ok) {
        const detail = await extractErrorDetail(response);
        throw new Error(detail || `Upload failed (${response.status})`);
      }

      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error("Backend returned invalid JSON: " + responseText);
      }

      setPaperLink(data.paper_link ?? null);
      setFilePath(data.file_path ?? null);
      markStepComplete(3);
      goToStep(4, 3);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload paper.";
      onToast?.(message, "error");
    } finally {
      setIsUploadingPaper(false);
    }
  };

  const streamReport = async (
    targetStep: number,
    url: string,
    init: RequestInit,
    setter: (s: string) => void
  ) => {
    setLoadingReports((prev) => ({ ...prev, [targetStep]: true }));
    markStepComplete(targetStep, false);

    const controller = new AbortController();
    controllersRef.current[targetStep]?.abort();
    controllersRef.current[targetStep] = controller;

    try {
      const response = await authFetch(url, { ...init, signal: controller.signal });

      if (!response.ok) {
        let message = "";

        try {
          const data = await response.json();
          if (data?.detail) message = String(data.detail);
        } catch {
          // Non-JSON error response.
        }

        if (!message) {
          switch (response.status) {
            case 401:
              message = "Your session has expired. Please log in again.";
              break;
            case 403:
              message = "Not authorized to generate this report.";
              break;
            case 409:
              message = "Lecture data issue for this report. Please check lecture upload status.";
              break;
            case 400:
              message = await extractErrorDetail(response);
              break;
            case 413:
              message = "Uploaded file(s) exceed the server size limit.";
              break;
            case 422:
              message = "Invalid request. Please check the CIS, paper, session, and paper type.";
              break;
            case 500:
              message = "AI service internal error. Please try again later.";
              break;
            case 503:
              message = "AI service is unavailable. Please try again later.";
              break;
            default:
              message = `Server error ${response.status}`;
          }
        }

        throw new Error(message);
      }

      const fullReport = await readReportStream(response, controller.signal, setter);

      if (!controller.signal.aborted) {
        setter(fullReport);
        if (fullReport.trim().length > 0) {
          markStepComplete(targetStep);
        }
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return;

      const message = error instanceof Error ? error.message : "Error generating report. Please try again.";
      setter(message);
      onToast?.(message, "error");
    } finally {
      setLoadingReports((prev) => ({ ...prev, [targetStep]: false }));

      if (controllersRef.current[targetStep] === controller) {
        controllersRef.current[targetStep] = null;
      }
    }
  };

  const generateMarks = () => {
    if (!selectedCourse?.link) {
      onToast?.("CIS document is missing. Please select a CIS.", "error");
      return;
    }

    if (!paperLink) {
      onToast?.("Exam paper is missing. Please upload the paper first.", "error");
      return;
    }

    if (paperType !== "midterm" && paperType !== "final") {
      onToast?.("Please select Midterm or Final paper type.", "error");
      return;
    }

    return streamReport(
      4,
      `${API}/analyzer/reports/mark-division`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          cis_link: selectedCourse.link,
          paper_link: paperLink,
          session_id: sessionId || null,
          paper_type: paperType,
        }),
      },
      setReportMarks
    );
  };

  const generateCLO = () => {
    if (!selectedCourse?.link) {
      onToast?.("CIS document is missing. Please select a CIS.", "error");
      return;
    }

    if (!paperLink) {
      onToast?.("Exam paper is missing. Please upload the paper first.", "error");
      return;
    }

    if (paperType !== "midterm" && paperType !== "final") {
      onToast?.("Please select Midterm or Final paper type.", "error");
      return;
    }

    return streamReport(
      5,
      `${API}/analyzer/reports/clo-mapping`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          cis_link: selectedCourse.link,
          paper_link: paperLink,
          session_id: sessionId || null,
          paper_type: paperType,
        }),
      },
      setReportCLO
    );
  };

  const generateQuestions = () => {
    if (!selectedCourse?.link) {
      onToast?.("CIS document is missing. Please select a CIS.", "error");
      return;
    }

    if (!paperLink) {
      onToast?.("Exam paper is missing. Please upload the paper first.", "error");
      return;
    }

    if (!sessionId) {
      onToast?.("Session is not ready. Please start vetting again.", "error");
      return;
    }

    if (!isIngestDone && lectureFiles.length === 0) {
      onToast?.("Question Check requires lecture material. Upload lectures first.", "error");
      return;
    }

    const fd = new FormData();
    fd.append("cis_link", selectedCourse.link);
    fd.append("paper_link", paperLink);
    fd.append("session_id", sessionId);

    if (paperType) fd.append("paper_type", paperType);

    lectureFiles.forEach((file) => fd.append("files", file));

    return streamReport(
      6,
      `${API}/analyzer/reports/questions-check-with-lectures`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      },
      setReportQuestions
    );
  };

  const generateBloom = () => {
    if (!selectedCourse?.link) {
      onToast?.("CIS document is missing. Please select a CIS.", "error");
      return;
    }

    if (!paperLink) {
      onToast?.("Exam paper is missing. Please upload the paper first.", "error");
      return;
    }

    if (paperType !== "midterm" && paperType !== "final") {
      onToast?.("Please select Midterm or Final paper type.", "error");
      return;
    }

    return streamReport(
      7,
      `${API}/analyzer/reports/bloom-taxonomy`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          cis_link: selectedCourse.link,
          paper_link: paperLink,
          session_id: sessionId || null,
          paper_type: paperType,
        }),
      },
      setReportBloom
    );
  };

  useEffect(() => {
    if (step === 4 && paperLink && paperType && !reportMarks && !loadingReports[4]) {
      generateMarks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === 5 && paperLink && !reportCLO && !loadingReports[5]) {
      generateCLO();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === 6 && paperLink && !reportQuestions && !loadingReports[6]) {
      generateQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step === 7 && paperLink && !reportBloom && !loadingReports[7]) {
      generateBloom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const generateFinal = () => {
    const subReportsReady =
      reportMarks.trim().length > 0 &&
      reportCLO.trim().length > 0 &&
      reportQuestions.trim().length > 0 &&
      reportBloom.trim().length > 0;

    streamReport(
      8,
      subReportsReady
        ? `${API}/analyzer/reports/final/synthesize`
        : `${API}/analyzer/reports/final`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(
          subReportsReady
            ? {
                mark_division_report: reportMarks,
                clo_mapping_report: reportCLO,
                question_check_report: reportQuestions,
                bloom_taxonomy_report: reportBloom,
                course_name: selectedCourse?.course_name || "",
                course_code: selectedCourse?.course_id || "",
                paper_type: paperType || "",
                cis_link: selectedCourse?.link,
                paper_link: paperLink,
              }
            : {
                cis_link: selectedCourse?.link,
                paper_link: paperLink,
                session_id: sessionId || null,
              }
        ),
      },
      setReportFinal
    );
  };

  useEffect(() => {
    if (step === 8 && !reportFinal && !loadingReports[8]) {
      generateFinal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const hasSubReports =
    reportMarks.trim().length > 0 &&
    reportCLO.trim().length > 0 &&
    reportQuestions.trim().length > 0 &&
    reportBloom.trim().length > 0;

  const reportIssues = (md: string): number => {
    if (!md || typeof md !== "string") return 0;
    return parseMarkdownTables(md).reduce((sum, table) => {
      if (!table || !Array.isArray(table.headers) || !Array.isArray(table.rows)) return sum;
      const statusCols = table.headers.map((h) => STATUS_COLUMN.test(h || ""));
      const finalStatusColIdx = table.headers.findIndex((h) => /final\s*status/i.test(h || ""));

      const issueRows = table.rows.filter((row) => {
        if (!row || !Array.isArray(row)) return false;
        if (finalStatusColIdx !== -1 && finalStatusColIdx < row.length && isYesValue(row[finalStatusColIdx])) {
          return false;
        }
        return row.some((cell, ci) => statusCols[ci] && isIssueValue(cell));
      }).length;

      return sum + issueRows;
    }, 0);
  };

  const issuesPill = (count: number, note?: string) =>
    count > 0 ? (
      <span className="inline-flex items-center gap-1.5 text-danger font-label-sm ml-auto bg-danger/10 px-2 min-[360px]:px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] min-[360px]:text-xs">
        <span className="material-symbols-outlined text-[13px] min-[360px]:text-[14px]">error</span>
        {note ? `${count} issue${count === 1 ? "" : "s"} — ${note}` : `${count} issue${count === 1 ? "" : "s"}`}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-[#15803D] font-label-sm ml-auto bg-[#15803D]/10 px-2 min-[360px]:px-2.5 py-1 rounded-full whitespace-nowrap text-[11px] min-[360px]:text-xs">
        <span className="material-symbols-outlined text-[13px] min-[360px]:text-[14px]">check_circle</span>
        No issues
      </span>
    );

  const reportBody = (md: string, onUpdateReport?: (newMd: string) => void) => {
    const tables = parseMarkdownTables(md);

    if (tables.length === 0) {
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
          {md}
        </ReactMarkdown>
      );
    }

    return (
      <>
        {tables.map((table, i) => (
          <ReportTable
            key={i}
            table={table}
            onRowRemarkChange={
              onUpdateReport
                ? (rowIndex, remarks) => {
                    const newTable: ReportTable = {
                      headers: [...table.headers],
                      rows: table.rows.map((r, ri) => (ri === rowIndex ? [...r] : [...r])),
                    };
                    const teacherRemarksColIdx = newTable.headers.findIndex((h) =>
                      /teacher\s*remarks?/i.test(h || "")
                    );
                    const finalStatusColIdx = newTable.headers.findIndex((h) =>
                      /final\s*status/i.test(h || "")
                    );

                    const trimmed = remarks.trim();

                    if (teacherRemarksColIdx !== -1) {
                      newTable.rows[rowIndex][teacherRemarksColIdx] = trimmed || "---";
                    }

                    if (finalStatusColIdx !== -1) {
                      newTable.rows[rowIndex][finalStatusColIdx] = trimmed ? "Yes" : "Pending";
                    }

                    const updatedMd = updateMarkdownTable(md, i, newTable);
                    onUpdateReport(updatedMd);
                  }
                : undefined
            }
          />
        ))}
      </>
    );
  };

  const reportSection = (
    icon: string,
    title: string,
    md: string,
    onUpdateReport?: (newMd: string) => void
  ) => {
    const tables = parseMarkdownTables(md);

    return (
      <section>
        <h4 className="font-headline-md text-[15px] min-[360px]:text-[17px] mb-3 flex flex-wrap items-center gap-2 min-[360px]:gap-2.5 dark:text-[#FFFFFF]">
          <span className="w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 rounded-lg bg-[#0F766E]/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] text-[#0F766E] dark:text-[#5eead4]">{icon}</span>
          </span>
          {title}
          {md ? issuesPill(reportIssues(md)) : null}
        </h4>

        {tables.length > 0 ? (
          tables.map((table, i) => (
            <ReportTable
              key={i}
              table={table}
              onRowRemarkChange={
                onUpdateReport
                  ? (rowIndex, remarks) => {
                      const newTable: ReportTable = {
                        headers: [...table.headers],
                        rows: table.rows.map((r, ri) => (ri === rowIndex ? [...r] : [...r])),
                      };
                      const teacherRemarksColIdx = newTable.headers.findIndex((h) =>
                        /teacher\s*remarks?/i.test(h || "")
                      );
                      const finalStatusColIdx = newTable.headers.findIndex((h) =>
                        /final\s*status/i.test(h || "")
                      );

                      const trimmed = remarks.trim();

                      if (teacherRemarksColIdx !== -1) {
                        newTable.rows[rowIndex][teacherRemarksColIdx] = trimmed || "---";
                      }

                      if (finalStatusColIdx !== -1) {
                        newTable.rows[rowIndex][finalStatusColIdx] = trimmed ? "Yes" : "Pending";
                      }

                      const updatedMd = updateMarkdownTable(md, i, newTable);
                      onUpdateReport(updatedMd);
                    }
                  : undefined
              }
            />
          ))
        ) : md ? (
          <div className="border border-outline-variant rounded-xl overflow-hidden p-3 min-[360px]:p-4 dark:border-[#1F2937] markdown-content overflow-x-hidden">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
              {md}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-body-sm text-on-surface-variant dark:text-[#E1E4E8]">Not generated yet.</p>
        )}
      </section>
    );
  };

  const compliance = useMemo(() => {
    const reports = [reportCLO, reportMarks, reportQuestions, reportBloom].filter(Boolean);

    if (reports.length === 0) return "—";

    let yes = 0;
    let total = 0;

    reports.forEach((md) => {
      parseMarkdownTables(md).forEach((table) => {
        if (!table || !Array.isArray(table.headers) || !Array.isArray(table.rows)) return;
        const statusCols = table.headers.map((h) => STATUS_COLUMN.test(h || ""));
        const finalStatusColIdx = table.headers.findIndex((h) => /final\s*status/i.test(h || ""));

        table.rows.forEach((row) => {
          if (!row || !Array.isArray(row)) return;

          if (finalStatusColIdx !== -1 && finalStatusColIdx < row.length) {
            total++;
            if (isYesValue(row[finalStatusColIdx])) yes++;
            return;
          }

          row.forEach((cell, ci) => {
            if (!statusCols[ci]) return;

            if (isYesValue(cell) || isIssueValue(cell)) {
              total++;
              if (isYesValue(cell)) yes++;
            }
          });
        });
      });
    });

    if (total === 0) return "—";

    return `${Math.round((yes / total) * 100)}%`;
  }, [reportCLO, reportMarks, reportQuestions, reportBloom]);

  const verdictMatch =
    reportFinal.match(/##\s*Verdict\s*\n+\**\s*(ACCEPT|REJECTED)\s*\**/i) ||
    reportFinal.match(/\*{0,2}Verdict:?\*{0,2}\s*\**\s*(ACCEPT|REJECTED)\s*\**/i) ||
    reportFinal.match(/\*\*\s*(ACCEPT|REJECTED)\s*\*\*/i) ||
    reportFinal.match(/\b(ACCEPT|REJECTED)\b/i);

  const finalVerdict = useMemo(() => {
    if (verdictMatch) return verdictMatch[1].toUpperCase();
    if (hasSubReports) {
      const qIssues = reportIssues(reportQuestions);
      const bIssues = reportIssues(reportBloom);
      const cIssues = reportIssues(reportCLO);
      const mIssues = reportIssues(reportMarks);
      return (qIssues + bIssues + cIssues + mIssues === 0) ? "ACCEPT" : "REJECTED";
    }
    return "";
  }, [verdictMatch, hasSubReports, reportQuestions, reportBloom, reportCLO, reportMarks]);

  const verdictIsAccept = finalVerdict === "ACCEPT";

  const summaryText = useMemo(() => {
    if (reportFinal) {
      const m = reportFinal.match(/##\s*Summary\s*\n+([\s\S]*?)(?:\n##\s*Verdict|\n+\*{0,2}Verdict:?|$)/i);
      if (m && m[1].trim()) {
        return m[1].replace(/\*{0,2}Verdict:?\*{0,2}\s*(?:ACCEPT|REJECTED)/i, "").replace(/\s+/g, " ").trim();
      }
    }

    if (hasSubReports) {
      const cIssues = reportIssues(reportCLO);
      const mIssues = reportIssues(reportMarks);
      const qIssues = reportIssues(reportQuestions);
      const bIssues = reportIssues(reportBloom);
      const totalIssues = cIssues + mIssues + qIssues + bIssues;

      if (totalIssues === 0) {
        return "The exam paper demonstrates full compliance with all CIS guidelines, CLO mappings, marks division, and cognitive levels.";
      } else {
        const issuesList: string[] = [];
        if (cIssues > 0) issuesList.push(`${cIssues} in CLO mapping`);
        if (mIssues > 0) issuesList.push(`${mIssues} in marks division`);
        if (qIssues > 0) issuesList.push(`${qIssues} in question check`);
        if (bIssues > 0) issuesList.push(`${bIssues} in Bloom's taxonomy`);
        return `The exam paper demonstrates alignment with CIS guidelines, but contains ${totalIssues} unresolved issue(s) (${issuesList.join(", ")}).`;
      }
    }

    return "";
  }, [reportFinal, hasSubReports, reportCLO, reportMarks, reportQuestions, reportBloom]);

  const handleDownloadPDF = async () => {
    if ((!reportFinal || reportFinal.trim().length === 0) && !hasSubReports) {
      onToast?.("No final report to download yet.", "error");
      return;
    }

    setIsDownloading(true);

    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const courseCode = selectedCourse?.course_id || "Report";
      const fileName = `IntelliPaper_${courseCode}_${paperType || "Exam"}_${dateStr}.pdf`;

      const finalContentForPDF = (reportFinal && reportFinal.trim().length > 0)
        ? reportFinal
        : `# Final Evaluation Report\n\n## CLO Mapping Report\n\n${reportCLO}\n\n## Marks Division\n\n${reportMarks}\n\n## Question Check\n\n${reportQuestions}\n\n## Bloom's Taxonomy\n\n${reportBloom}\n\n## Summary\n\n${summaryText}\n\n## Verdict\n\n**${finalVerdict}**`;

      await generateReportPDF({
        report: finalContentForPDF,
        courseName: selectedCourse?.course_name,
        courseCode: courseCode,
        paperType,
        fileName,
      });

      onToast?.("Report PDF downloaded successfully");
    } catch (error) {
      console.error("PDF download failed:", error);
      const message =
        error instanceof Error && error.message
          ? `PDF download failed: ${error.message}`
          : "PDF download failed. Please try again.";
      onToast?.(message, "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const cleanupVetting = async () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }

    Object.values(controllersRef.current).forEach((controller) => controller?.abort());

    if (sessionId) {
      try {
        await authFetch(`${API}/analyzer/sessions/${encodeURIComponent(sessionId)}`, {
          method: "DELETE",
        });
      } catch {
        // Cleanup is best-effort.
      }
    }

    if (filePath) {
      try {
        await authFetch(`${API}/paper/${encodeURIComponent(filePath)}`, {
          method: "DELETE",
        });
      } catch {
        // Cleanup is best-effort.
      }
    }
  };

  const handleCancel = async () => {
    await cleanupVetting();
    onClose();
  };

  const handleFinish = async () => {
    if (isFinishing) return;

    if (!completedSteps[8] || !reportFinal || reportFinal.trim().length === 0) {
      onToast?.("Please complete the Final Report before finishing.", "error");
      return;
    }

    setIsFinishing(true);

    try {
      const { userId, token: authToken } = getAuthContext();

      if (!userId) {
        throw new Error(
          "Could not resolve your user ID. Please sign in again."
        );
      }

      if (!authToken) {
        throw new Error(
          "Your authentication session is missing. Please sign in again."
        );
      }

      const reportId = await saveToHistory({
        userId,
        token: authToken,
        sessionId,
        cisLink: selectedCourse?.link,
        paperLink: paperLink || undefined,
        paperType: paperType || "final",
        courseCode: selectedCourse?.course_id || "",
        title: selectedCourse?.course_name || "Untitled Report",
        aiScore: compliance !== "—" ? compliance : "",
        status: "completed",
        reportMd: reportFinal,
        metadata: {
          ...(finalVerdict ? { verdict: finalVerdict } : {}),
          ...(summaryText ? { summary: summaryText } : {}),
        },
      });

      if (!reportId) {
        throw new Error(
          "History API did not confirm the save. Please try again."
        );
      }

      if (onFinish) {
        await onFinish({
          finalReport: reportFinal,
          sessionId,
          filePath,
          courseName: selectedCourse?.course_name || "Unknown Course",
          courseCode: selectedCourse?.course_id || "N/A",
          paperType,
        });
      }

      onHistorySaved?.(reportId);

      await cleanupVetting();
      onClose();
      onToast?.("Report saved to history");
    } catch (error) {
      console.error("Finish failed:", error);
      const message =
        error instanceof Error && error.message
          ? `Failed to save report: ${error.message}`
          : "Failed to save report. Please try again.";
      onToast?.(message, "error");
    } finally {
      setIsFinishing(false);
    }
  };

  const stepCard = (num: number) =>
    `relative rounded-xl min-[360px]:rounded-2xl border p-2.5 min-[360px]:p-3 sm:p-4 md:p-7 transition-all duration-300 animate-[cardIn_0.35s_ease-out] ${
      num === step
        ? "border-[#0F766E]/30 ring-1 ring-[#0F766E]/15 shadow-[0_2px_16px_rgba(15,118,110,0.08)] bg-surface dark:bg-[#0A0C10] dark:border-[#0F766E]"
        : "opacity-45 border-outline-variant bg-surface dark:bg-[#0A0C10] dark:border-[#1F2937]"
    }`;

  const stepIndicator = (num: number) => {
    const done = num < step;

    return (
      <div
        className={`absolute -left-2 min-[360px]:-left-2.5 sm:-left-[17px] top-4 min-[360px]:top-5 sm:top-6 w-6 h-6 min-[360px]:w-7 min-[360px]:h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] min-[360px]:text-xs sm:text-sm md:flex border-[3px] min-[360px]:border-4 border-page-bg dark:border-[#0A0C10] z-10 shadow-sm transition-all duration-300 ${
          num === step
            ? "bg-[#0F766E] text-white scale-110 shadow-[0_0_0_4px_rgba(15,118,110,0.15)]"
            : done
            ? "bg-[#15803D] text-white"
            : "bg-surface-container-high text-on-surface-variant dark:bg-[#1F2937] dark:text-[#E1E4E8]"
        }`}
      >
        {done ? (
          <span className="material-symbols-outlined text-[12px] min-[360px]:text-[14px] sm:text-[16px] animate-[popIn_0.3s_ease-out]">check</span>
        ) : (
          num
        )}
      </div>
    );
  };

  const primaryBtn =
    "h-[42px] px-3 min-[360px]:px-4 sm:px-6 bg-[#0F766E] text-white rounded-lg font-label-md text-[12px] min-[360px]:text-label-md hover:bg-primary-hover hover:shadow-[0_4px_12px_rgba(15,118,110,0.25)] active:scale-[0.98] transition-all duration-150 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm disabled:active:scale-100 w-full sm:w-auto";

  const outlineBtn =
    "h-[42px] px-3 min-[360px]:px-4 sm:px-6 border border-outline-variant text-on-surface rounded-lg font-label-md text-[12px] min-[360px]:text-label-md hover:bg-surface-container-high active:scale-[0.98] transition-all duration-150 dark:text-[#FFFFFF] dark:border-[#1F2937] dark:hover:bg-[#1F2937] disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto";

  const tealOutlineBtn =
    "h-[42px] px-3 min-[360px]:px-4 sm:px-6 border border-[#0F766E] text-[#0F766E] rounded-lg font-label-md text-[12px] min-[360px]:text-label-md hover:bg-panel-tint active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 dark:hover:bg-[#1F2937] w-full sm:w-auto";

  const reportPanel = (
    num: number,
    report: string,
    isLoading: boolean,
    onRegenerate: () => void,
    onUpdateReport?: (newMd: string) => void
  ) => (
    <div className="rounded-xl border border-outline-variant overflow-hidden bg-surface dark:bg-[#0A0C10] dark:border-[#1F2937]">
      <div className="p-2.5 min-[360px]:p-3 sm:p-4 md:p-5 min-h-[160px] min-[360px]:min-h-[180px] max-h-[440px] overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-center gap-2 mb-3 min-[360px]:mb-4">
          <span className="h-px flex-1 bg-outline-variant dark:bg-[#1F2937]" />
          <h4 className="text-center text-[11px] min-[360px]:text-[13px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8]">
            Report
          </h4>
          <span className="h-px flex-1 bg-outline-variant dark:bg-[#1F2937]" />
        </div>

        <div className="text-body-sm text-on-surface dark:text-[#E1E4E8] markdown-content">
          {isLoading && !report ? (
            <div>
              <StreamingIndicator label={STEP_LOADING_LABEL[num] || "Generating report..."} />
              <SkeletonTable rows={5} cols={4} />
            </div>
          ) : (
            reportBody(report, onUpdateReport)
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between gap-2.5 min-[360px]:gap-3 pt-3 min-[360px]:pt-4 mt-3 min-[360px]:mt-4 border-t border-outline-variant/30 dark:border-[#1F2937] px-2.5 min-[360px]:px-3 sm:px-5 pb-3 min-[360px]:pb-4 sm:pb-5">
        <div className="flex flex-col sm:flex-row gap-2 min-[360px]:gap-3">
          <button onClick={() => goToStep(num - 1)} className={outlineBtn}>
            <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px]">arrow_back</span>
            Back
          </button>

          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="h-[42px] px-3 min-[360px]:px-4 sm:px-6 bg-[#374151] text-white rounded-lg font-label-md text-[12px] min-[360px]:text-label-md hover:bg-gray-600 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
          >
            <span className={`material-symbols-outlined text-[16px] min-[360px]:text-[18px] ${isLoading ? "animate-spin" : ""}`}>refresh</span>
            {isLoading ? "Generating..." : "Regenerate"}
          </button>
        </div>

        <button
          onClick={() => goToStep(num + 1)}
          disabled={isLoading || !completedSteps[num]}
          className={primaryBtn}
          title={
            isLoading
              ? "Please wait for this report to finish."
              : !completedSteps[num]
              ? "Complete this step before continuing."
              : undefined
          }
        >
          Next
          <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );

  const lectureExtensions = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
  const paperExtensions = [".pdf", ".docx"];

  return (
    <div className="w-full flex-1 flex flex-col min-h-0">
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.7); }
          80% { transform: scale(1.06); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
        @keyframes stripeMove {
          0% { background-position: 0 0; }
          100% { background-position: 28px 0; }
        }
        @keyframes gaugeSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes docConverge {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(var(--tx), var(--ty)) scale(1.1); opacity: 1; }
        }
        @keyframes traceFlow {
          0% { stroke-dashoffset: 18; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes hubRing {
          0% { transform: scale(0.6); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes hubPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>

      <div className="px-2.5 min-[360px]:px-4 sm:px-6 py-3 min-[360px]:py-4 sm:py-5 border-b border-outline-variant dark:border-white/[0.08] flex items-center gap-2 min-[360px]:gap-3 bg-white dark:bg-transparent shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="font-headline-lg text-[15px] min-[360px]:text-[17px] sm:text-headline-lg text-on-surface dark:text-[#FFFFFF] truncate">
            New Paper Vetting
          </h2>

          <p className="font-body-sm text-[11px] min-[360px]:text-body-sm text-on-surface-variant dark:text-[#E1E4E8] truncate">
            Step {step} of 8 · {STEPS[step - 1]}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-[#0F766E]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px] text-[#0F766E] dark:text-[#5eead4]">
              {STEP_ICONS[step - 1]}
            </span>
          </span>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 min-[360px]:p-3 sm:p-6 bg-page-bg scroll-smooth dark:bg-[#0A0C10]"
        id="wizard-scroll-area"
      >
        <div
          className="w-full max-w-7xl mx-auto space-y-3 min-[360px]:space-y-5 sm:space-y-6 relative pb-24 pl-2 min-[360px]:pl-3 sm:pl-0"
          id="wizard-steps-container"
        >
          <div className="absolute left-4 min-[360px]:left-5 sm:left-6 top-8 bottom-8 w-0.5 bg-outline-variant -z-10 hidden md:block dark:bg-[#1F2937]" />

          {/* STEP 1 */}
          <div
            ref={(el) => {
              stepsRef.current[1] = el;
            }}
            className={`${stepCard(1)} ${1 > step ? "hidden" : ""}`}
            id="step-1"
          >
            {stepIndicator(1)}

            <div className="mb-3 min-[360px]:mb-5">
              <h3 className="font-headline-md text-[14px] min-[360px]:text-[16px] sm:text-headline-md text-on-surface flex items-start min-[360px]:items-center gap-2 min-[360px]:gap-2.5 dark:text-[#FFFFFF]">
                <span className="w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] sm:text-[20px] text-[#0F766E] dark:text-[#5eead4]">
                    library_books
                  </span>
                </span>
                Select CIS Document
              </h3>

              <p className="font-body-sm text-[11px] min-[360px]:text-body-sm text-on-surface-variant dark:text-[#E1E4E8] mt-1 ml-0 min-[360px]:ml-[40px] sm:ml-[46px]">
                Choose the Course Information Sheet to ground the AI.
              </p>
            </div>

            <div className="space-y-3 min-[360px]:space-y-4">
              {cisLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 min-[360px]:gap-3 sm:gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <SkeletonBar width="40%" height={12} />
                      <SkeletonBar width="100%" height={44} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 min-[360px]:gap-3 sm:gap-4">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="font-label-sm text-[11px] min-[360px]:text-label-sm text-on-surface-variant dark:text-[#E1E4E8]">
                      Department
                    </label>

                    <SearchableSelect
                      value={selectedDepartment}
                      options={departmentOptions}
                      placeholder="Type or select department..."
                      disabled={cisLoading}
                      loading={cisLoading}
                      onChange={handleDepartmentChange}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="font-label-sm text-[11px] min-[360px]:text-label-sm text-on-surface-variant dark:text-[#E1E4E8]">
                      Semester
                    </label>

                    <SearchableSelect
                      value={
                        selectedSemester === ""
                          ? ""
                          : String(selectedSemester)
                      }
                      options={semesterOptions}
                      placeholder="Type or select semester..."
                      disabled={!selectedDepartment || cisLoading}
                      loading={cisLoading}
                      onChange={(val) =>
                        handleSemesterChange(
                          val === "" ? "" : Number(val)
                        )
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2 md:col-span-1 min-w-0">
                    <label className="font-label-sm text-[11px] min-[360px]:text-label-sm text-on-surface-variant dark:text-[#E1E4E8]">
                      Course
                    </label>

                    <SearchableSelect
                      value={selectedCourseId}
                      options={courseOptions}
                      placeholder="Type or select course..."
                      disabled={
                        selectedSemester === "" ||
                        cisLoading ||
                        courses.length === 0
                      }
                      loading={cisLoading}
                      onChange={setSelectedCourseId}
                    />
                  </div>
                </div>
              )}

              {selectedCourse?.link && (
                <div className="border border-outline-variant rounded-xl p-2.5 min-[360px]:p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-2.5 min-[360px]:gap-3 sm:justify-between dark:border-[#1F2937] animate-[fadeSlideUp_0.3s_ease-out]">
                  <div className="flex items-center gap-2.5 min-[360px]:gap-3 min-w-0">
                    <div className="w-9 h-9 min-[360px]:w-10 min-[360px]:h-10 shrink-0 rounded-lg bg-[#0F766E]/10 flex items-center justify-center text-[#0F766E] dark:bg-[#1F2937] dark:text-[#5eead4]">
                      <span className="material-symbols-outlined text-[18px] min-[360px]:text-[20px]">description</span>
                    </div>

                    <div className="min-w-0">
                      <p className="font-label-md text-[12px] min-[360px]:text-label-md text-on-surface dark:text-[#FFFFFF] truncate">
                        {selectedCourse.course_id}_CIS.pdf
                      </p>

                      <p className="font-body-sm text-[11px] min-[360px]:text-body-sm text-on-surface-variant dark:text-[#E1E4E8] truncate">
                        {selectedCourse.course_name} · {selectedCourse.department}
                      </p>
                    </div>
                  </div>

                  <a
                    href={selectedCourse.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0F766E] hover:underline text-[12px] min-[360px]:text-sm font-label-md flex items-center gap-1 dark:text-[#5eead4] shrink-0 self-start sm:self-auto"
                  >
                    <span className="material-symbols-outlined text-[14px] min-[360px]:text-[16px]">open_in_new</span>
                    Open in new tab
                  </a>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:justify-between pt-1 min-[360px]:pt-2 gap-2.5 min-[360px]:gap-3">
                <button onClick={handleCancel} className={outlineBtn}>
                  Cancel
                </button>

                <button onClick={startVetting} className={primaryBtn}>
                  Start Vetting
                  <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* STEP 2 */}
          <div
            ref={(el) => {
              stepsRef.current[2] = el;
            }}
            className={`${stepCard(2)} ${2 > step ? "hidden" : ""}`}
            id="step-2"
          >
            {stepIndicator(2)}

            <div className="mb-3 min-[360px]:mb-5">
              <h3 className="font-headline-md text-[14px] min-[360px]:text-[16px] sm:text-headline-md text-on-surface flex flex-wrap items-start min-[360px]:items-center gap-2 min-[360px]:gap-2.5 dark:text-[#FFFFFF]">
                <span className="w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] sm:text-[20px] text-[#0F766E] dark:text-[#5eead4]">
                    upload_file
                  </span>
                </span>
                Upload Lectures / Books
                <span className="text-[11px] min-[360px]:text-sm font-normal text-on-surface-variant dark:text-[#94a3b8]">
                  (Required to continue)
                </span>
              </h3>

              <p className="font-body-sm text-[11px] min-[360px]:text-body-sm text-on-surface-variant dark:text-[#E1E4E8] mt-1 ml-0 min-[360px]:ml-[40px] sm:ml-[46px]">
                Provide context for out-of-syllabus checks.
              </p>
            </div>

            {isIngesting ? (
              <div className="space-y-3 min-[360px]:space-y-4">
                <div className="flex flex-col items-center gap-3 min-[360px]:gap-4 py-4 min-[360px]:py-6">
                  <div className="relative w-14 h-14 min-[360px]:w-16 min-[360px]:h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-surface-container-high dark:border-[#1F2937]" />
                    <div
                      className="absolute inset-0 rounded-full border-4 border-[#0F766E] border-t-transparent"
                      style={{ animation: "gaugeSpin 1s linear infinite" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] min-[360px]:text-xs font-bold text-[#0F766E] dark:text-[#5eead4] tabular-nums">
                      {ingestProgress}%
                    </div>
                  </div>

                  <p className="font-label-md text-[13px] min-[360px]:text-label-md text-on-surface dark:text-[#FFFFFF]">
                    Generating Embeddings
                  </p>

                  <p className="text-[12px] min-[360px]:text-sm text-on-surface-variant dark:text-[#E1E4E8] text-center px-1">
                    {progressMsg}
                  </p>

                  <div className="w-full max-w-md bg-surface-container-low rounded-full h-2 min-[360px]:h-2.5 overflow-hidden dark:bg-[#1F2937]">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-[repeating-linear-gradient(45deg,#0F766E_0,#0F766E_10px,#14b8a6_10px,#14b8a6_20px)] bg-[length:28px_28px]"
                      style={{ width: `${ingestProgress}%`, animation: "stripeMove 1s linear infinite" }}
                    />
                  </div>

                  {ingestDetail && (
                    <p className="text-[11px] min-[360px]:text-xs text-on-surface-variant dark:text-[#E1E4E8] text-center break-words px-1">
                      {ingestDetail}
                    </p>
                  )}

                  {ingestError && (
                    <p className="bg-error-container text-on-error-container px-3 min-[360px]:px-4 py-2 rounded-lg text-[12px] min-[360px]:text-sm w-full max-w-md break-words">
                      {ingestError}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div
                  className="border-2 border-dashed border-outline-variant rounded-xl p-4 min-[360px]:p-5 sm:p-8 text-center hover:bg-surface-container-low hover:border-[#0F766E]/40 transition-colors cursor-pointer bg-surface mb-3 min-[360px]:mb-4 dark:bg-[#0A0C10] dark:border-[#1F2937] dark:hover:bg-[#1F2937]"
                  onClick={() => document.getElementById("lecture-file-input")?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();

                    const selected = Array.from(e.dataTransfer.files || []);
                    const valid = selected.filter((file) =>
                      lectureExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
                    );

                    if (selected.length !== valid.length) {
                      onToast?.("Only PDF, DOC, DOCX, PPT, PPTX allowed", "error");
                    }

                    setLectureFiles((prev) => [
                      ...prev,
                      ...valid.filter((file) => !prev.some((p) => p.name === file.name)),
                    ]);
                  }}
                >
                  <span className="material-symbols-outlined text-[24px] min-[360px]:text-[28px] sm:text-[32px] text-[#0F766E]/60 mb-2 block">
                    cloud_upload
                  </span>

                  <p className="font-label-md text-[13px] min-[360px]:text-label-md text-on-surface dark:text-[#FFFFFF]">
                    Drag &amp; drop files here
                  </p>

                  <p className="font-body-sm text-[11px] min-[360px]:text-body-sm text-on-surface-variant mt-1 dark:text-[#E1E4E8]">
                    or click to browse (.pdf, .docx, .pptx)
                  </p>
                </div>

                <input
                  id="lecture-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    const valid = selected.filter((file) =>
                      lectureExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
                    );

                    if (selected.length !== valid.length) {
                      onToast?.("Only PDF, DOC, DOCX, PPT, PPTX allowed", "error");
                    }

                    setLectureFiles((prev) => [
                      ...prev,
                      ...valid.filter((file) => !prev.some((p) => p.name === file.name)),
                    ]);

                    e.target.value = "";
                  }}
                />

                {lectureFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 min-[360px]:gap-2 mb-3 min-[360px]:mb-4">
                    {lectureFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 min-[360px]:gap-2 bg-surface-container-low border border-outline-variant rounded-full px-2 min-[360px]:px-3 py-1 max-w-full dark:bg-[#0A0C10] dark:border-[#1F2937] animate-[popIn_0.25s_ease-out]"
                      >
                        <span className="material-symbols-outlined text-[14px] min-[360px]:text-[16px] text-outline dark:text-[#E1E4E8] shrink-0">
                          description
                        </span>

                        <span className="text-[12px] min-[360px]:text-sm font-label-md dark:text-[#FFFFFF] truncate max-w-[120px] min-[360px]:max-w-[160px] sm:max-w-[240px]">
                          {file.name}
                        </span>

                        <button
                          onClick={() => {
                            setLectureFiles((prev) => prev.filter((_, idx) => idx !== i));
                            setIsIngestDone(false);
                            markStepComplete(2, false);
                            invalidateFromStep(3);
                          }}
                          className="text-outline hover:text-danger dark:text-[#E1E4E8] dark:hover:text-danger shrink-0"
                        >
                          <span className="material-symbols-outlined text-[14px] min-[360px]:text-[16px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-between pt-3 min-[360px]:pt-4 gap-2.5 min-[360px]:gap-3">
                  <button onClick={() => goToStep(1)} className={outlineBtn}>
                    <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px]">arrow_back</span>
                    Back
                  </button>

                  <div className="flex flex-col sm:flex-row gap-2.5 min-[360px]:gap-3">
                    <button
                      onClick={startIngestion}
                      disabled={lectureFiles.length === 0}
                      className={primaryBtn}
                    >
                      Upload &amp; Generate Embeddings
                    </button>
                  </div>
                </div>
              </>
            )}

            {isIngestDone && (
              <>
                <div className="flex items-center gap-2 bg-panel-tint border border-soft-accent rounded-xl px-3 min-[360px]:px-4 py-2.5 min-[360px]:py-3 mt-3 min-[360px]:mt-4 dark:bg-[#1F2937] dark:border-[#1F2937] animate-[fadeSlideUp_0.3s_ease-out]">
                  <span className="material-symbols-outlined text-[18px] min-[360px]:text-[20px] text-[#15803D] shrink-0">
                    check_circle
                  </span>

                  <p className="text-[12px] min-[360px]:text-sm font-label-md text-on-surface dark:text-[#FFFFFF]">
                    {progressMsg}
                  </p>
                </div>

                <div className="flex justify-end pt-3 min-[360px]:pt-4 mt-1 min-[360px]:mt-2">
                  <button onClick={() => goToStep(3)} className={primaryBtn}>
                    Next
                    <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* STEP 3 */}
          <div
            ref={(el) => {
              stepsRef.current[3] = el;
            }}
            className={`${stepCard(3)} ${3 > step ? "hidden" : ""}`}
            id="step-3"
          >
            {stepIndicator(3)}

            <div className="mb-3 min-[360px]:mb-5">
              <h3 className="font-headline-md text-[14px] min-[360px]:text-[16px] sm:text-headline-md text-on-surface flex items-start min-[360px]:items-center gap-2 min-[360px]:gap-2.5 dark:text-[#FFFFFF]">
                <span className="w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] sm:text-[20px] text-[#0F766E] dark:text-[#5eead4]">
                    article
                  </span>
                </span>
                Upload Exam Paper
              </h3>

              <p className="font-body-sm text-[11px] min-[360px]:text-body-sm text-on-surface-variant dark:text-[#E1E4E8] mt-1 ml-0 min-[360px]:ml-[40px] sm:ml-[46px]">
                The main document to be vetted.
              </p>
            </div>

            <select
              value={paperType}
              onChange={(e) => {
                setPaperType(e.target.value);
                setPaperLink(null);
                setFilePath(null);
                markStepComplete(3, false);
                invalidateFromStep(4);
              }}
              className="w-full min-w-0 p-2.5 min-[360px]:p-3 bg-surface border border-outline-variant rounded-lg font-body-sm text-[13px] min-[360px]:text-body-sm text-on-surface focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 mb-3 min-[360px]:mb-4 dark:bg-[#0A0C10] dark:border-[#1F2937] dark:text-[#E1E4E8] transition-shadow"
            >
              <option value="">Paper Type...</option>
              <option value="midterm">Midterm</option>
              <option value="final">Final</option>
            </select>

            <div
              className="flex items-center gap-2 border-2 border-dashed border-outline-variant rounded-full px-3 min-[360px]:px-4 py-2 w-full sm:w-max max-w-full mb-3 min-[360px]:mb-4 cursor-pointer hover:bg-surface-container-low hover:border-[#0F766E]/40 transition-colors dark:bg-[#0A0C10] dark:border-[#1F2937] dark:hover:bg-[#1F2937]"
              onClick={() => document.getElementById("paper-file-input")?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();

                const file = e.dataTransfer.files?.[0];
                if (!file) return;

                if (!paperExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
                  onToast?.("Only PDF or DOCX allowed", "error");
                  return;
                }

                setPaperFile(file);
                setPaperLink(null);
                setFilePath(null);
                markStepComplete(3, false);
                invalidateFromStep(4);
              }}
            >
              <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] text-[#0F766E] dark:text-[#5eead4] shrink-0">
                description
              </span>

              <span className="text-[12px] min-[360px]:text-sm font-label-md dark:text-[#FFFFFF] truncate min-w-0">
                {paperFile
                  ? `${paperFile.name} · ${(paperFile.size / 1024 / 1024).toFixed(2)} MB`
                  : "Upload paper (.pdf, .docx)"}
              </span>

              {paperFile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPaperFile(null);
                    setPaperLink(null);
                    setFilePath(null);
                    markStepComplete(3, false);
                    invalidateFromStep(4);
                  }}
                  className="text-outline hover:text-danger ml-2 dark:text-[#E1E4E8] dark:hover:text-danger shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px]">close</span>
                </button>
              )}
            </div>

            <input
              id="paper-file-input"
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (!paperExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
                  onToast?.("Only PDF or DOCX allowed", "error");
                  e.target.value = "";
                  return;
                }

                setPaperFile(file);
                setPaperLink(null);
                setFilePath(null);
                markStepComplete(3, false);
                invalidateFromStep(4);
                e.target.value = "";
              }}
            />

            <div className="flex flex-col sm:flex-row sm:justify-between gap-2.5 min-[360px]:gap-3 pt-3 min-[360px]:pt-4">
              <button onClick={() => goToStep(2)} className={outlineBtn}>
                Back
              </button>

              <button onClick={handleUploadPaper} disabled={isUploadingPaper} className={primaryBtn}>
                {isUploadingPaper ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] animate-spin">progress_activity</span>
                    Uploading...
                  </>
                ) : (
                  <>
                    Next
                    <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* STEP 4 — MARK DIVISION */}
          <div
            ref={(el) => {
              stepsRef.current[4] = el;
            }}
            className={`${stepCard(4)} ${4 > step ? "hidden" : ""}`}
            id="step-4"
          >
            {stepIndicator(4)}

            <div className="flex flex-wrap items-center gap-2 min-[360px]:gap-2.5 mb-3 min-[360px]:mb-5">
              <h3 className="font-headline-md text-[14px] min-[360px]:text-[16px] sm:text-headline-md text-on-surface flex items-center gap-2 min-[360px]:gap-2.5 dark:text-[#FFFFFF]">
                <span className="w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] sm:text-[20px] text-[#0F766E] dark:text-[#5eead4]">
                    analytics
                  </span>
                </span>
                Marks Division
              </h3>

              {reportMarks ? issuesPill(reportIssues(reportMarks)) : null}
            </div>

            {reportPanel(
              4,
              reportMarks,
              !!loadingReports[4],
              () => {
                setReportMarks("");
                markStepComplete(4, false);
                generateMarks();
              },
              setReportMarks
            )}
          </div>

          {/* STEP 5 */}
          <div
            ref={(el) => {
              stepsRef.current[5] = el;
            }}
            className={`${stepCard(5)} ${5 > step ? "hidden" : ""}`}
            id="step-5"
          >
            {stepIndicator(5)}

            <div className="flex flex-wrap items-center gap-2 min-[360px]:gap-2.5 mb-3 min-[360px]:mb-5">
              <h3 className="font-headline-md text-[14px] min-[360px]:text-[16px] sm:text-headline-md text-on-surface flex items-center gap-2 min-[360px]:gap-2.5 dark:text-[#FFFFFF]">
                <span className="w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] sm:text-[20px] text-[#0F766E] dark:text-[#5eead4]">
                    fact_check
                  </span>
                </span>
                CLO Mapping
              </h3>

              {reportCLO ? issuesPill(reportIssues(reportCLO)) : null}
            </div>

            {reportPanel(
              5,
              reportCLO,
              !!loadingReports[5],
              () => {
                setReportCLO("");
                markStepComplete(5, false);
                generateCLO();
              },
              setReportCLO
            )}
          </div>

          {/* STEP 6 */}
          <div
            ref={(el) => {
              stepsRef.current[6] = el;
            }}
            className={`${stepCard(6)} ${6 > step ? "hidden" : ""}`}
            id="step-6"
          >
            {stepIndicator(6)}

            <div className="flex flex-wrap items-center gap-2 min-[360px]:gap-2.5 mb-3 min-[360px]:mb-5">
              <h3 className="font-headline-md text-[14px] min-[360px]:text-[16px] sm:text-headline-md text-on-surface flex items-center gap-2 min-[360px]:gap-2.5 dark:text-[#FFFFFF]">
                <span className="w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] sm:text-[20px] text-[#0F766E] dark:text-[#5eead4]">
                    rule
                  </span>
                </span>
                Question Check
              </h3>

              {reportQuestions ? issuesPill(reportIssues(reportQuestions)) : null}
            </div>

            {reportPanel(
              6,
              reportQuestions,
              !!loadingReports[6],
              () => {
                setReportQuestions("");
                markStepComplete(6, false);
                generateQuestions();
              },
              setReportQuestions
            )}
          </div>

          {/* STEP 7 */}
          <div
            ref={(el) => {
              stepsRef.current[7] = el;
            }}
            className={`${stepCard(7)} ${7 > step ? "hidden" : ""}`}
            id="step-7"
          >
            {stepIndicator(7)}

            <div className="flex flex-wrap items-center gap-2 min-[360px]:gap-2.5 mb-3 min-[360px]:mb-5">
              <h3 className="font-headline-md text-[14px] min-[360px]:text-[16px] sm:text-headline-md text-on-surface flex items-center gap-2 min-[360px]:gap-2.5 dark:text-[#FFFFFF]">
                <span className="w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px] sm:text-[20px] text-[#0F766E] dark:text-[#5eead4]">
                    psychology
                  </span>
                </span>
                Bloom&apos;s Taxonomy
              </h3>

              {reportBloom ? issuesPill(reportIssues(reportBloom)) : null}
            </div>

            {reportPanel(
              7,
              reportBloom,
              !!loadingReports[7],
              () => {
                setReportBloom("");
                markStepComplete(7, false);
                generateBloom();
              },
              setReportBloom
            )}
          </div>

          {/* STEP 8 */}
          <div
            ref={(el) => {
              stepsRef.current[8] = el;
            }}
            className={`${stepCard(8)} ${8 > step ? "hidden" : ""}`}
            id="step-8"
          >
            {stepIndicator(8)}

            <div className="text-center mb-4 min-[360px]:mb-6 sm:mb-8">
              <div className="w-12 h-12 min-[360px]:w-14 min-[360px]:h-14 sm:w-16 sm:h-16 bg-[#15803D]/10 rounded-full flex items-center justify-center mx-auto mb-2.5 min-[360px]:mb-3 animate-[popIn_0.4s_ease-out]">
                <span className="material-symbols-outlined text-[24px] min-[360px]:text-[28px] sm:text-[32px] text-[#15803D]">
                  verified
                </span>
              </div>

              <h3 className="font-headline-lg text-[16px] min-[360px]:text-[18px] sm:text-headline-lg text-on-surface dark:text-[#FFFFFF]">
                Vetting Complete
              </h3>

              {loadingReports[8] && !reportFinal ? (
                <p className="font-display-lg text-xl min-[360px]:text-2xl sm:text-3xl mt-2 text-[#0F766E]">
                  Analyzing...
                </p>
              ) : (
                <div className="mt-3 min-[360px]:mt-4">
                  <ComplianceGauge value={compliance} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-[360px]:gap-3 sm:gap-4 p-2.5 min-[360px]:p-3 sm:p-5 bg-surface-container-low rounded-xl mb-4 min-[360px]:mb-6 sm:mb-8 border border-outline-variant dark:bg-[#0A0C10] dark:border-[#1F2937]">
              <div className="min-w-0">
                <p className="text-[10px] min-[360px]:text-[11px] text-on-surface-variant uppercase font-bold tracking-wide dark:text-[#E1E4E8]">
                  Paper Name
                </p>

                <p className="font-label-md text-[12px] min-[360px]:text-label-md text-on-surface dark:text-[#FFFFFF] break-words mt-0.5">
                  {selectedCourse?.course_id || "—"}{" "}
                  {paperType ? paperType.charAt(0).toUpperCase() + paperType.slice(1) : ""} Paper
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] min-[360px]:text-[11px] text-on-surface-variant uppercase font-bold tracking-wide dark:text-[#E1E4E8]">
                  Date
                </p>

                <p className="font-label-md text-[12px] min-[360px]:text-label-md text-on-surface dark:text-[#FFFFFF] break-words mt-0.5">
                  {new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] min-[360px]:text-[11px] text-on-surface-variant uppercase font-bold tracking-wide dark:text-[#E1E4E8]">
                  Department
                </p>

                <p className="font-label-md text-[12px] min-[360px]:text-label-md text-on-surface dark:text-[#FFFFFF] break-words mt-0.5">
                  {selectedCourse?.department || "—"}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] min-[360px]:text-[11px] text-on-surface-variant uppercase font-bold tracking-wide dark:text-[#E1E4E8]">
                  Exam Type
                </p>

                <p className="font-label-md text-[12px] min-[360px]:text-label-md text-on-surface dark:text-[#FFFFFF] break-words mt-0.5">
                  {paperType ? paperType.charAt(0).toUpperCase() + paperType.slice(1) : "—"}
                </p>
              </div>
            </div>

            {loadingReports[8] && !reportFinal ? (
              <div className="rounded-xl border border-outline-variant overflow-hidden bg-surface dark:bg-[#0A0C10] dark:border-[#1F2937]">
                <div className="p-3 min-[360px]:p-5 min-h-[200px] min-[360px]:min-h-[220px]">
                  <StreamingIndicator label="Synthesizing the final evaluation report..." />
                  <div className="space-y-2.5 min-[360px]:space-y-3">
                    <SkeletonBar width="90%" height={14} />
                    <SkeletonBar width="75%" height={14} />
                    <SkeletonBar width="82%" height={14} />
                  </div>
                  <div className="mt-4 min-[360px]:mt-6">
                    <SkeletonTable rows={3} cols={3} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {hasSubReports && (
                  <div className="space-y-5 min-[360px]:space-y-8">
                    {reportSection("fact_check", "CLO Mapping Report", reportCLO, setReportCLO)}
                    {reportSection("analytics", "Marks Division", reportMarks, setReportMarks)}
                    {reportSection("rule", "Question Check", reportQuestions, setReportQuestions)}
                    {reportSection("psychology", "Bloom's Taxonomy", reportBloom, setReportBloom)}
                  </div>
                )}

                {!hasSubReports && reportFinal && (
                  <div className="mt-6 min-[360px]:mt-8 rounded-xl border border-outline-variant overflow-hidden bg-surface dark:bg-[#0A0C10] dark:border-[#1F2937]">
                    <div className="p-3 min-[360px]:p-4 sm:p-5 markdown-content overflow-x-hidden">
                      <h4 className="text-center text-[14px] min-[360px]:text-[16px] sm:text-[18px] font-bold mb-3 text-on-surface dark:text-[#FFFFFF]">
                        FINAL EVALUATION REPORT
                      </h4>

                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {reportFinal}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {hasSubReports && reportFinal && (
                  <details className="mt-4 min-[360px]:mt-6 rounded-xl border border-outline-variant bg-surface overflow-hidden dark:bg-[#0A0C10] dark:border-[#1F2937]">
                    <summary className="px-3 min-[360px]:px-4 sm:px-5 py-2.5 min-[360px]:py-3 cursor-pointer font-label-md text-[12px] min-[360px]:text-label-md text-[#0F766E] hover:bg-surface-container-low transition-colors flex items-center gap-2 dark:text-[#5eead4] dark:hover:bg-[#1F2937]">
                      <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px]">description</span>
                      View Full Report
                    </summary>

                    <div className="p-3 min-[360px]:p-4 sm:p-5 border-t border-outline-variant dark:border-[#1F2937] markdown-content overflow-x-hidden">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {reportFinal}
                      </ReactMarkdown>
                    </div>
                  </details>
                )}

                {(summaryText || finalVerdict || reportFinal || hasSubReports) && (
                  <div
                    className={`mt-5 min-[360px]:mt-8 p-3 min-[360px]:p-4 sm:p-6 rounded-xl border animate-[fadeSlideUp_0.35s_ease-out] ${
                      finalVerdict
                        ? verdictIsAccept
                          ? "bg-[#15803D]/5 border-[#15803D]/25"
                          : "bg-danger/5 border-danger/25"
                        : "bg-panel-tint border-soft-accent dark:bg-[#0A0C10] dark:border-[#1F2937]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 min-[360px]:gap-3 mb-2">
                      <h4 className="font-headline-md text-[14px] min-[360px]:text-[16px] text-on-surface dark:text-[#FFFFFF]">
                        Summary
                      </h4>

                      {finalVerdict && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 min-[360px]:px-3 py-1 min-[360px]:py-1.5 rounded-full text-[12px] min-[360px]:text-sm font-bold ${
                            verdictIsAccept
                              ? "bg-[#15803D]/15 text-[#15803D]"
                              : "bg-danger/15 text-danger"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px] min-[360px]:text-[16px]">
                            {verdictIsAccept ? "check_circle" : "cancel"}
                          </span>
                          {finalVerdict}
                        </span>
                      )}
                    </div>

                    {summaryText ? (
                      <p className="text-[12px] min-[360px]:text-body-sm text-on-surface-variant dark:text-[#E1E4E8] break-words">
                        {summaryText}
                      </p>
                    ) : (
                      <p className="text-[12px] min-[360px]:text-body-sm text-on-surface-variant dark:text-[#E1E4E8]">
                        The evaluation report is summarized above.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-between gap-2.5 min-[360px]:gap-3 pt-4 min-[360px]:pt-6 mt-5 min-[360px]:mt-8 border-t border-outline-variant dark:border-[#1F2937]">
              <div className="flex flex-col sm:flex-row gap-2.5 min-[360px]:gap-3">
                <button onClick={() => goToStep(7)} className={tealOutlineBtn}>
                  <span className="material-symbols-outlined text-[16px] min-[360px]:text-[18px]">arrow_back</span>
                  Back
                </button>

                <button
                  onClick={() => {
                    setReportFinal("");
                    markStepComplete(8, false);
                    generateFinal();
                  }}
                  disabled={!!loadingReports[8]}
                  className="h-11 px-3 min-[360px]:px-4 sm:px-6 bg-[#374151] text-white rounded-lg font-label-md text-[12px] min-[360px]:text-label-md hover:bg-gray-600 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
                >
                  <span className={`material-symbols-outlined text-[16px] min-[360px]:text-[18px] ${loadingReports[8] ? "animate-spin" : ""}`}>refresh</span>
                  Regenerate
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 min-[360px]:gap-3">
                <button
                  onClick={handleDownloadPDF}
                  disabled={(!reportFinal && !hasSubReports) || isDownloading}
                  className="h-11 px-3 min-[360px]:px-4 sm:px-6 border border-[#0F766E] text-[#0F766E] rounded-lg font-label-md text-[12px] min-[360px]:text-label-md hover:bg-panel-tint active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-[#1F2937] w-full sm:w-auto"
                >
                  <span className={`material-symbols-outlined text-[18px] min-[360px]:text-[20px] ${isDownloading ? "animate-spin" : ""}`}>
                    {isDownloading ? "progress_activity" : "download"}
                  </span>
                  {isDownloading ? "Downloading..." : "Download PDF"}
                </button>

                <button
                  onClick={handleFinish}
                  disabled={isFinishing || (!reportFinal && !hasSubReports)}
                  className="h-11 px-4 min-[360px]:px-6 sm:px-8 bg-[#0F766E] text-white rounded-lg font-label-md text-[12px] min-[360px]:text-label-md hover:bg-primary-hover hover:shadow-[0_4px_12px_rgba(15,118,110,0.25)] active:scale-[0.98] transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm w-full sm:w-auto"
                >
                  {isFinishing ? "Saving..." : "Finish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}