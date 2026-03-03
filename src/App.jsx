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
      
      // Create professional PDF wrapper
      const wrapper = document.createElement("div");
      wrapper.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
      wrapper.style.lineHeight = "1.8";
      wrapper.style.color = "#2c3e50";
      wrapper.style.fontSize = "11pt";
      wrapper.innerHTML = `
        <style>
          @page { size: A4; margin: 20mm; }
          @media print {
            body { margin: 0; padding: 0; }
            * { orphans: 2; widows: 2; }
          }
          .pdf-wrapper { font-family: 'Segoe UI', sans-serif; }
          .pdf-wrapper h1 { font-size: 28pt; font-weight: 700; color: #1a202c; margin: 24pt 0 12pt 0; padding: 0; line-height: 1.3; }
          .pdf-wrapper h2 { font-size: 20pt; font-weight: 700; color: #2d3748; margin: 18pt 0 10pt 0; padding: 0; line-height: 1.3; border-bottom: 2pt solid #e2e8f0; padding-bottom: 8pt; }
          .pdf-wrapper h3 { font-size: 16pt; font-weight: 600; color: #4a5568; margin: 14pt 0 8pt 0; padding: 0; }
          .pdf-wrapper h4 { font-size: 14pt; font-weight: 600; color: #718096; margin: 10pt 0 6pt 0; }
          .pdf-wrapper p { margin: 0 0 10pt 0; text-align: justify; line-height: 1.8; }
          .pdf-wrapper strong { font-weight: 700; color: #1a202c; }
          .pdf-wrapper em { font-style: italic; color: #4a5568; }
          .pdf-wrapper code { background: #f7fafc; color: #d63384; padding: 2pt 4pt; font-family: 'Courier New', monospace; font-size: 10pt; border-radius: 2pt; }
          .pdf-wrapper pre { background: #2d3748; color: #e2e8f0; padding: 12pt; border-left: 4pt solid #4299e1; margin: 12pt 0; font-family: 'Courier New', monospace; font-size: 9pt; line-height: 1.6; overflow-x: auto; }
          .pdf-wrapper pre code { background: none; color: #e2e8f0; padding: 0; }
          .pdf-wrapper blockquote { border-left: 4pt solid #4299e1; margin: 10pt 0; padding-left: 12pt; color: #4a5568; font-style: italic; }
          .pdf-wrapper table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
          .pdf-wrapper th { background: #2d3748; color: #ffffff; padding: 10pt; text-align: left; font-weight: 600; border: 1pt solid #1a202c; }
          .pdf-wrapper td { padding: 10pt; border: 1pt solid #cbd5e0; background: #ffffff; }
          .pdf-wrapper tr:nth-child(even) td { background: #f7fafc; }
          .pdf-wrapper ul, .pdf-wrapper ol { margin: 10pt 0; padding-left: 24pt; }
          .pdf-wrapper li { margin: 6pt 0; line-height: 1.8; }
          .pdf-wrapper ul li:before { content: "▸ "; color: #4299e1; font-weight: bold; }
          .pdf-wrapper ul { list-style: none; }
          .pdf-wrapper a { color: #4299e1; text-decoration: none; }
        </style>
        <div class="pdf-wrapper">
          ${previewRef.current.innerHTML}
        </div>
      `;

      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.width = "210mm";
      tempContainer.appendChild(wrapper);
      document.body.appendChild(tempContainer);

      await html2pdf()
        .set({
          margin: { top: 20, right: 15, bottom: 20, left: 15 },
          filename: `${fileName || "document"}.pdf`,
          html2canvas: { 
            scale: 3, 
            useCORS: true, 
            logging: false,
            backgroundColor: "#ffffff"
          },
          jsPDF: { 
            unit: "mm", 
            format: "a4", 
            orientation: "portrait",
            compress: true
          },
          pagebreak: { mode: "avoid-all", before: ".page-break" },
        })
        .from(wrapper)
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

      // Skip empty lines but keep spacing
      if (!line.trim()) {
        children.push(new Paragraph({ text: "", spacing: { line: 240, after: 120 } }));
        i++;
        continue;
      }

      // Handle tables
      if (line.trim().startsWith("|")) {
        const tableRows = [];
        let j = i;
        const tableLines = [];
        while (j < lines.length && lines[j].trim().startsWith("|")) {
          if (!lines[j].includes("---")) {
            tableLines.push(lines[j]);
          }
          j++;
        }

        tableLines.forEach((tableLine, lineIdx) => {
          const cells = tableLine
            .split("|")
            .filter((c) => c.trim())
            .map(
              (cell, cellIdx) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      text: cell.trim(),
                      bold: lineIdx === 0,
                      alignment: AlignmentType.CENTER,
                      run: new TextRun({
                        size: lineIdx === 0 ? 24 : 22,
                        color: lineIdx === 0 ? "FFFFFF" : "2C3E50",
                        bold: lineIdx === 0,
                      }),
                      spacing: { line: 300, before: 80, after: 80 },
                    }),
                  ],
                  shading: {
                    fill: lineIdx === 0 ? "2D3748" : cellIdx % 2 === 0 ? "F7FAFC" : "FFFFFF",
                  },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E0" },
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E0" },
                    left: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E0" },
                    right: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E0" },
                  },
                })
            );
          tableRows.push(new TableRow({ children: cells }));
        });

        if (tableRows.length > 0) {
          children.push(
            new Paragraph({ text: "", spacing: { after: 120 } }),
            new Table({
              rows: tableRows,
              width: { size: 100, type: "pct" },
            }),
            new Paragraph({ text: "", spacing: { after: 120 } })
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
            spacing: { before: 240, after: 120, line: 360 },
            bold: true,
            size: 26 * 2,
            color: "4A5568",
          })
        );
        i++;
        continue;
      } else if (line.startsWith("## ")) {
        children.push(
          new Paragraph({
            text: line.slice(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 280, after: 140, line: 360 },
            bold: true,
            size: 28 * 2,
            color: "2D3748",
            border: {
              bottom: { color: "E2E8F0", space: 1, style: BorderStyle.SINGLE, size: 12 },
            },
          })
        );
        i++;
        continue;
      } else if (line.startsWith("# ")) {
        children.push(
          new Paragraph({
            text: line.slice(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 320, after: 160, line: 360 },
            bold: true,
            size: 32 * 2,
            color: "1A202C",
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
        const codeContent = codeLines.join("\n").trim();
        
        children.push(
          new Paragraph({
            text: "",
            spacing: { before: 120, after: 0 },
          })
        );

        codeContent.split("\n").forEach((codeLine) => {
          children.push(
            new Paragraph({
              text: codeLine || " ",
              spacing: { line: 240, before: 0, after: 0 },
              shading: { fill: "2D3748" },
              border: {
                left: { style: BorderStyle.SINGLE, size: 24, color: "4299E1" },
              },
              indent: { left: 720, hanging: 0 },
              children: [
                new TextRun({
                  text: codeLine || " ",
                  fontFamily: "Courier New",
                  size: 20,
                  color: "E2E8F0",
                }),
              ],
            })
          );
        });

        children.push(
          new Paragraph({
            text: "",
            spacing: { after: 120 },
          })
        );
        i = j + 1;
        continue;
      }

      // Handle block quotes
      if (line.startsWith(">")) {
        const quoteLines = [];
        let j = i;
        while (j < lines.length && lines[j].startsWith(">")) {
          quoteLines.push(lines[j].slice(1).trim());
          j++;
        }

        quoteLines.forEach((quoteLine) => {
          children.push(
            new Paragraph({
              text: quoteLine,
              spacing: { line: 300, before: 80, after: 80 },
              indent: { left: 720 },
              border: {
                left: { style: BorderStyle.THICK, size: 24, color: "4299E1" },
              },
              italics: true,
              color: "4A5568",
            })
          );
        });

        i = j;
        continue;
      }

      // Handle lists
      if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("+ ")) {
        const listItems = [];
        let j = i;
        while (j < lines.length && (lines[j].startsWith("- ") || lines[j].startsWith("* ") || lines[j].startsWith("+ "))) {
          const level = (lines[j].match(/^[\s]*/)[0].length / 2) * 1;
          const text = lines[j].trim().slice(2);
          listItems.push({ text, level: Math.min(level, 3) });
          j++;
        }

        listItems.forEach((item) => {
          const paragraphChildren = parseInlineFormatting(item.text);
          children.push(
            new Paragraph({
              children: paragraphChildren,
              bullet: { level: Math.min(item.level, 2) },
              spacing: { line: 300, after: 80 },
            })
          );
        });
        i = j;
        continue;
      }

      // Handle numbered lists
      if (/^\d+\.\s/.test(line)) {
        const listItems = [];
        let j = i;
        while (j < lines.length && /^\d+\.\s/.test(lines[j])) {
          const match = lines[j].match(/^[\s]*\d+\.\s(.*)/);
          const text = match ? match[1] : "";
          listItems.push({
            text,
            level: (lines[j].match(/^[\s]*/)[0].length / 2) * 1,
          });
          j++;
        }

        listItems.forEach((item, idx) => {
          const paragraphChildren = parseInlineFormatting(item.text);
          children.push(
            new Paragraph({
              children: paragraphChildren,
              numPr: { ilvl: Math.min(item.level, 2), numId: 1 },
              spacing: { line: 300, after: 80 },
            })
          );
        });
        i = j;
        continue;
      }

      // Handle normal paragraphs with inline formatting
      const paragraphChildren = parseInlineFormatting(line);
      children.push(
        new Paragraph({
          children: paragraphChildren,
          spacing: { line: 360, after: 120 },
          alignment: AlignmentType.LEFT,
        })
      );
      i++;
    }

    return children;
  };

  const parseInlineFormatting = (text) => {
    if (!text.trim()) return [new TextRun({ text: " " })];

    const runs = [];
    const patterns = [
      { regex: /\*\*(.*?)\*\*/g, type: "bold", extract: (m) => m[1] },
      { regex: /__(.*?)__/g, type: "bold", extract: (m) => m[1] },
      { regex: /\*(.*?)\*/g, type: "italic", extract: (m) => m[1] },
      { regex: /_(.*?)_/g, type: "italic", extract: (m) => m[1] },
      { regex: /`([^`]+)`/g, type: "code", extract: (m) => m[1] },
    ];

    const matches = [];
    patterns.forEach((pattern) => {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(text))) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: pattern.type,
          content: pattern.extract(match),
        });
      }
    });

    matches.sort((a, b) => a.start - b.start);

    if (matches.length === 0) {
      runs.push(
        new TextRun({
          text,
          size: 22,
          color: "2C3E50",
          fontFamily: "Calibri",
        })
      );
      return runs;
    }

    let lastIndex = 0;
    matches.forEach((m) => {
      if (lastIndex < m.start) {
        runs.push(
          new TextRun({
            text: text.slice(lastIndex, m.start),
            size: 22,
            color: "2C3E50",
            fontFamily: "Calibri",
          })
        );
      }

      if (m.type === "bold") {
        runs.push(
          new TextRun({
            text: m.content,
            bold: true,
            size: 22,
            color: "1A202C",
            fontFamily: "Calibri",
          })
        );
      } else if (m.type === "italic") {
        runs.push(
          new TextRun({
            text: m.content,
            italics: true,
            size: 22,
            color: "4A5568",
            fontFamily: "Calibri",
          })
        );
      } else if (m.type === "code") {
        runs.push(
          new TextRun({
            text: m.content,
            fontFamily: "Courier New",
            size: 20,
            color: "D63384",
            shading: { fill: "F7FAFC" },
          })
        );
      }
      lastIndex = m.end;
    });

    if (lastIndex < text.length) {
      runs.push(
        new TextRun({
          text: text.slice(lastIndex),
          size: 22,
          color: "2C3E50",
          fontFamily: "Calibri",
        })
      );
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
                  right: convertInchesToTwip(1.25),
                  bottom: convertInchesToTwip(1),
                  left: convertInchesToTwip(1.25),
                },
              },
            },
            children: [
              ...children,
              new Paragraph({
                text: "",
                spacing: { before: 240 },
              }),
            ],
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

// Professional markdown styles for preview and PDF export
const markdownStyles = `
* {
  box-sizing: border-box;
}

.markdown-preview {
  font-family: 'Segoe UI', 'Calibri', Arial, sans-serif !important;
  color: #2c3e50 !important;
  line-height: 1.8 !important;
  font-size: 16px !important;
}

.markdown-preview h1 {
  font-size: 36px !important;
  font-weight: 700 !important;
  margin: 32px 0 16px 0 !important;
  padding: 0 !important;
  color: #1a202c !important;
  line-height: 1.3 !important;
  border-bottom: 3px solid #e2e8f0 !important;
  padding-bottom: 12px !important;
}

.markdown-preview h2 {
  font-size: 28px !important;
  font-weight: 700 !important;
  margin: 28px 0 14px 0 !important;
  padding: 0 !important;
  color: #2d3748 !important;
  line-height: 1.3 !important;
  border-bottom: 2px solid #cbd5e0 !important;
  padding-bottom: 10px !important;
}

.markdown-preview h3 {
  font-size: 22px !important;
  font-weight: 700 !important;
  margin: 20px 0 10px 0 !important;
  padding: 0 !important;
  color: #4a5568 !important;
}

.markdown-preview h4 {
  font-size: 18px !important;
  font-weight: 600 !important;
  margin: 16px 0 8px 0 !important;
  color: #718096 !important;
}

.markdown-preview p {
  margin: 0 0 12px 0 !important;
  text-align: justify !important;
  line-height: 1.8 !important;
}

.markdown-preview strong, .markdown-preview b {
  font-weight: 700 !important;
  color: #1a202c !important;
}

.markdown-preview em, .markdown-preview i {
  font-style: italic !important;
  color: #4a5568 !important;
}

.markdown-preview code {
  background: #f7fafc !important;
  color: #d63384 !important;
  padding: 3px 6px !important;
  font-family: 'Courier New', monospace !important;
  font-size: 15px !important;
  border-radius: 3px !important;
  display: inline-block !important;
}

.markdown-preview pre {
  background: #2d3748 !important;
  color: #e2e8f0 !important;
  padding: 16px !important;
  border-left: 5px solid #4299e1 !important;
  margin: 16px 0 !important;
  font-family: 'Courier New', monospace !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
  overflow-x: auto !important;
  border-radius: 4px !important;
}

.markdown-preview pre code {
  background: none !important;
  color: #e2e8f0 !important;
  padding: 0 !important;
  font-size: 14px !important;
}

.markdown-preview blockquote {
  border-left: 5px solid #4299e1 !important;
  margin: 16px 0 !important;
  padding-left: 16px !important;
  color: #4a5568 !important;
  font-style: italic !important;
  background: #f7fafc !important;
  padding: 12px 16px !important;
}

.markdown-preview table {
  width: 100% !important;
  border-collapse: collapse !important;
  margin: 16px 0 !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
}

.markdown-preview table th {
  background: #2d3748 !important;
  color: #ffffff !important;
  padding: 12px !important;
  text-align: left !important;
  font-weight: 700 !important;
  border: 1px solid #1a202c !important;
}

.markdown-preview table td {
  padding: 12px !important;
  border: 1px solid #cbd5e0 !important;
}

.markdown-preview table tr:nth-child(even) td {
  background: #f7fafc !important;
}

.markdown-preview table tr:hover td {
  background: #edf2f7 !important;
}

.markdown-preview ul, .markdown-preview ol {
  margin: 12px 0 !important;
  padding-left: 32px !important;
}

.markdown-preview li {
  margin: 8px 0 !important;
  line-height: 1.8 !important;
  color: #2c3e50 !important;
}

.markdown-preview ul li {
  list-style-type: disc !important;
}

.markdown-preview ul li li {
  list-style-type: circle !important;
}

.markdown-preview ol li {
  list-style-type: decimal !important;
}

.markdown-preview a {
  color: #4299e1 !important;
  text-decoration: none !important;
  border-bottom: 1px dotted #4299e1 !important;
}

.markdown-preview a:hover {
  text-decoration: underline !important;
}

.markdown-preview hr {
  border: none !important;
  border-top: 2px solid #cbd5e0 !important;
  margin: 20px 0 !important;
}

@media print {
  .markdown-preview {
    background: white !important;
  }
  .markdown-preview h1, .markdown-preview h2, .markdown-preview h3, .markdown-preview h4 {
    page-break-after: avoid !important;
  }
  .markdown-preview ul, .markdown-preview ol, .markdown-preview table {
    page-break-inside: avoid !important;
  }
  .markdown-preview li {
    page-break-inside: avoid !important;
  }
}
`;
