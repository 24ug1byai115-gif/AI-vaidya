"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Activity, MessageSquare, Database, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { name: "Ashrama (Home)", href: "/", icon: <Home className="w-5 h-5 shrink-0" /> },
    { name: "Shareera Kosha", href: "/shareera-kosha", icon: <Activity className="w-5 h-5 shrink-0" /> },
    { name: "Granthas (Docs)", href: "/docs", icon: <Database className="w-5 h-5 shrink-0" /> },
    { name: "Samvāda (Chat)", href: "/chat", icon: <MessageSquare className="w-5 h-5 shrink-0" /> },
  ];

  const chatHistory = [
    { id: 1, title: "Information not found..." },
    { id: 2, title: "What is charaka samhita" },
    { id: 3, title: "What are rasa" },
  ];

  return (
    <aside 
      className={`h-screen sticky top-0 bg-[#0A0D14] border-r border-[#1A2235] flex flex-col z-50 transition-all duration-300 ${
        isCollapsed ? "w-[80px]" : "w-[280px]"
      }`}
    >
      <div className={`p-6 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {!isCollapsed && (
          <div>
            <h1 className="font-cinzel text-2xl font-bold text-[#D4A017] tracking-wider drop-shadow-[0_0_10px_rgba(255,183,126,0.3)] whitespace-nowrap">
              AI Vaidya
            </h1>
            <p className="font-sans text-[9px] text-[#D4A017]/60 tracking-[0.2em] uppercase mt-1">
              Knowledge Base
            </p>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-[#D4A017]/10 text-[#D4A017]/70 hover:text-[#D4A017] transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        <nav className="px-4 space-y-2 mt-2 flex-none">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : ""}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? "bg-[#1A2235]/60 text-[#D4A017] shadow-[inset_0_0_15px_rgba(255,183,126,0.05)] border border-[#D4A017]/20"
                    : "text-[#8A7060] hover:text-[#D4A017] hover:bg-[#1A2235]/40 border border-transparent"
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                <div className={isActive ? "drop-shadow-[0_0_8px_rgba(255,183,126,0.8)]" : ""}>
                  {item.icon}
                </div>
                {!isCollapsed && (
                  <span className={`font-sans text-[14px] whitespace-nowrap ${isActive ? "font-semibold" : "font-medium"}`}>
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {!isCollapsed && (
          <div className="mt-8 px-6 flex-1">
            <h3 className="font-sans text-[11px] font-bold text-[#8A7060] uppercase tracking-wider mb-4">
              Recent Consultations
            </h3>
            <div className="space-y-1">
              {chatHistory.map((chat) => (
                <button 
                  key={chat.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-[#F2E5C8]/70 hover:bg-[#1A2235]/40 hover:text-[#D4A017] transition-colors group"
                >
                  <MessageCircle className="w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100" />
                  <span className="font-sans text-[13px] truncate">{chat.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-[#1A2235] relative">
        <div className="absolute inset-0 bg-gradient-to-t from-[#D4A017]/5 to-transparent pointer-events-none" />
        {isCollapsed ? (
            <p className="text-[11px] text-center text-[#D4A017]/40 font-serif italic">॥</p>
        ) : (
            <p className="text-[11px] text-center text-[#D4A017]/40 font-serif italic whitespace-nowrap">
              ॥ सर्वे भवन्तु सुखिनः ॥
            </p>
        )}
      </div>
    </aside>
  );
}
