import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableCell,
  TableRow,
  BorderStyle,
  ShadingType,
  WidthType,
  convertInchesToTwip,
} from "docx";

/* ─────────────────────────────────────────────
   FULL PROFESSIONAL CSS — shared by preview + PDF
───────────────────────────────────────────── */
const REPORT_CSS = `
  body, .report-body {
    font-family: 'Segoe UI', Calibri, Arial, sans-serif;
    font-size: 11pt;
    color: #1a202c;
    line-height: 1.8;
    margin: 0;
    padding: 0;
    background: #fff;
  }
  h1 {
    font-size: 26pt;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 8pt 0;
    padding-bottom: 8pt;
    border-bottom: 3px solid #1e40af;
    line-height: 1.2;
  }
  h2 {
    font-size: 17pt;
    font-weight: 700;
    color: #1e3a8a;
    margin: 22pt 0 8pt 0;
    padding-bottom: 5pt;
    border-bottom: 1.5px solid #bfdbfe;
    line-height: 1.3;
  }
  h3 {
    font-size: 13pt;
    font-weight: 600;
    color: #1e40af;
    margin: 16pt 0 6pt 0;
    line-height: 1.3;
  }
  h4 {
    font-size: 11pt;
    font-weight: 600;
    color: #3b82f6;
    margin: 12pt 0 4pt 0;
  }
  p {
    margin: 0 0 9pt 0;
    text-align: justify;
    orphans: 3;
    widows: 3;
  }
  strong, b { font-weight: 700; color: #0f172a; }
  em, i { font-style: italic; color: #475569; }
  a { color: #2563eb; text-decoration: underline; }
  code {
    font-family: 'Courier New', Consolas, monospace;
    font-size: 9.5pt;
    background: #eff6ff;
    color: #1d4ed8;
    padding: 1pt 4pt;
    border-radius: 3pt;
    white-space: pre-wrap;
    word-break: break-word;
  }
  pre {
    background: #1e293b;
    color: #e2e8f0;
    padding: 12pt 14pt;
    border-left: 4pt solid #3b82f6;
    border-radius: 4pt;
    margin: 12pt 0;
    font-family: 'Courier New', Consolas, monospace;
    font-size: 9pt;
    line-height: 1.6;
    overflow-x: auto;
    page-break-inside: avoid;
  }
  pre code {
    background: none;
    color: #e2e8f0;
    padding: 0;
    font-size: 9pt;
    white-space: pre;
  }
  blockquote {
    margin: 12pt 0;
    padding: 10pt 14pt;
    background: #eff6ff;
    border-left: 5pt solid #3b82f6;
    color: #1e40af;
    font-style: italic;
    border-radius: 0 4pt 4pt 0;
    page-break-inside: avoid;
  }
  blockquote strong { color: #1e3a8a; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0;
    font-size: 10.5pt;
    page-break-inside: avoid;
  }
  thead tr { background: #1e3a8a; }
  thead th {
    color: #ffffff;
    font-weight: 700;
    padding: 9pt 11pt;
    text-align: left;
    border: 1pt solid #1e3a8a;
    white-space: nowrap;
  }
  tbody tr:nth-child(even) { background: #eff6ff; }
  tbody tr:nth-child(odd)  { background: #ffffff; }
  tbody td {
    padding: 8pt 11pt;
    border: 1pt solid #bfdbfe;
    color: #1e293b;
  }
  ul, ol { margin: 8pt 0; padding-left: 22pt; }
  li { margin: 4pt 0; line-height: 1.7; }
  li strong { color: #0f172a; }
  hr { border: none; border-top: 2pt solid #bfdbfe; margin: 16pt 0; }
`;

