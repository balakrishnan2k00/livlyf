import { useRef, useState } from "react";
import { acceptedFileLabel, extractTextFromFile } from "../lib/parseDocument";

type Props = {
  label: string;
  hint: string;
  value: string;
  onText: (text: string, fileName?: string) => void;
};

export function FileDropzone({ label, hint, value, onText }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const text = await extractTextFromFile(file);
      setFileName(file.name);
      onText(text, file.name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="file-zone">
      <span className="label">{label}</span>
      <p className="muted file-zone__hint">{hint} ({acceptedFileLabel()})</p>
      <div
        className="file-zone__drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles(e.dataTransfer.files);
        }}
      >
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Reading file…" : "Upload file"}
        </button>
        {fileName && <span className="tag">{fileName}</span>}
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.pdf,.docx,text/plain,application/pdf"
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>
      <textarea
        className="input file-zone__text"
        rows={8}
        placeholder="Or paste text here…"
        value={value}
        onChange={(e) => onText(e.target.value)}
      />
      {err && <p style={{ color: "var(--danger)", margin: "0.5rem 0 0", fontSize: "0.85rem" }}>{err}</p>}
    </div>
  );
}
