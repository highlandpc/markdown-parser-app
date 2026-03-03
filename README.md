# Markdown Parser & Exporter

A React app that lets you write Markdown, preview it, and export to **PDF** or **DOCX**.

## Live Demo

Once deployed: https://highlandpc.github.io/markdown-parser-app/

## Local Development

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Push this repo to `https://github.com/highlandpc/markdown-parser-app`
2. Go to **Settings → Pages → Source** and select **GitHub Actions**
3. Push to `main` — the workflow auto-builds and deploys

## Tech Stack

- React 18 + Vite
- `react-markdown` + `remark-gfm` for rendering
- `html2pdf.js` for PDF export
- `docx` for Word export
