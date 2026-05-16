const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type IngestResponse = {
  document_id: string;
  chunks_created: number;
  pages: number;
  languages_detected: string[];
  warnings: string[];
};

export async function postChat(payload: { message: string; session_id?: string; research_mode?: boolean }) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch AI Vaidya response");
  }
  return res.json();
}

export async function exploreTerm(term: string) {
  const res = await fetch(`${API_URL}/api/sanskrit/explore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ term }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to explore term");
  }
  return res.json();
}

export async function uploadPdf(file: File, ocr_fallback: boolean = false): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await fetch(`${API_URL}/api/ingest/pdf?ocr_fallback=${ocr_fallback}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to upload PDF");
  }
  return res.json();
}

export async function listDocuments() {
  const res = await fetch(`${API_URL}/api/ingest/documents`, {
    method: "GET",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to list documents");
  }
  return res.json();
}

export async function deleteDocument(document_id: string) {
  const res = await fetch(`${API_URL}/api/ingest/documents/${document_id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to delete document");
  }
  return res.json();
}
