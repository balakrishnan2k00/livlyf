import mammoth from "mammoth";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const ACCEPT = [".txt", ".pdf", ".docx"];

export function acceptedFileLabel(): string {
  return ACCEPT.join(", ");
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "txt" || file.type === "text/plain") {
    return await file.text();
  }
  if (ext === "docx") {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }
  if (ext === "pdf") {
    const data = await file.arrayBuffer();
    const doc = await getDocument({ data }).promise;
    const chunks: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const line = content.items
        .map((item) => ("str" in item ? String(item.str) : ""))
        .join(" ");
      chunks.push(line);
    }
    return chunks.join("\n\n").trim();
  }
  throw new Error(`Unsupported file. Use ${acceptedFileLabel()}`);
}
