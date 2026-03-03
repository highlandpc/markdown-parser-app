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
  UnorderedList,
  ListLevel,
  BorderStyle,
  VerticalAlign,
  convertInchesToTwip,
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
      const html2pdf = (await import("html2pdf.js")).default;
      const element = previewRef.current;
      const clonedElement = element.cloneNode(true);
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.width = "210mm";
      tempContainer.appendChild(clonedElement);
      document.body.appendChild(tempContainer);

      await html2pdf()
        .set({
          margin: [15, 15, 15, 15],
          filename: `${fileName || "document"}.pdf`,
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(clonedElement)
        .save();

      document.body.removeChild(tempContainer);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  /* ================= DOCX EXPORT - PREMIUM FORMATTING ================= */
  const parseMarkdownToDOCX = (md) => {
    const lines = md.split("\n");
    const children = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Skip empty lines
      if (!line.trim()) {
        children.push(new Paragraph({ text: "", spacing: { line: 240 } }));
        i++;
        continue;
      }

      // Handle tables
      if (line.trim().startsWith("|")) {
        const tableRows = [];
        let j = i;
        while (j < lines.length && lines[j].trim().startsWith("|")) {
          if (!lines[j].includes("---")) {
            const cells = lines[j]
              .split("|")
              .filter((c) => c.trim())
              .map(
                (cell) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: cell.trim(),
                        bold: j === i,
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    shading: { fill: j === i ? "E5E7EB" : "ffffff" },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
                      bottom: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
                      left: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
                      right: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" },
                    },
                  })
              );
            tableRows.push(new TableRow({ children: cells }));
          }
          j++;
        }
        if (tableRows.length > 0) {
          children.push(
            new Table({
              rows: tableRows,
              width: { size: 100, type: "pct" },
            })
          );
        }
        i = j;
        continue;
      }

      // Handle headings
      if (line.startsWith("### ")) {
        children.push(
          new Paragraph({
            text: line.slice(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 240, after: 120 },
            bold: true,
            size: 24 * 2,
            color: "1F2937",
          })
        );
        i++;
        continue;
      } else if (line.startsWith("## ")) {
        children.push(
          new Paragraph({
            text: line.slice(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            bold: true,
            size: 28 * 2,
            color: "111827",
          })
        );
        i++;
        continue;
      } else if (line.startsWith("# ")) {
        children.push(
          new Paragraph({
            text: line.slice(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            bold: true,
            size: 32 * 2,
            color: "000000",
          })
        );
        i++;
        continue;
      }

      // Handle code blocks
      if (line.trim().startsWith("```")) {
        const codeLines = [];
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().startsWith("```")) {
          codeLines.push(lines[j]);
          j++;
        }
        const codeContent = codeLines.join("\n");
        children.push(
          new Paragraph({
            text: codeContent,
            spacing: { before: 120, after: 120, line: 240 },
            shading: { fill: "F3F4F6" },
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: "D1D5DB" } },
            indent: { left: 720 },
            children: [
              new TextRun({
                text: codeContent,
                fontFamily: "Courier New",
                size: 20,
                color: "374151",
              }),
            ],
          })
        );
        i = j + 1;
        continue;
      }

      // Handle block quotes
      if (line.startsWith(">")) {
        children.push(
          new Paragraph({
            text: line.slice(1).trim(),
            spacing: { line: 360, before: 120, after: 120 },
            indent: { left: 720 },
            border: { left: { style: BorderStyle.THICK, size: 24, color: "3B82F6" } },
            italics: true,
            color: "6B7280",
          })
        );
        i++;
        continue;
      }

      // Handle lists
      if (line.startsWith("- ") || line.startsWith("* ")) {
        const listLevel = (line.match(/^[\s]*/)[0].length / 2) * 1;
        const listItems = [];
        let j = i;
        while (j < lines.length && (lines[j].startsWith("- ") || lines[j].startsWith("* "))) {
          const level = (lines[j].match(/^[\s]*/)[0].length / 2) * 1;
          listItems.push({
            text: lines[j].trim().slice(2),
            level: Math.min(level, 3),
          });
          j++;
        }

        listItems.forEach((item) => {
          children.push(
            new Paragraph({
              text: item.text,
              bullet: { level: item.level },
              spacing: { line: 280, after: 60 },
            })
          );
        });
        i = j;
        continue;
      }

      // Handle normal paragraphs with inline formatting
      const paragraph = parseInlineFormatting(line);
      children.push(
        new Paragraph({
          children: paragraph,
          spacing: { line: 360, after: 120 },
          alignment: AlignmentType.LEFT,
        })
      );
      i++;
    }

    return children;
  };

  const parseInlineFormatting = (text) => {
    const runs = [];
    let current = 0;
    const boldRegex = /\*\*(.*?)\*\*/g;
    const italicRegex = /\*(.*?)\*/g;
    const codeRegex = /`(.*?)`/g;
    const linkRegex = /\[(.*?)\]\((.*?)\)/g;

    let match;
    let lastIndex = 0;

    const allMatches = [];
    boldRegex.lastIndex = 0;
    while ((match = boldRegex.exec(text))) {
      allMatches.push({ start: match.index, end: match.index + match[0].length, type: "bold", content: match[1] });
    }

    italicRegex.lastIndex = 0;
    while ((match = italicRegex.exec(text))) {
      if (!match[0].startsWith("**")) {
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: "italic",
          content: match[1],
        });
      }
    }

    codeRegex.lastIndex = 0;
    while ((match = codeRegex.exec(text))) {
      allMatches.push({ start: match.index, end: match.index + match[0].length, type: "code", content: match[1] });
    }

    allMatches.sort((a, b) => a.start - b.start);

    if (allMatches.length === 0) {
      runs.push(new TextRun({ text }));
      return runs;
    }

    lastIndex = 0;
    allMatches.forEach((m) => {
      if (lastIndex < m.start) {
        runs.push(new TextRun({ text: text.slice(lastIndex, m.start) }));
      }
      if (m.type === "bold") {
        runs.push(new TextRun({ text: m.content, bold: true, color: "111827" }));
      } else if (m.type === "italic") {
        runs.push(new TextRun({ text: m.content, italics: true, color: "6B7280" }));
      } else if (m.type === "code") {
        runs.push(
          new TextRun({
            text: m.content,
            fontFamily: "Courier New",
            color: "EF4444",
            shading: { fill: "FEF2F2" },
          })
        );
      }
      lastIndex = m.end;
    });

    if (lastIndex < text.length) {
      runs.push(new TextRun({ text: text.slice(lastIndex) }));
    }

    return runs.length > 0 ? runs : [new TextRun({ text })];
  };

  const exportDOCX = async () => {
    setExporting(true);
    try {
      const children = parseMarkdownToDOCX(markdown);

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margins: {
                  top: convertInchesToTwip(1),
                  right: convertInchesToTwip(1),
                  bottom: convertInchesToTwip(1),
                  left: convertInchesToTwip(1),
                },
              },
            },
            children,
          },
        ],
      });

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
      <style>{markdownStyles}</style>
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
        className="markdown-preview"
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
    fontSize: "15px",
  },
};

