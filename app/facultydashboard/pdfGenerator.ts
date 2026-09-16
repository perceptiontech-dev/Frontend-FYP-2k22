export interface PDFReportOptions {
  report: string;
  courseName?: string;
  courseCode?: string;
  paperType?: string;
  fileName?: string;
  /** Optional — shown as a circular gauge in the summary ledger */
  compliance?: string;
  /** Optional — shown as a seal-style stamp in the summary ledger */
  verdict?: string;
}

export async function generateReportPDF(
  opts: PDFReportOptions
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const {
    report,
    courseName,
    courseCode,
    paperType,
    fileName,
    compliance,
    verdict,
  } = opts;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();

  const ML = 18;
  const MR = 18;
  const CW = PW - ML - MR;

  let y = 0;
  let pageNum = 1;

  // ============================================================
  // COLORS — same "official document" palette as the app UI
  // ============================================================

  const C = {
    forest: [23, 58, 44] as [number, number, number], // #173A2C letterhead
    pine: [45, 106, 79] as [number, number, number], // #2D6A4F accent
    sage: [116, 198, 157] as [number, number, number], // #74C69D gauge fill
    parchment: [241, 244, 236] as [number, number, number], // #F1F4EC wash
    rule: [220, 227, 216] as [number, number, number], // #DCE3D8 hairline

    rubine: [140, 47, 47] as [number, number, number], // #8C2F2F reject ink

    white: [255, 255, 255] as [number, number, number],
    ink: [28, 35, 33] as [number, number, number], // #1C2321 body text
    gray: [120, 120, 116] as [number, number, number],
  };

  // ============================================================
  // MARKDOWN → STYLED RUNS
  // ============================================================

  type Run = { text: string; bold: boolean; italic: boolean };

  const stripUnsupported = (s: string) =>
    s
      .replace(/\$\\rightarrow\$/g, "→")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/~~(.*?)~~/g, "$1")
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .replace(/\$\$(.*?)\$\$/g, "$1")
      .replace(/\$(.*?)\$/g, "$1");

  const toRuns = (raw: string): Run[] => {
    const s = stripUnsupported(raw);
    const runs: Run[] = [];
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(s)) !== null) {
      if (m.index > lastIndex) {
        runs.push({ text: s.slice(lastIndex, m.index), bold: false, italic: false });
      }
      const token = m[0];
      if (token.startsWith("**")) {
        runs.push({ text: token.slice(2, -2), bold: true, italic: false });
      } else {
        runs.push({ text: token.slice(1, -1), bold: false, italic: true });
      }
      lastIndex = re.lastIndex;
    }
    if (lastIndex < s.length) {
      runs.push({ text: s.slice(lastIndex), bold: false, italic: false });
    }
    return runs.filter((r) => r.text.length > 0);
  };

  const plain = (raw: string) => toRuns(raw).map((r) => r.text).join("");

  // ============================================================
  // INLINE WORD-WRAP + MIXED BOLD/ITALIC RENDERING
  // fontFamily lets headings use the serif ("times") face while
  // body copy stays on "helvetica", matching the app's type pairing.
  // ============================================================

  type Word = { text: string; bold: boolean; italic: boolean };

  const styleFor = (bold: boolean, italic: boolean) => {
    if (bold && italic) return "bolditalic";
    if (bold) return "bold";
    if (italic) return "italic";
    return "normal";
  };

  const wordsFromRuns = (runs: Run[]): Word[] => {
    const words: Word[] = [];
    runs.forEach((r) => {
      r.text.split(/(\s+)/).forEach((chunk) => {
        if (chunk === "") return;
        words.push({ text: chunk, bold: r.bold, italic: r.italic });
      });
    });
    return words;
  };

  const drawInline = (
    runs: Run[],
    x: number,
    startY: number,
    maxWidth: number,
    fontSize: number,
    lineHeight: number,
    color: [number, number, number] = C.ink,
    fontFamily: "helvetica" | "times" = "helvetica"
  ): number => {
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);

    const words = wordsFromRuns(runs);
    let curX = x;
    let curY = startY;
    let firstOnLine = true;

    words.forEach((w) => {
      if (/^\s+$/.test(w.text)) {
        if (!firstOnLine) {
          pdf.setFont(fontFamily, "normal");
          curX += pdf.getTextWidth(" ");
        }
        return;
      }

      pdf.setFont(fontFamily, styleFor(w.bold, w.italic));
      const wWidth = pdf.getTextWidth(w.text);

      if (!firstOnLine && curX + wWidth > x + maxWidth) {
        curX = x;
        curY += lineHeight;
        firstOnLine = true;
      }

      if (curY > PH - 22) {
        drawFooterBase();
        pdf.addPage();
        pageNum++;
        curY = 24;
        curX = x;
        firstOnLine = true;
      }

      pdf.text(w.text, curX, curY);
      curX += wWidth;
      firstOnLine = false;
    });

    return curY;
  };

  const measureInlineLines = (
    runs: Run[],
    maxWidth: number,
    fontSize: number,
    fontFamily: "helvetica" | "times" = "helvetica"
  ): number => {
    pdf.setFontSize(fontSize);
    const words = wordsFromRuns(runs);
    let curX = 0;
    let lines = 1;
    let firstOnLine = true;

    words.forEach((w) => {
      if (/^\s+$/.test(w.text)) {
        if (!firstOnLine) {
          pdf.setFont(fontFamily, "normal");
          curX += pdf.getTextWidth(" ");
        }
        return;
      }
      pdf.setFont(fontFamily, styleFor(w.bold, w.italic));
      const wWidth = pdf.getTextWidth(w.text);
      if (!firstOnLine && curX + wWidth > maxWidth) {
        curX = 0;
        lines++;
        firstOnLine = true;
      }
      curX += wWidth;
      firstOnLine = false;
    });

    return lines;
  };

  // ============================================================
  // ARC / RING HELPERS (jsPDF has no native dasharray-on-circle,
  // so the gauge ring is drawn as a fan of short line segments)
  // ============================================================

  const drawArc = (
    cx: number,
    cy: number,
    r: number,
    startDeg: number,
    endDeg: number,
    color: [number, number, number],
    lineWidth: number
  ) => {
    if (endDeg <= startDeg) return;
    pdf.setDrawColor(...color);
    pdf.setLineWidth(lineWidth);
    const steps = Math.max(2, Math.round((endDeg - startDeg) / 4));
    const toRad = (d: number) => (d * Math.PI) / 180;
    let prevX = cx + r * Math.cos(toRad(startDeg));
    let prevY = cy + r * Math.sin(toRad(startDeg));
    for (let i = 1; i <= steps; i++) {
      const deg = startDeg + ((endDeg - startDeg) * i) / steps;
      const x = cx + r * Math.cos(toRad(deg));
      const y = cy + r * Math.sin(toRad(deg));
      pdf.line(prevX, prevY, x, y);
      prevX = x;
      prevY = y;
    }
  };

  const drawComplianceGauge = (cx: number, cy: number, r: number, value: number | null) => {
    drawArc(cx, cy, r, -90, 270, C.rule, 1.6);
    if (value !== null) {
      const pct = Math.max(0, Math.min(100, value));
      drawArc(cx, cy, r, -90, -90 + (pct / 100) * 360, C.sage, 1.6);
    }
    pdf.setFont("times", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...C.forest);
    const label = value === null ? "—" : `${Math.round(value)}%`;
    pdf.text(label, cx, cy + 1.3, { align: "center" });
  };

  /** A wax-seal style badge for the verdict, centered at (cx, cy). */
  const drawVerdictSeal = (cx: number, cy: number, r: number, v: string) => {
    const isAccept = v.toUpperCase() === "ACCEPT";
    const color = isAccept ? C.pine : C.rubine;
    const label = isAccept ? "Accepted" : "Rejected";

    pdf.setDrawColor(...color);
    pdf.setLineWidth(1);
    pdf.circle(cx, cy, r, "S");
    pdf.setLineWidth(0.4);
    pdf.circle(cx, cy, r - 2, "S");

    pdf.setFont("times", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...color);
    pdf.text(label, cx, cy + 1, { align: "center", maxWidth: r * 1.7 });
  };

  // ============================================================
  // FOOTER
  // ============================================================

  const drawFooterBase = () => {
    pdf.setDrawColor(...C.rule);
    pdf.setLineWidth(0.3);
    pdf.line(ML, PH - 14, PW - MR, PH - 14);

    pdf.setFontSize(8);
    pdf.setFont("times", "italic");
    pdf.setTextColor(...C.gray);
    pdf.text("Generated by IntelliPaper", ML, PH - 9);
  };

  // ============================================================
  // PAGE BREAK
  // ============================================================

  const checkBreak = (needed: number, minimumY = 24) => {
    if (y + needed > PH - 22) {
      drawFooterBase();
      pdf.addPage();
      pageNum++;
      y = minimumY;
    }
  };

  // ============================================================
  // LETTERHEAD
  // ============================================================

  pdf.setFillColor(...C.forest);
  pdf.rect(0, 0, PW, 34, "F");

  // faint diagonal texture
  pdf.setGState(new (pdf as any).GState({ opacity: 0.06 }));
  pdf.setDrawColor(...C.white);
  pdf.setLineWidth(0.25);
  for (let d = -34; d < PW; d += 6) {
    pdf.line(d, 34, d + 34, 0);
  }
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  pdf.setFont("times", "bold");
  pdf.setFontSize(17);
  pdf.setTextColor(...C.white);
  pdf.text("IntelliPaper", ML, 15);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(200, 220, 210);
  pdf.text("AI-Powered Exam Paper Evaluation System", ML, 21);

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...C.white);
  pdf.text(dateStr, PW - MR, 15, { align: "right" });

  y = 46;

  // Document title, centered, letterpress style (rule / title / rule)
  pdf.setFont("times", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...C.forest);
  pdf.text("Final Evaluation Report", PW / 2, y, { align: "center" });

  y += 4;
  pdf.setDrawColor(...C.rule);
  pdf.setLineWidth(0.4);
  pdf.line(PW / 2 - 22, y, PW / 2 + 22, y);

  y += 8;

  // Course ledger line — thin vertical dividers instead of bullet dots
  const infoParts: string[] = [];
  if (courseName) infoParts.push(courseName);
  if (courseCode) infoParts.push(courseCode);
  if (paperType) {
    infoParts.push(paperType.charAt(0).toUpperCase() + paperType.slice(1) + " exam");
  }

  if (infoParts.length > 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(...C.gray);

    const widths = infoParts.map((p) => pdf.getTextWidth(p));
    const gap = 6;
    const totalW =
      widths.reduce((a, b) => a + b, 0) + gap * 2 * (infoParts.length - 1);
    let cx = PW / 2 - totalW / 2;

    infoParts.forEach((part, idx) => {
      pdf.text(part, cx, y);
      cx += widths[idx];
      if (idx < infoParts.length - 1) {
        cx += gap;
        pdf.setDrawColor(...C.rule);
        pdf.setLineWidth(0.3);
        pdf.line(cx, y - 3, cx, y + 1);
        cx += gap;
      }
    });

    y += 10;
  }

  // ============================================================
  // SUMMARY LEDGER — compliance gauge + verdict seal
  // ============================================================

  if (compliance || verdict) {
    const barHeight = 24;
    checkBreak(barHeight + 8);

    pdf.setFillColor(...C.parchment);
    pdf.rect(0, y - 6, PW, barHeight, "F");
    pdf.setDrawColor(...C.rule);
    pdf.setLineWidth(0.3);
    pdf.line(0, y - 6, PW, y - 6);
    pdf.line(0, y - 6 + barHeight, PW, y - 6 + barHeight);

    const midY = y - 6 + barHeight / 2;

    if (compliance) {
      const n = parseFloat(String(compliance).replace(/[^\d.]/g, ""));
      const value = Number.isFinite(n) ? n : null;
      drawComplianceGauge(ML + 9, midY, 8, value);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...C.gray);
      pdf.text("Compliance score", ML + 21, midY + 1.3);
    }

    if (verdict) {
      drawVerdictSeal(PW - MR - 9, midY, 9, verdict);
    }

    y += barHeight + 6;
  } else {
    y += 4;
  }

  // ============================================================
  // REPORT BODY
  // ============================================================

  const lines = report.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();

    // BLANK
    if (!t) {
      y += 2.5;
      continue;
    }

    // DIVIDER  (---, ***, ___ on their own line)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) {
      checkBreak(8);
      y += 3;
      pdf.setDrawColor(...C.rule);
      pdf.setLineWidth(0.4);
      pdf.line(ML, y, PW - MR, y);
      y += 6;
      continue;
    }

    // BLOCKQUOTE
    if (/^>\s?/.test(t)) {
      const runs = toRuns(t.replace(/^>\s?/, ""));
      const maxW = CW - 12;
      const lineCount = measureInlineLines(runs, maxW, 9.5, "times");
      const height = lineCount * 5.4 + 4;

      checkBreak(height + 4);

      pdf.setFillColor(...C.pine);
      pdf.rect(ML, y - 5, 1, height, "F");

      const endY = drawInline(
        runs,
        ML + 6,
        y,
        maxW,
        9.5,
        5.4,
        C.gray,
        "times"
      );
      y = endY + 6;
      continue;
    }

    // H1
    if (/^#\s/.test(t)) {
      const runs = toRuns(t.replace(/^#+\s/, ""));
      const maxW = CW;
      const lineCount = measureInlineLines(runs, maxW, 14, "times");
      const height = lineCount * 7;

      checkBreak(height + 14);
      y += 6;

      pdf.setDrawColor(...C.forest);
      pdf.setLineWidth(0.6);
      pdf.line(ML, y - 6, ML + 10, y - 6);

      const endY = drawInline(runs, ML, y, maxW, 14, 7, C.forest, "times");
      y = endY + 3;

      pdf.setDrawColor(...C.rule);
      pdf.setLineWidth(0.3);
      pdf.line(ML, y, PW - MR, y);
      y += 7;
      continue;
    }

    // H2
    if (/^##\s/.test(t)) {
      const runs = toRuns(t.replace(/^#+\s/, ""));
      const maxW = CW - 8;
      const lineCount = measureInlineLines(runs, maxW, 12, "times");
      const height = lineCount * 6.2;

      checkBreak(height + 10);
      y += 5;

      pdf.setFillColor(...C.pine);
      pdf.rect(ML, y - 5, 2.2, height, "F");

      const endY = drawInline(runs, ML + 6, y, maxW, 12, 6.2, C.forest, "times");
      y = endY + 5.5;
      continue;
    }

    // H3
    if (/^###/.test(t)) {
      const runs = toRuns(t.replace(/^#+\s/, ""));
      const maxW = CW;
      const lineCount = measureInlineLines(runs, maxW, 10.5, "helvetica");

      checkBreak(lineCount * 5.8 + 8);
      y += 3;

      const endY = drawInline(runs, ML, y, maxW, 10.5, 5.8, C.pine, "helvetica");
      y = endY + 4;
      continue;
    }

    // BULLET
    if (/^[-*•]\s/.test(t)) {
      const runs = toRuns(t.replace(/^[-*•]\s+/, ""));
      const indent = raw.search(/\S/);
      const extraIndent = indent > 0 ? Math.min(indent * 2, 12) : 0;
      const textX = ML + 7 + extraIndent;
      const maxW = CW - 12 - extraIndent;

      const lineCount = measureInlineLines(runs, maxW, 10, "helvetica");
      const height = lineCount * 5.6;

      checkBreak(height + 3);

      pdf.setFillColor(...C.sage);
      pdf.circle(ML + 2 + extraIndent, y - 1.4, 1, "F");

      const endY = drawInline(runs, textX, y, maxW, 10, 5.6, C.ink, "helvetica");
      y = endY + 2;
      continue;
    }

    // NUMBERED LIST
    if (/^\d+\.\s/.test(t)) {
      const match = t.match(/^(\d+\.)\s(.*)$/);
      const prefix = match ? match[1] : "";
      const rest = match ? match[2] : t;
      const runs = toRuns(rest);
      const maxW = CW - 12;

      const lineCount = measureInlineLines(runs, maxW, 10, "helvetica");
      const height = lineCount * 5.6;

      checkBreak(height + 3);

      pdf.setFont("times", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(...C.forest);
      pdf.text(prefix, ML, y);

      const endY = drawInline(runs, ML + 8, y, maxW, 10, 5.6, C.ink, "helvetica");
      y = endY + 2;
      continue;
    }

    // TABLE
    // Read the whole block of consecutive "|" lines first so column
    // widths can be sized to their actual content (e.g. a "Question"
    // column with long text gets more room than a short "Marks" column)
    // instead of splitting the page evenly across all columns.
    if (/^\|/.test(t)) {
      let j = i;
      const tableLines: string[] = [];
      while (j < lines.length && /^\|/.test(lines[j].trim())) {
        tableLines.push(lines[j].trim());
        j++;
      }

      const rows: string[][] = [];
      let headerRowIdx = -1;
      tableLines.forEach((line) => {
        if (/^\|[\s\-:|]+\|$/.test(line)) {
          headerRowIdx = rows.length - 1;
          return;
        }
        rows.push(
          line.split("|").filter((s) => s.trim() !== "").map((s) => s.trim())
        );
      });

      const colCount = rows.reduce((max, r) => Math.max(max, r.length), 1);

      // natural (single-line) width each column's content wants
      const rawWidths: number[] = new Array(colCount).fill(0);
      rows.forEach((r, ri) => {
        for (let c = 0; c < colCount; c++) {
          const cellText = plain(r[c] || "");
          pdf.setFont("helvetica", ri === headerRowIdx ? "bold" : "normal");
          pdf.setFontSize(8.5);
          const w = pdf.getTextWidth(cellText) + 6;
          rawWidths[c] = Math.max(rawWidths[c], w);
        }
      });

      const minW = Math.max(16, CW / (colCount * 2.2));
      const maxW = CW * 0.6;
      for (let c = 0; c < colCount; c++) {
        rawWidths[c] = Math.min(Math.max(rawWidths[c], minW), maxW);
      }

      // scale proportionally so columns fill the page width exactly —
      // wide content (long question text) ends up with a wide column,
      // short content (a score or a checkmark) stays narrow
      const totalRaw = rawWidths.reduce((a, b) => a + b, 0);
      const colWidths = rawWidths.map((w) => (w / totalRaw) * CW);
      const colX: number[] = [];
      let acc = ML;
      colWidths.forEach((w) => {
        colX.push(acc);
        acc += w;
      });

      let dataCounter = 0;

      rows.forEach((r, ri) => {
        const isHeader = ri === headerRowIdx;
        const cells = [...r];
        while (cells.length < colCount) cells.push("");

        let maxLines = 1;
        cells.forEach((cell, c) => {
          const wrapped = pdf.splitTextToSize(
            plain(cell),
            Math.max(colWidths[c] - 5, 10)
          );
          maxLines = Math.max(maxLines, wrapped.length);
        });

        const rowHeight = Math.max(8, maxLines * 4.6 + 3);
        checkBreak(rowHeight + 2);

        const rowTop = y - 5.2;

        if (isHeader) {
          pdf.setFillColor(...C.forest);
          pdf.rect(ML, rowTop, CW, rowHeight, "F");
          pdf.setFont("times", "bold");
          pdf.setFontSize(8.5);
          pdf.setTextColor(...C.white);
        } else {
          if (dataCounter % 2 === 1) {
            pdf.setFillColor(...C.parchment);
            pdf.rect(ML, rowTop, CW, rowHeight, "F");
          }
          dataCounter++;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8.5);
          pdf.setTextColor(...C.ink);
        }

        cells.forEach((cell, c) => {
          const text = plain(cell);
          const wrapped = pdf.splitTextToSize(
            text,
            Math.max(colWidths[c] - 5, 10)
          );
          pdf.text(wrapped, colX[c] + 2.5, y);
        });

        // full cell grid: outer + column dividers, drawn every row so
        // columns stay visually aligned all the way down the table
        const gridColor = isHeader ? C.forest : C.rule;
        pdf.setDrawColor(...gridColor);
        pdf.setLineWidth(isHeader ? 0.4 : 0.25);
        pdf.rect(ML, rowTop, CW, rowHeight, "S");
        for (let c = 1; c < colCount; c++) {
          pdf.line(colX[c], rowTop, colX[c], rowTop + rowHeight);
        }

        y += rowHeight;
      });

      i = j - 1;
      continue;
    }

    // NORMAL PARAGRAPH
    const runs = toRuns(t);
    const lineCount = measureInlineLines(runs, CW, 10, "helvetica");
    const height = lineCount * 5.6;

    checkBreak(height + 2);

    const endY = drawInline(runs, ML, y, CW, 10, 5.6, C.ink, "helvetica");
    y = endY + 3;
  }

  // ============================================================
  // FINAL FOOTER + PAGE NUMBERS
  // ============================================================

  drawFooterBase();

  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...C.gray);
    pdf.text(`Page ${p} of ${totalPages}`, PW - MR, PH - 9, { align: "right" });
  }

  // ============================================================
  // FILE NAME
  // ============================================================

  const safeName =
    fileName || `IntelliPaper_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

  pdf.save(safeName);
}