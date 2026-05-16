"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { exploreTerm, uploadPdf, postChat, listDocuments, deleteDocument, type IngestResponse } from "@/lib/api";
import { Upload, FileText, Trash2, X, Loader2, FileCheck2 } from "lucide-react";

type IndexedDoc = {
  id: string;
  filename: string;
  sizeMB: string;
  chunks: number;
};

export default function DocsPage() {
  const [ocr, setOcr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [docs, setDocs] = useState<IndexedDoc[]>([]);
  const [summaryModal, setSummaryModal] = useState<{ open: boolean; doc: IndexedDoc | null; loading: boolean; text: string | null }>({
    open: false,
    doc: null,
    loading: false,
    text: null,
  });

  const [explorer, setExplorer] = useState("");
  const [exploreData, setExploreData] = useState<any>(null);
  const [exploreBusy, setExploreBusy] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const sessionId = useMemo(() => crypto.randomUUID(), []);

  useEffect(() => {
    async function loadDocs() {
      try {
        const data = await listDocuments();
        setDocs(data.documents);
      } catch (e) {
        console.error("Failed to load docs", e);
      }
    }
    loadDocs();
  }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      const data = await uploadPdf(f, ocr);
      const newDoc: IndexedDoc = {
        id: data.document_id,
        filename: f.name,
        sizeMB: (f.size / (1024 * 1024)).toFixed(2),
        chunks: data.chunks_created,
      };
      setDocs((prev) => [newDoc, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload error");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function handleSummarize(doc: IndexedDoc) {
    setSummaryModal({ open: true, doc, loading: true, text: null });
    try {
      const q = `Please provide a comprehensive summary of the document titled "${doc.filename}". Focus on the main Ayurvedic themes, concepts, and key teachings it contains.`;
      const res = await postChat({ message: q, session_id: sessionId, research_mode: false });
      setSummaryModal({ open: true, doc, loading: false, text: res.answer.direct_answer });
    } catch (err) {
      setSummaryModal({ open: true, doc, loading: false, text: "Failed to generate summary. The scrolls are silent." });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this document from the knowledge base?")) return;
    try {
      await deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError("Failed to delete document.");
    }
  }

  async function onExplore() {
    if (!explorer.trim()) return;
    setExploreBusy(true);
    setError(null);
    try {
      const r = await exploreTerm(explorer.trim());
      setExploreData(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Explore error");
    } finally {
      setExploreBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-[#F2E5C8] font-serif p-8 md:p-12 relative overflow-hidden">
      <div className="max-w-6xl mx-auto z-10 relative">
        <div className="mb-10">
            <h1 className="font-cinzel text-3xl md:text-4xl text-[#D4A017] tracking-wide mb-2 font-bold">Knowledge Base</h1>
            <p className="text-[14px] text-[#8A7060] font-sans">Manage your Ayurveda documents and PDFs for indexing.</p>
        </div>
        
        {error && <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-4 rounded-md mb-8 text-center font-sans text-sm">{error}</div>}

        <div className="grid md:grid-cols-[1fr_2fr] gap-8 mb-12">
            {/* Upload Area */}
            <div className="bg-[#10141D] border-2 border-dashed border-[#D4A017]/30 rounded-xl p-8 flex flex-col items-center text-center justify-center min-h-[300px] transition-all hover:border-[#D4A017]/50">
                <div className="w-16 h-16 rounded-full bg-[#D4A017]/10 flex items-center justify-center text-[#D4A017] mb-6">
                    <Upload className="w-7 h-7" />
                </div>
                <h3 className="font-cinzel text-xl text-[#D4A017] mb-3 font-bold">Upload Document</h3>
                <p className="font-sans text-sm text-[#8A7060] mb-8 max-w-[200px]">
                    Drag and drop your PDF here, or click to browse.
                </p>
                
                <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={onUpload} />
                <button 
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="w-full max-w-[240px] bg-[#D4A017] text-[#0A0D14] px-6 py-3 rounded-md font-sans font-semibold text-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                    {busy ? "Uploading..." : "Browse Files"}
                </button>
                <div className="mt-4 flex items-center gap-2">
                    <input type="checkbox" id="ocrCheck" checked={ocr} onChange={(e) => setOcr(e.target.checked)} className="accent-[#D4A017] w-4 h-4 cursor-pointer" />
                    <label htmlFor="ocrCheck" className="font-sans text-xs text-[#8A7060] cursor-pointer">Use OCR Fallback</label>
                </div>
            </div>

            {/* Indexed Documents Area */}
            <div className="bg-[#10141D] border border-[#1A2235] rounded-xl overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-[#1A2235] flex items-center justify-between">
                    <h3 className="font-cinzel text-xl text-[#D4A017] font-bold">Indexed Documents</h3>
                    <div className="bg-[#1A2235] text-[#D4A017] text-xs font-sans px-3 py-1 rounded-full border border-[#D4A017]/20">
                        {docs.length} files
                    </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col gap-4">
                    {docs.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-[#8A7060] font-sans text-sm italic">
                            No documents indexed yet.
                        </div>
                    ) : (
                        docs.map((doc) => (
                            <div key={doc.id} className="bg-[#0A0D14] border border-[#1A2235] p-4 rounded-lg flex items-center justify-between group hover:border-[#D4A017]/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-md bg-[#D4A017]/10 border border-[#D4A017]/20 flex items-center justify-center text-[#D4A017]">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-sans text-[15px] font-medium text-[#D4A017] mb-1">{doc.filename}</div>
                                        <div className="flex items-center gap-3 font-sans text-xs text-[#8A7060]">
                                            <span>{doc.sizeMB} MB</span>
                                            <span className="w-1 h-1 rounded-full bg-[#8A7060]/50"></span>
                                            <span className="flex items-center gap-1 text-[#4A9E6A]">
                                                <FileCheck2 className="w-3.5 h-3.5" />
                                                {doc.chunks} chunks
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleSummarize(doc)}
                                        className="p-2 text-[#D4A017]/70 hover:text-[#D4A017] hover:bg-[#D4A017]/10 rounded-md transition-colors"
                                        title="Summarize Document"
                                    >
                                        <FileText className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(doc.id)}
                                        className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                                        title="Delete Document"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

        {/* Legacy Explorer Section - kept below as requested */}
        <div className="bg-[#10141D] border border-[#1A2235] rounded-xl p-8">
            <h3 className="font-cinzel text-2xl text-[#D4A017] font-bold mb-2">Sanskrit Lexicon</h3>
            <p className="font-sans text-sm text-[#8A7060] mb-6">Explore roots, terms, and their presence across the entire corpus.</p>
            
            <div className="flex gap-4">
                <input 
                    value={explorer}
                    onChange={(e) => setExplorer(e.target.value)}
                    placeholder="Enter a term in IAST or Devanagari..."
                    className="flex-1 bg-[#0A0D14] border border-[#1A2235] text-[#F2E5C8] px-4 py-3 rounded-md font-sans outline-none focus:border-[#D4A017]/50"
                    onKeyDown={(e) => e.key === 'Enter' && onExplore()}
                />
                <button 
                    onClick={onExplore}
                    disabled={exploreBusy || !explorer.trim()}
                    className="bg-[#1A2235] border border-[#D4A017]/30 text-[#D4A017] px-6 py-3 rounded-md font-sans font-medium hover:bg-[#1A2235]/80 transition-colors disabled:opacity-50"
                >
                    {exploreBusy ? "Exploring..." : "Explore Lexicon"}
                </button>
            </div>

            {exploreData && (
                <div className="mt-6 border border-[#D4A017]/20 bg-[#0A0D14] rounded-md overflow-hidden">
                    <div className="bg-[#1A2235]/50 border-b border-[#D4A017]/10 p-4">
                        <div className="flex items-baseline justify-between mb-2">
                            <h4 className="font-devanagari text-2xl text-[#D4A017]">{exploreData.devanagari}</h4>
                            <span className="font-mono text-sm text-[#D4A017]/70 bg-[#D4A017]/10 px-2 py-0.5 rounded">{exploreData.iast}</span>
                        </div>
                        {exploreData.english_translation && (
                            <div className="mt-3 bg-[#10141D] p-3 rounded border border-[#1A2235]">
                                <p className="font-sans text-sm text-[#4A9E6A] font-medium mb-1">Literal Translation:</p>
                                <p className="font-sans text-sm text-[#F2E5C8]">{exploreData.english_translation}</p>
                            </div>
                        )}
                        {exploreData.ayurvedic_meaning && (
                            <div className="mt-2 bg-[#10141D] p-3 rounded border border-[#1A2235]">
                                <p className="font-sans text-sm text-[#E06030] font-medium mb-1">Ayurvedic Context:</p>
                                <p className="font-sans text-sm text-[#F2E5C8]">{exploreData.ayurvedic_meaning}</p>
                            </div>
                        )}
                        {exploreData.detected_entities?.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {exploreData.detected_entities.map((ent: string, idx: number) => (
                                    <span key={idx} className="text-xs font-sans px-2 py-1 bg-[#4A9E6A]/10 text-[#4A9E6A] rounded border border-[#4A9E6A]/20">
                                        {ent}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    {exploreData.sample_contexts?.length > 0 ? (
                        <div className="p-4 bg-[#0A0D14] max-h-[300px] overflow-y-auto custom-scrollbar">
                            <p className="font-sans text-xs text-[#8A7060] uppercase tracking-wider mb-3 font-bold">Corpus Occurrences</p>
                            <div className="space-y-4">
                                {exploreData.sample_contexts.map((ctx: any, idx: number) => (
                                    <div key={idx} className="border-l-2 border-[#D4A017]/30 pl-3">
                                        <p className="font-sans text-xs text-[#D4A017]/70 mb-1">{ctx.source_path} <span className="opacity-50 mx-1">•</span> Match: {(ctx.score * 100).toFixed(1)}%</p>
                                        <p className="font-sans text-sm text-[#F2E5C8]/80 leading-relaxed italic">"{ctx.excerpt}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-[#0A0D14] text-center">
                            <p className="font-sans text-sm text-[#8A7060] italic">This term was not found in any of your uploaded Granthas.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Summary Modal Overlay */}
      {summaryModal.open && summaryModal.doc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#10141D] border border-[#1A2235] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[#1A2235] flex items-center justify-between">
                    <div>
                        <h2 className="font-cinzel text-2xl text-[#D4A017] font-bold flex items-center gap-3">
                            <FileText className="w-6 h-6" /> Sāra (Summary)
                        </h2>
                        <p className="font-sans text-[13px] text-[#D4A017]/80 mt-1">{summaryModal.doc.filename}</p>
                    </div>
                    <button 
                        onClick={() => setSummaryModal({ open: false, doc: null, loading: false, text: null })}
                        className="p-2 text-[#8A7060] hover:text-[#D4A017] rounded-full hover:bg-[#D4A017]/10 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 bg-[#0A0D14] min-h-[250px] max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {summaryModal.loading ? (
                        <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-[#D4A017]">
                            <Loader2 className="w-10 h-10 animate-spin mb-4" />
                            <p className="font-sans text-sm">Analyzing document...</p>
                        </div>
                    ) : (
                        <div className="font-sans text-[15px] text-[#F2E5C8]/90 leading-relaxed whitespace-pre-wrap">
                            {summaryModal.text}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