// Override markdown styles for better PDF rendering
const markdownStyles = `
.markdown-preview h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 20px 0 10px 0;
  color: #000000;
}
.markdown-preview h2 {
  font-size: 28px;
  font-weight: 700;
  margin: 20px 0 10px 0;
  color: #111827;
}
.markdown-preview h3 {
  font-size: 24px;
  font-weight: 700;
  margin: 15px 0 8px 0;
  color: #1f2937;
}
.markdown-preview strong {
  font-weight: 700;
  color: #111827;
}
.markdown-preview em {
  font-style: italic;
  color: #6b7280;
}
.markdown-preview code {
  background: #fef2f2;
  color: #ef4444;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}
.markdown-preview pre {
  background: #f3f4f6;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  overflow-x: auto;
  margin: 12px 0;
}
.markdown-preview pre code {
  background: none;
  color: #374151;
  padding: 0;
}
.markdown-preview blockquote {
  border-left: 4px solid #3b82f6;
  padding-left: 16px;
  margin: 12px 0;
  color: #6b7280;
  font-style: italic;
}
.markdown-preview table {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
}
.markdown-preview table th,
.markdown-preview table td {
  border: 1px solid #d1d5db;
  padding: 12px;
  text-align: left;
}
.markdown-preview table th {
  background: #e5e7eb;
  font-weight: 700;
  color: #111827;
}
.markdown-preview ul, .markdown-preview ol {
  margin: 12px 0;
  padding-left: 24px;
}
.markdown-preview li {
  margin: 6px 0;
  line-height: 1.6;
}
`;