/* ─────────────────────────────────────────────
   SAMPLE CONTENT
───────────────────────────────────────────── */
const DEFAULT_MD = `# Business Analysis Report

## Executive Summary

This document demonstrates **premium formatting** for *professional business reports*.
Both PDF and Word exports match publication-grade quality expected from a trained analyst.

## Key Findings

- Revenue increased by **34%** year-over-year
- Customer churn reduced to *less than 5%*
- Operational costs stabilised through \`process automation\`
- Three new markets identified for Q3 expansion

## Performance Table

| Region        | Q1 Revenue | Q2 Revenue | Growth |
|---------------|-----------|-----------|--------|
| North America | \$1.2M    | \$1.6M    | +33%   |
| Europe        | \$0.8M    | \$1.1M    | +37%   |
| Asia-Pacific  | \$0.5M    | \$0.7M    | +40%   |
| Latin America | \$0.3M    | \$0.4M    | +33%   |

## Technical Implementation

\`\`\`python
def calculate_growth(q1, q2):
    return round((q2 - q1) / q1 * 100, 2)

regions = ["NA", "EU", "APAC", "LATAM"]
for region in regions:
    print(f"{region}: {calculate_growth(q1[region], q2[region])}%")
\`\`\`

> **Analyst Note:** The Asia-Pacific region shows the strongest growth trajectory and warrants increased investment in Q3 and Q4 planning cycles.

## Recommendations

1. Increase APAC marketing budget by 20%
2. Conduct churn root-cause analysis for Europe
3. Automate reporting pipeline for real-time dashboards
4. Review pricing strategy for Latin America market
`;

