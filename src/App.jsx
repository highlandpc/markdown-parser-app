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
} from "docx";

const DEFAULT_MD = `# Welcome to Markdown Parser & Exporter

Write or paste your **Markdown** here and export it as a PDF or Word document.

## Features

- Live preview with GitHub Flavored Markdown
- Export to PDF
- Export to DOCX
- Clean, minimal interface

## Example Table

| Name    | Role      | Status  |
|---------|-----------|---------|
| Alice   | Engineer  | Active  |
| Bob     | Designer  | Active  |
| Charlie | Manager   | Away    |

## Code Example

\`\`\`js
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

> **Tip:** Switch to the Preview tab to see the rendered output, then use the export buttons above.
`;

export default function MarkdownFormatterApp() {
  const [markdown, setMarkdown] = useState(DEFAULT_MD);
  const [fileName, setFileName] = useState("document");
  const [activeTab, setActiveTab] = useState("edit");
  const [exporting, setExporting] = useState(false);

  // FIX: previewRef must always be mounted so PDF export works regardless of active tab.
  // The preview div is rendered at all times but hidden via CSS when on the edit tab.
  const previewRef = useRef(null);

  /* ================= PDF EXPORT ================= */
  const exportPDF = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      // Dynamically import html2pdf to avoid SSR / bundling issues
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 0.75,
          filename: `${fileName || "document"}.pdf`,
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        })
        .from(previewRef.current)
        .save();
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  /* ================= DOCX EXPORT ================= */
  const exportDOCX = async () => {
    setExporting(true);
    try {
      const lines = markdown.split("\n");
      const children = [];

      lines.forEach((line) => {
        if (line.startsWith("### ")) {
          children.push(
            new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 })
          );
        } else if (line.startsWith("## ")) {
          children.push(
            new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 })
          );
        } else if (line.startsWith("# ")) {
          children.push(
            new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 })
          );
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
          children.push(
            new Paragraph({ text: line.slice(2), bullet: { level: 0 } })
          );
        } else {
          // Strip basic inline markdown for DOCX plain text fallback
          const plain = line
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/\*(.*?)\*/g, "$1")
            .replace(/`(.*?)`/g, "$1");
          children.push(
            new Paragraph({
              children: [new TextRun(plain)],
              alignment: AlignmentType.LEFT,
            })
          );
        }
      });

      const doc = new Document({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName || "document"}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOCX export failed:", err);
      alert("DOCX export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Markdown Parser &amp; Exporter</h1>

      {/* Controls */}
      <div style={styles.controls}>
        <input
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="File name (no extension)"
          style={styles.input}
        />
        <button onClick={exportPDF} disabled={exporting} style={styles.btnPrimary}>
          {exporting ? "Exporting…" : "Export PDF"}
        </button>
        <button onClick={exportDOCX} disabled={exporting} style={styles.btnSecondary}>
          {exporting ? "Exporting…" : "Export DOCX"}
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab("edit")}
          style={activeTab === "edit" ? styles.tabActive : styles.tabInactive}
        >
          ✏️ Edit
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          style={activeTab === "preview" ? styles.tabActive : styles.tabInactive}
        >
          👁 Preview
        </button>
      </div>

      {/* Editor — hidden (not unmounted) when on preview tab */}
      <textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        rows={22}
        style={{
          ...styles.editor,
          display: activeTab === "edit" ? "block" : "none",
        }}
        placeholder="Type or paste your Markdown here…"
      />

      {/* Preview — always mounted so previewRef is valid for PDF export */}
      <div
        ref={previewRef}
        style={{
          ...styles.preview,
          display: activeTab === "preview" ? "block" : "none",
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */
const styles = {
  container: {
    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
    padding: "40px 32px",
    maxWidth: "1000px",
    margin: "0 auto",
  },
  title: {
    fontSize: "26px",
    fontWeight: 700,
    marginBottom: "24px",
    color: "#111827",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "18px",
    flexWrap: "wrap",
  },
  input: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    minWidth: "180px",
    outline: "none",
  },
  btnPrimary: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#111827",
    color: "white",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
  },
  btnSecondary: {
    padding: "8px 16px",
    borderRadius: "6px",
    border: "1px solid #111827",
    backgroundColor: "white",
    color: "#111827",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
  },
  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
  },
  tabActive: {
    padding: "6px 14px",
    borderRadius: "6px",
    border: "1px solid #111827",
    backgroundColor: "#111827",
    color: "white",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
  },
  tabInactive: {
    padding: "6px 14px",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    backgroundColor: "white",
    color: "#374151",
    cursor: "pointer",
    fontSize: "13px",
  },
  editor: {
    width: "100%",
    padding: "16px",
    fontFamily: "'Fira Code', 'Courier New', monospace",
    fontSize: "14px",
    lineHeight: 1.6,
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    resize: "vertical",
    outline: "none",
    backgroundColor: "#fafafa",
  },
  preview: {
    padding: "32px",
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    minHeight: "400px",
    lineHeight: 1.7,
    color: "#1f2937",
  },
};
