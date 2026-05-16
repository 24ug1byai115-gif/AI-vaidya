"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { postChat } from "@/lib/api";
import { Mic, MicOff, Send, User, Bot, Volume2, VolumeX } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  grounded?: boolean;
};

export default function ChatPage() {
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, busy]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-IN';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setQuery(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  const toggleListen = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setQuery("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  };

  async function onSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim() || busy) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery("");
    setBusy(true);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    try {
      const r = await postChat({ message: userMessage.content, session_id: sessionId, research_mode: false });
      
      const aiMessage: Message = { 
        id: crypto.randomUUID(), 
        role: "assistant", 
        content: r.answer.direct_answer,
        grounded: r.grounded
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      if (autoSpeak && r.answer.direct_answer) {
        speakText(r.answer.direct_answer);
      }
    } catch (err) {
      const errorMessage: Message = { 
        id: crypto.randomUUID(), 
        role: "assistant", 
        content: err instanceof Error ? err.message : "The scrolls are silent. Communication error." 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#06080D]">
      {/* Header */}
      <header className="flex-none px-8 py-5 border-b border-[#1A2235] bg-[#0A0D14]">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#4A9E6A]"></div>
                <h1 className="font-sans text-[18px] font-bold text-[#F2E5C8]">Samvāda (Chat)</h1>
            </div>
            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 font-sans text-xs text-[#8A7060] cursor-pointer hover:text-[#D4A017] transition-colors">
                    <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} className="accent-[#D4A017] w-3.5 h-3.5" />
                    Auto-Speak
                </label>
                {isSpeaking && (
                    <button onClick={stopSpeaking} className="text-red-400 hover:text-red-500 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                        <VolumeX className="w-4 h-4" /> Stop Audio
                    </button>
                )}
            </div>
        </div>
        <p className="font-sans text-[12px] text-[#8A7060] max-w-4xl mx-auto mt-1 ml-5">Powered by Ancient Wisdom & Neural Nets</p>
      </header>

      {/* Chat History Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center opacity-50">
                <span className="font-devanagari text-6xl text-[#D4A017]/30 block mb-6">ॐ</span>
                <p className="font-sans text-sm text-[#8A7060]">The Vaidya awaits your inquiry.</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  msg.role === 'user' 
                  ? 'bg-[#D4A017]/10 border-[#D4A017]/20 text-[#D4A017]' 
                  : 'bg-[#1A2235] border-[#1A2235] text-[#8A7060]'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className={`max-w-[80%] rounded-2xl px-6 py-4 font-sans text-[15px] leading-relaxed ${
                  msg.role === 'user'
                  ? 'bg-[#151A24] text-[#F2E5C8] border border-[#1A2235]/50'
                  : 'bg-[#10141D] text-[#D4A017] border border-[#1A2235]'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {busy && (
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-[#1A2235] border-[#1A2235] text-[#8A7060]">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-[#10141D] border border-[#1A2235] rounded-2xl px-6 py-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D4A017] animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-[#D4A017] animate-bounce delay-75"></span>
                <span className="w-2 h-2 rounded-full bg-[#D4A017] animate-bounce delay-150"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 md:p-8 pt-2">
        <form onSubmit={onSend} className="max-w-4xl mx-auto relative flex items-end bg-[#10141D] border border-[#1A2235] rounded-2xl overflow-hidden focus-within:border-[#D4A017]/50 transition-colors shadow-lg">
            <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSend();
                    }
                }}
                placeholder="Ask the Vaidya..."
                className="w-full bg-transparent text-[#F2E5C8] placeholder:text-[#8A7060] font-sans px-6 py-5 outline-none resize-none min-h-[60px] max-h-[200px]"
                rows={1}
            />
            <div className="absolute right-4 bottom-3 flex items-center gap-2">
                <button 
                    type="button"
                    onClick={toggleListen}
                    className={`p-2.5 rounded-xl transition-colors ${
                        isListening 
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                        : 'text-[#8A7060] hover:text-[#D4A017] hover:bg-[#1A2235]'
                    }`}
                >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button 
                    type="submit"
                    disabled={busy || !query.trim()}
                    className="p-2.5 bg-[#D4A017]/10 text-[#D4A017] rounded-xl hover:bg-[#D4A017]/20 disabled:opacity-30 transition-colors"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </form>
        <p className="text-center font-sans text-[10px] text-[#8A7060] mt-3 uppercase tracking-wider">
            AI Vaidya can make mistakes. Always consult a real practitioner.
        </p>
      </div>
    </div>
  );
}