export default function MarkdownFormatterApp() {
  const [markdown, setMarkdown] = useState(DEFAULT_MD);
  const [fileName, setFileName] = useState("report");
  const [activeTab, setActiveTab] = useState("edit");
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef(null);

  /* ═══════════════════════════════════════════
     PDF EXPORT
     Build a visible off-screen div with the full
     rendered HTML + scoped CSS, then capture it.
     Key fix: element is position:fixed (not display:none)
     so html2canvas can actually render it.
  ═══════════════════════════════════════════ */
  const exportPDF = async () => {
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      const contentHTML = previewRef.current
        ? previewRef.current.innerHTML
        : "";

      // Full self-contained styled container rendered off-screen
      const container = document.createElement("div");
      container.style.cssText =
        "position:fixed;left:-99999px;top:0;width:794px;background:#ffffff;" +
        "padding:72px 80px;box-sizing:border-box;";

      // Inject scoped styles
      const style = document.createElement("style");
      style.textContent = REPORT_CSS.replace(/body, \.report-body/g, ".pdf-root");
      container.appendChild(style);

      const inner = document.createElement("div");
      inner.className = "pdf-root";
      inner.innerHTML = contentHTML;
      container.appendChild(inner);

      document.body.appendChild(container);

      await html2pdf()
        .set({
          margin: 0,
          filename: `${fileName || "report"}.pdf`,
          image: { type: "jpeg", quality: 1 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            windowWidth: 794,
          },
          jsPDF: {
            unit: "px",
            format: [794, 1123],
            orientation: "portrait",
          },
          pagebreak: {
            mode: ["css", "legacy"],
            avoid: ["tr", "td", "li", "pre", "blockquote"],
          },
        })
        .from(container)
        .save();

      document.body.removeChild(container);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert(`PDF export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  /* ═══════════════════════════════════════════
     DOCX EXPORT — Professional Business Report
     Uses correct docx v8 API:
       font: { name: "..." }  (not fontFamily)
       TextRun children for styled heading text
       ShadingType enum for shading
  ═══════════════════════════════════════════ */

  // Palette — docx colours have NO '#' prefix
  const C = {
    h1:       "0F172A",
    h2:       "1E3A8A",
    h3:       "1E40AF",
    h4:       "3B82F6",
    body:     "1A202C",
    muted:    "475569",
    code:     "1D4ED8",
    codeBg:   "EFF6FF",
    codeDark: "1E293B",
    codeText: "E2E8F0",
    tblHdr:   "1E3A8A",
    tblHdrTx: "FFFFFF",
    tblEven:  "EFF6FF",
    accent:   "3B82F6",
    border:   "BFDBFE",
    quoteTx:  "1E40AF",
    quoteBg:  "EFF6FF",
    white:    "FFFFFF",
  };

  // Shared body TextRun
  const TR = (text, opts = {}) =>
    new TextRun({ text, font: { name: "Calibri" }, size: 22, color: C.body, ...opts });

  // Parse inline **bold** *italic* `code` into TextRuns
  const inlineRuns = (text) => {
    if (!text) return [TR(" ")];
    const tokens = [];
    // Match bold before italic so ** is consumed first
    const re = /\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\*(.+?)\*|_(.+?)_/g;
    let last = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) tokens.push({ t: "plain", v: text.slice(last, m.index) });
      if (m[1] != null || m[2] != null)
        tokens.push({ t: "bold",   v: m[1] ?? m[2] });
      else if (m[3] != null)
        tokens.push({ t: "code",   v: m[3] });
      else if (m[4] != null || m[5] != null)
        tokens.push({ t: "italic", v: m[4] ?? m[5] });
      last = re.lastIndex;
    }
    if (last < text.length) tokens.push({ t: "plain", v: text.slice(last) });
    if (!tokens.length)      tokens.push({ t: "plain", v: text });

    return tokens.map(({ t, v }) => {
      if (t === "bold")
        return TR(v, { bold: true, color: C.h1 });
      if (t === "italic")
        return TR(v, { italics: true, color: C.muted });
      if (t === "code")
        return new TextRun({
          text: v,
          font: { name: "Courier New" },
          size: 19,
          color: C.code,
          shading: { type: ShadingType.CLEAR, color: "auto", fill: C.codeBg },
        });
      return TR(v);
    });
  };

  // Heading paragraph (children carry font/colour since heading style alone won't)
  const hPara = (text, level) => {
    const map = {
      1: { h: HeadingLevel.HEADING_1, sz: 52, col: C.h1,
           sp: { before: 0,   after: 200, line: 300 },
           br: { bottom: { style: BorderStyle.THICK, size: 18, color: C.accent, space: 4 } } },
      2: { h: HeadingLevel.HEADING_2, sz: 34, col: C.h2,
           sp: { before: 320, after: 160, line: 300 },
           br: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.border, space: 4 } } },
      3: { h: HeadingLevel.HEADING_3, sz: 26, col: C.h3,
           sp: { before: 240, after: 120, line: 300 } },
      4: { h: HeadingLevel.HEADING_4, sz: 22, col: C.h4,
           sp: { before: 200, after: 80,  line: 300 } },
    };
    const cfg = map[level] || map[4];
    return new Paragraph({
      heading:  cfg.h,
      spacing:  cfg.sp,
      border:   cfg.br,
      children: [new TextRun({ text, font: { name: "Calibri" }, size: cfg.sz, color: cfg.col, bold: true })],
    });
  };

  // Body paragraph
  const bPara = (text, spacing = { line: 360, after: 160 }) =>
    new Paragraph({ alignment: AlignmentType.LEFT, spacing, children: inlineRuns(text) });

  // Bullet
  const bulletP = (text, level = 0) =>
    new Paragraph({
      bullet: { level },
      spacing: { line: 320, after: 80 },
      children: inlineRuns(text),
    });

  // Code line
  const codeP = (text, isFirst, isLast) => {
    const borders = {
      left: { style: BorderStyle.THICK, size: 18, color: C.accent, space: 4 },
      ...(isFirst ? { top:    { style: BorderStyle.SINGLE, size: 4, color: "334155", space: 0 } } : {}),
      ...(isLast  ? { bottom: { style: BorderStyle.SINGLE, size: 4, color: "334155", space: 0 } } : {}),
    };
    return new Paragraph({
      spacing: { line: 240, before: isFirst ? 160 : 0, after: isLast ? 160 : 0 },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: C.codeDark },
      indent:  { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
      border:  borders,
      children: [
        new TextRun({ text: text || " ", font: { name: "Courier New" }, size: 18, color: C.codeText }),
      ],
    });
  };

  // Block quote — italic body text with blue left accent bar
  const quoteP = (text) =>
    new Paragraph({
      spacing: { line: 320, before: 80, after: 80 },
      indent:  { left: convertInchesToTwip(0.35) },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: C.quoteBg },
      border:  { left: { style: BorderStyle.THICK, size: 24, color: C.accent, space: 6 } },
      children: [
        new TextRun({ text, font: { name: "Calibri" }, size: 22, italics: true, color: C.quoteTx }),
      ],
    });

  // Table
  const buildTable = (tableLines) => {
    const rows = tableLines.map((line, rowIdx) => {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => {
          const isHdr  = rowIdx === 0;
          const isEven = !isHdr && rowIdx % 2 === 0;
          return new TableCell({
            shading:  { type: ShadingType.CLEAR, color: "auto", fill: isHdr ? C.tblHdr : isEven ? C.tblEven : C.white },
            borders:  {
              top:    { style: BorderStyle.SINGLE, size: 4, color: isHdr ? C.tblHdr : C.border },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: isHdr ? C.tblHdr : C.border },
              left:   { style: BorderStyle.SINGLE, size: 4, color: isHdr ? C.tblHdr : C.border },
              right:  { style: BorderStyle.SINGLE, size: 4, color: isHdr ? C.tblHdr : C.border },
            },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { line: 280 },
                children: [
                  new TextRun({
                    text: cell.trim(),
                    font: { name: "Calibri" },
                    size: isHdr ? 21 : 20,
                    color: isHdr ? C.tblHdrTx : C.body,
                    bold: isHdr,
                  }),
                ],
              }),
            ],
          });
        });
      return new TableRow({ children: cells, tableHeader: rowIdx === 0 });
    });
    return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
  };

  const parseToDOCX = (md) => {
    const lines = md.split("\n");
    const elems = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) {
        elems.push(new Paragraph({ text: "", spacing: { after: 100 } }));
        i++;
        continue;
      }

      // Headings
      const hm = line.match(/^(#{1,4}) (.*)/);
      if (hm) {
        elems.push(hPara(hm[2], hm[1].length));
        i++;
        continue;
      }

      // Fenced code block
      if (line.trim().startsWith("```")) {
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        codeLines.forEach((cl, idx) =>
          elems.push(codeP(cl, idx === 0, idx === codeLines.length - 1))
        );
        continue;
      }

      // Block quote
      if (line.startsWith(">")) {
        while (i < lines.length && lines[i].startsWith(">")) {
          elems.push(quoteP(lines[i].slice(1).trim()));
          i++;
        }
        continue;
      }

      // Table
      if (line.trimStart().startsWith("|")) {
        const tableLines = [];
        while (i < lines.length && lines[i].trimStart().startsWith("|")) {
          if (!lines[i].includes("---")) tableLines.push(lines[i]);
          i++;
        }
        if (tableLines.length) {
          elems.push(new Paragraph({ text: "", spacing: { after: 80 } }));
          elems.push(buildTable(tableLines));
          elems.push(new Paragraph({ text: "", spacing: { after: 160 } }));
        }
        continue;
      }

      // Unordered list
      if (/^[\s]*[-*+] /.test(line)) {
        while (i < lines.length && /^[\s]*[-*+] /.test(lines[i])) {
          const indent = lines[i].match(/^(\s*)/)[1].length;
          const text = lines[i].replace(/^[\s]*[-*+] /, "");
          elems.push(bulletP(text, Math.min(Math.floor(indent / 2), 2)));
          i++;
        }
        continue;
      }

      // Ordered list — use bullet (level 0) since numbering config requires AbstractNum
      if (/^\d+\. /.test(line)) {
        let num = 1;
        while (i < lines.length && /^\d+\. /.test(lines[i])) {
          const text = lines[i].replace(/^\d+\. /, "");
          elems.push(
            new Paragraph({
              spacing: { line: 320, after: 80 },
              children: [
                new TextRun({ text: `${num}.  `, font: { name: "Calibri" }, size: 22, color: C.body, bold: true }),
                ...inlineRuns(text),
              ],
            })
          );
          num++;
          i++;
        }
        continue;
      }

      // HR
      if (/^---+$/.test(line.trim())) {
        elems.push(
          new Paragraph({
            text: "",
            spacing: { before: 200, after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.border, space: 1 } },
          })
        );
        i++;
        continue;
      }

      // Normal paragraph
      elems.push(bPara(line));
      i++;
    }
    return elems;
  };

  const exportDOCX = async () => {
    setExporting(true);
    try {
      const children = parseToDOCX(markdown);
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margins: {
                top:    convertInchesToTwip(1),
                right:  convertInchesToTwip(1.25),
                bottom: convertInchesToTwip(1),
                left:   convertInchesToTwip(1.25),
              },
            },
          },
          children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${fileName || "report"}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOCX export failed:", err);
      alert(`DOCX export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  /* ═══════════════════════════════════════════  UI  ═══════════════════════════════════════════ */
  return (
    <div style={ui.page}>
      {/* Inject REPORT_CSS scoped to .markdown-preview for live preview */}
      <style>{REPORT_CSS.replace(/body, \.report-body/g, ".markdown-preview")}</style>
      <style>{`* { box-sizing: border-box; } .markdown-preview { padding: 0; }`}</style>

      <header style={ui.header}>
        <h1 style={ui.appTitle}>📄 Markdown Report Exporter</h1>
        <p style={ui.appSub}>Write Markdown · Export professional PDF &amp; Word reports</p>
      </header>

      <div style={ui.toolbar}>
        <input
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="File name (no extension)"
          style={ui.input}
        />
        <button onClick={exportPDF} disabled={exporting} style={ui.btnPDF}>
          {exporting ? "Exporting…" : "⬇ Export PDF"}
        </button>
        <button onClick={exportDOCX} disabled={exporting} style={ui.btnDOCX}>
          {exporting ? "Exporting…" : "⬇ Export Word (.docx)"}
        </button>
      </div>

      <div style={ui.tabs}>
        {["edit", "preview"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={activeTab === t ? ui.tabOn : ui.tabOff}
          >
            {t === "edit" ? "✏️  Edit" : "👁  Preview"}
          </button>
        ))}
      </div>

      <textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        rows={26}
        placeholder="Enter Markdown here…"
        style={{ ...ui.editor, display: activeTab === "edit" ? "block" : "none" }}
      />

      {/*
        Preview is ALWAYS mounted & position:fixed off-screen when hidden —
        this keeps it rendered so html2canvas can capture it at any time.
      */}
      <div
        ref={previewRef}
        className="markdown-preview"
        style={
          activeTab === "preview"
            ? ui.preview
            : { ...ui.preview, position: "fixed", left: "-99999px", top: 0, width: "794px", pointerEvents: "none" }
        }
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   APP UI STYLES (app chrome only — not report)
───────────────────────────────────────────── */
const ui = {
  page: {
    fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
    maxWidth: 1020,
    margin: "0 auto",
    padding: "36px 32px 60px",
    background: "#f8fafc",
    minHeight: "100vh",
  },
  header:   { marginBottom: 28 },
  appTitle: { fontSize: 24, fontWeight: 700, margin: "0 0 4px", color: "#0f172a" },
  appSub:   { margin: 0, fontSize: 13, color: "#64748b" },
  toolbar:  { display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  input: {
    padding: "9px 13px", borderRadius: 7, border: "1px solid #cbd5e1",
    fontSize: 14, minWidth: 190, outline: "none", background: "#fff", color: "#0f172a",
  },
  btnPDF: {
    padding: "9px 20px", borderRadius: 7, border: "none",
    background: "#1e3a8a", color: "#fff", cursor: "pointer",
    fontSize: 14, fontWeight: 600,
  },
  btnDOCX: {
    padding: "9px 20px", borderRadius: 7, border: "2px solid #1e3a8a",
    background: "#fff", color: "#1e3a8a", cursor: "pointer",
    fontSize: 14, fontWeight: 600,
  },
  tabs:   { display: "flex", gap: 8, marginBottom: 14 },
  tabOn:  {
    padding: "7px 18px", borderRadius: 7, border: "1.5px solid #1e3a8a",
    background: "#1e3a8a", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
  },
  tabOff: {
    padding: "7px 18px", borderRadius: 7, border: "1.5px solid #cbd5e1",
    background: "#fff", color: "#475569", cursor: "pointer", fontSize: 13,
  },
  editor: {
    width: "100%", padding: "18px",
    fontFamily: "'Fira Code','Courier New',monospace",
    fontSize: 13.5, lineHeight: 1.65, borderRadius: 8,
    border: "1px solid #cbd5e1", resize: "vertical", outline: "none",
    background: "#fff", color: "#1e293b", minHeight: 500,
  },
  preview: {
    padding: "44px 52px", background: "#ffffff", borderRadius: 10,
    border: "1px solid #e2e8f0", minHeight: 500,
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
  },
};

