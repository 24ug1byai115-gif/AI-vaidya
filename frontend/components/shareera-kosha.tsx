"use client";

import { useState, useRef } from "react";
import { postChat } from "@/lib/api";

const DATA = {
  head: {
    icon: "🧠",
    name: "Head & Brain",
    sa: "शिर — Shira (Seat of Prana)",
    dosha: "vata",
    dl: "Vata — Prana Vayu",
    view: "Shira is the supreme Marma — seat of Prana Vayu and all cognitive faculties. The brain governs Dhi (intellect), Dhriti (retention), and Smriti (memory). All ten sense organs originate from Shira.",
    issues: "Migraines, insomnia, anxiety, poor memory, hair loss, sinusitis, vertigo, epilepsy.",
    herbs: ["Brahmi", "Shankhpushpi", "Ashwagandha", "Bhringraj", "Jatamansi", "Vacha"],
    q: "What are the Ayurvedic treatments for head-related problems like headache, insomnia, and memory?",
  },
  throat: {
    icon: "🗣️",
    name: "Throat & Voice",
    sa: "कण्ठ — Kantha",
    dosha: "kapha",
    dl: "Kapha — Udana Vayu",
    view: "Kantha is governed by Udana Vayu and Bodhaka Kapha. It is the seat of speech and expression. The thyroid gland is linked to Agni regulation; imbalance here affects entire metabolism.",
    issues: "Sore throat, thyroid disorders, loss of voice, tonsillitis, chronic cough, goitre.",
    herbs: ["Tulsi", "Licorice", "Sitopaladi", "Trikatu", "Khadira", "Honey"],
    q: "What are Ayurvedic remedies for throat problems, thyroid issues, and voice disorders?",
  },
  heart: {
    icon: "🫀",
    name: "Heart & Chest",
    sa: "हृदय — Hridaya",
    dosha: "pitta",
    dl: "Pitta — Sadhaka Pitta",
    view: "Hridaya holds Ojas, the vital essence. Sadhaka Pitta governs intelligence and cardiac function. Prana Vayu and Avalambaka Kapha also reside here. The heart is described as the root of all consciousness.",
    issues: "Heart disease, palpitations, grief, chest tightness, hypertension, anxiety, angina.",
    herbs: ["Arjuna", "Ashwagandha", "Pushkarmool", "Guggul", "Saffron", "Rose"],
    q: "What does Ayurveda say about heart health, Hridaya, and chest-related disorders?",
  },
  lungs: {
    icon: "🫁",
    name: "Lungs",
    sa: "फुप्फुस — Phupphusa",
    dosha: "kapha",
    dl: "Kapha — Avalambaka",
    view: "The lungs are the seat of Avalambaka Kapha and Prana Vayu. They govern the intake of Prana (life force) and Ojas circulation. Lung health is deeply linked to grief, the emotion that weakens Vata and Kapha balance.",
    issues: "Asthma, bronchitis, COPD, pneumonia, chronic cough, shortness of breath, tuberculosis.",
    herbs: ["Vasa", "Kantakari", "Pippali", "Sitopaladi", "Pushkarmool", "Tulsi"],
    q: "What are Ayurvedic treatments for lung disorders, asthma, and respiratory health?",
  },
  liver: {
    icon: "🟤",
    name: "Liver",
    sa: "यकृत — Yakrit",
    dosha: "pitta",
    dl: "Pitta — Ranjaka Pitta",
    view: "Yakrit is governed by Ranjaka Pitta, responsible for blood formation, detoxification, and metabolic transformation. Liver health directly affects skin clarity, emotional balance, and digestion of fats.",
    issues: "Jaundice, fatty liver, hepatitis, skin disorders, anger imbalance, blood impurities, anemia.",
    herbs: ["Kutki", "Kalmegh", "Bhumi Amla", "Guduchi", "Punarnava", "Turmeric"],
    q: "What are Ayurvedic herbs and treatments for liver health and Yakrit disorders?",
  },
  stomach: {
    icon: "🔥",
    name: "Stomach & Digestion",
    sa: "आमाशय — Amashaya (Seat of Agni)",
    dosha: "pitta",
    dl: "Pitta — Pachaka / Jatharagni",
    view: "The stomach is home of Jatharagni — the central digestive fire. Pachaka Pitta governs all digestion. A balanced Agni is the cornerstone of all health in Ayurveda; its weakness causes Ama (toxin) accumulation.",
    issues: "Acidity, IBS, bloating, ulcers, constipation, Ama buildup, appetite loss, gastritis.",
    herbs: ["Triphala", "Hingvastak", "Ajwain", "Ginger", "Fennel", "Haritaki"],
    q: "What are Ayurvedic treatments for digestive problems, acidity, and improving Agni?",
  },
  kidney: {
    icon: "🫘",
    name: "Kidneys",
    sa: "वृक्क — Vrikka",
    dosha: "vata",
    dl: "Vata — Apana Vayu",
    view: "The kidneys are governed by Apana Vayu and filter Rasa Dhatu while maintaining fluid balance. Lower back pain is strongly associated with Vata imbalance and weak Vrikka energy. Mutra Vaha Srotas (urinary channels) originates here.",
    issues: "Kidney stones, UTI, lower back pain, edema, frequent urination, adrenal fatigue.",
    herbs: ["Punarnava", "Gokshura", "Varuna", "Chandraprabha", "Pashanabheda", "Shilajit"],
    q: "What does Ayurveda recommend for kidney health, urinary disorders, and lower back pain?",
  },
  arm: {
    icon: "💪",
    name: "Arms & Joints",
    sa: "बाहु — Bahu",
    dosha: "vata",
    dl: "Vata — Vyana Vayu",
    view: "Arms and joints are governed by Vyana Vayu which circulates throughout the body. Joint health depends on Shleshaka Kapha (synovial fluid) and proper Rakta circulation. Asthi and Majja Dhatus govern structural integrity.",
    issues: "Arthritis, frozen shoulder, carpal tunnel, muscle weakness, numbness, joint pain.",
    herbs: ["Shallaki", "Guggul", "Nirgundi", "Dashmool", "Mahanarayana Oil", "Castor Oil"],
    q: "What are Ayurvedic treatments for joint pain, arthritis, and arm-related disorders?",
  },
  leg: {
    icon: "🦵",
    name: "Legs & Knees",
    sa: "जानु — Janu (Knee Marma)",
    dosha: "vata",
    dl: "Vata — Apana & Vyana",
    view: "The legs contain vital Marma points — Janu (knee), Gulpha (ankle), Kshipra (sole). Leg health links to Vata balance, Asthi Dhatu strength, and Apana Vayu governing all downward energy movement.",
    issues: "Knee pain, varicose veins, sciatica, leg cramps, restless legs, gout, neuropathy.",
    herbs: ["Shallaki", "Rasna", "Eranda", "Guggul", "Dashmool", "Sesame Oil"],
    q: "What are Ayurvedic remedies for leg pain, knee problems, and lower limb disorders?",
  },
  feet: {
    icon: "🦶",
    name: "Feet & Pada Marma",
    sa: "पाद — Pada (Kshipra Marma)",
    dosha: "kapha",
    dl: "Kapha — Shleshaka",
    view: "Feet are sacred in Ayurveda as mirrors of the whole body. The Kshipra Marma on the sole connects to all organs via Sira (channels). Daily Pada Abhyanga (foot oil massage) with sesame oil grounds Vata and induces deep sleep.",
    issues: "Cracked heels, plantar fasciitis, cold feet, numbness, diabetic neuropathy, fungal issues.",
    herbs: ["Sesame Oil", "Ghee", "Triphala Soak", "Haritaki", "Neem", "Lodhra"],
    q: "What does Ayurveda say about Pada care, Kshipra Marma, and foot health?",
  },
};

type OrganId = keyof typeof DATA;

export function ShareeraKosha() {
  const [activeOrgan, setActiveOrgan] = useState<OrganId | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const sessionId = useRef(crypto.randomUUID());

  const handleMouseEnter = (e: React.MouseEvent<SVGGElement>, text: string) => {
    if (!svgRef.current) return;
    const box = svgRef.current.getBoundingClientRect();
    const er = (e.currentTarget as SVGElement).getBoundingClientRect();
    setTooltip({
      text,
      x: er.left - box.left + er.width / 2,
      y: er.top - box.top - 34,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const handleSelect = (id: OrganId) => {
    setActiveOrgan(id);
    setResponse(null);
  };

  const askVaidya = async (question?: string) => {
    if (!activeOrgan && !question) return;
    
    const q = question || DATA[activeOrgan!].q;
    
    setIsLoading(true);
    setResponse(""); // clear previous
    setIsTyping(false);

    try {
      const res = await postChat({ message: q, session_id: sessionId.current, research_mode: false });
      
      // Typewriter effect
      setIsLoading(false);
      setIsTyping(true);
      
      const words = res.answer.direct_answer.split(" ");
      let currentText = "";
      
      for (let i = 0; i < words.length; i++) {
        currentText += words[i] + " ";
        setResponse(currentText);
        await new Promise(r => setTimeout(r, 50));
      }
      setIsTyping(false);
      
    } catch (err) {
      setIsLoading(false);
      setResponse("The scrolls are silent. Please try again or check the connection.");
    }
  };

  return (
    <div className="min-h-screen bg-[#060408] text-[#F2E5C8] font-serif relative overflow-hidden p-6 md:p-12">
      <div className="max-w-[1200px] mx-auto relative z-10">
        <header className="text-center mb-12">
          <p className="font-devanagari text-[13px] text-[#D4A017] tracking-[0.15em] opacity-80 mb-2">
            ॥ शरीरमाद्यं खलु धर्मसाधनम् ॥
          </p>
          <h1 className="font-cinzel text-3xl md:text-5xl text-[#D4A017] tracking-[0.06em]">
            Shareera Kosha
          </h1>
          <div className="w-[240px] h-[1px] bg-gradient-to-r from-transparent via-[#D4A017] to-transparent mx-auto my-3" />
          <p className="text-[13px] text-[#8A7060] italic mt-1">
            The Sacred Body Map — Touch any region to consult the Vaidya
          </p>
        </header>

        <div className="grid md:grid-cols-[380px_1fr] gap-8 items-start">
          
          {/* Body Map Panel */}
          <div className="bg-gradient-to-br from-[#0E0A18] to-[#080612] border border-[#5A82C8]/25 rounded-[20px] p-5 relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_40%,rgba(30,60,140,0.18)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="text-center text-[11px] text-[#5A82C8]/60 mb-3 italic tracking-wider">
              ✦ Hover & click any organ or region ✦
            </div>

            <div className="relative max-w-[300px] mx-auto animate-[bodyPulse_3s_ease-in-out_infinite]">
              <style>{`
                @keyframes bodyPulse { 0%,100%{ opacity:0.7; } 50%{ opacity:1; } }
                @keyframes veinPulse { 0%,100%{ stroke-opacity:0.5; } 50%{ stroke-opacity:1; } }
                .organ-zone { cursor: pointer; transition: all 0.2s; }
                .organ-zone:hover { filter: brightness(1.6) drop-shadow(0 0 10px rgba(232,130,26,0.8)); }
                .organ-zone.lit { filter: brightness(2) drop-shadow(0 0 14px rgba(212,160,23,1)); }
                .vein-anim { animation: veinPulse 2.5s ease-in-out infinite; }
                .vein-anim2 { animation: veinPulse 3s ease-in-out infinite 0.5s; }
              `}</style>

              {tooltip && (
                <div 
                  className="absolute bg-[#060408]/95 border border-[#D4A017]/50 rounded-lg px-3 py-1.5 text-[12px] text-[#D4A017] whitespace-nowrap z-20 pointer-events-none transition-opacity font-serif"
                  style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
                >
                  {tooltip.text}
                </div>
              )}

              <svg ref={svgRef} viewBox="0 0 260 620" xmlns="http://www.w3.org/2000/svg" className="w-full block">
                <defs>
                  <filter id="fglow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="5" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <filter id="fsoft">
                    <feGaussianBlur stdDeviation="2"/>
                  </filter>
                  <radialGradient id="bodyGrad" cx="50%" cy="40%" r="55%">
                    <stop offset="0%" stopColor="#1E4A9A" stopOpacity="0.9"/>
                    <stop offset="60%" stopColor="#0D2455" stopOpacity="0.85"/>
                    <stop offset="100%" stopColor="#060E2A" stopOpacity="0.9"/>
                  </radialGradient>
                  <radialGradient id="heartGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FF5030"/>
                    <stop offset="100%" stopColor="#8B1500"/>
                  </radialGradient>
                  <radialGradient id="lungGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#C04A80"/>
                    <stop offset="100%" stopColor="#601030"/>
                  </radialGradient>
                  <radialGradient id="liverGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#A06020"/>
                    <stop offset="100%" stopColor="#502808"/>
                  </radialGradient>
                  <radialGradient id="stomachGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#308050"/>
                    <stop offset="100%" stopColor="#103820"/>
                  </radialGradient>
                  <radialGradient id="kidneyGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#7030B0"/>
                    <stop offset="100%" stopColor="#301060"/>
                  </radialGradient>
                  <radialGradient id="brainGrad" cx="50%" cy="40%" r="55%">
                    <stop offset="0%" stopColor="#5090E0"/>
                    <stop offset="100%" stopColor="#1030A0"/>
                  </radialGradient>
                </defs>

                {/* Body Silhouette */}
                <ellipse cx="130" cy="310" rx="90" ry="290" fill="none" stroke="#2A5FB0" strokeWidth="12" opacity="0.15" filter="url(#fsoft)"/>
                <ellipse cx="130" cy="310" rx="85" ry="285" fill="none" stroke="#3A7AE0" strokeWidth="6" opacity="0.25" filter="url(#fsoft)"/>
                <ellipse cx="130" cy="52" rx="38" ry="44" fill="url(#bodyGrad)" stroke="#3A7AE0" strokeWidth="1.2" opacity="0.9"/>
                <ellipse cx="130" cy="52" rx="38" ry="44" fill="none" stroke="#5A9AFF" strokeWidth="3" opacity="0.3" filter="url(#fsoft)"/>
                <rect x="112" y="92" width="36" height="30" rx="8" fill="#0D2455" opacity="0.9" stroke="#2A5FB0" strokeWidth="1"/>
                <path d="M70,120 Q60,122 55,130 L55,220 Q55,235 70,240 L190,240 Q205,235 205,220 L205,130 Q200,122 190,120 Z" fill="url(#bodyGrad)" stroke="#3A7AE0" strokeWidth="1.2" opacity="0.9"/>
                <path d="M70,120 Q60,122 55,130 L55,220 Q55,235 70,240 L190,240 Q205,235 205,220 L205,130 Q200,122 190,120 Z" fill="none" stroke="#5A9AFF" strokeWidth="4" opacity="0.2" filter="url(#fsoft)"/>
                <path d="M65,238 Q55,240 52,252 L52,290 Q54,305 75,312 L185,312 Q206,305 208,290 L208,252 Q205,240 195,238 Z" fill="#0A1E4A" stroke="#2A5FB0" strokeWidth="1" opacity="0.9"/>
                
                {/* Limbs omitted partially for brevity in jsx, copying main structures */}
                <path d="M55,122 Q38,125 30,138 L22,200 Q20,210 24,218 L40,218 Q46,210 46,200 L52,142 Z" fill="#0D2455" stroke="#2A5FB0" strokeWidth="1" opacity="0.9"/>
                <path d="M22,218 Q18,228 16,250 L14,320 Q14,332 22,336 L38,336 Q46,332 46,320 L46,250 Q44,228 40,218 Z" fill="#081840" stroke="#1E4A90" strokeWidth="1" opacity="0.85"/>
                <path d="M205,122 Q222,125 230,138 L238,200 Q240,210 236,218 L220,218 Q214,210 214,200 L208,142 Z" fill="#0D2455" stroke="#2A5FB0" strokeWidth="1" opacity="0.9"/>
                <path d="M238,218 Q242,228 244,250 L246,320 Q246,332 238,336 L222,336 Q214,332 214,320 L214,250 Q216,228 220,218 Z" fill="#081840" stroke="#1E4A90" strokeWidth="1" opacity="0.85"/>
                <path d="M80,310 Q68,314 64,330 L60,420 Q60,435 68,440 L98,440 Q106,435 108,420 L112,330 Q112,314 102,310 Z" fill="#0A1840" stroke="#2A5FB0" strokeWidth="1" opacity="0.9"/>
                <path d="M62,438 Q58,450 56,475 L54,540 Q54,555 64,560 L96,560 Q106,555 106,540 L104,475 Q102,450 98,438 Z" fill="#081438" stroke="#1E4A90" strokeWidth="1" opacity="0.85"/>
                <path d="M50,558 Q44,562 42,572 L42,580 Q44,586 54,588 L100,588 Q108,586 108,578 L108,570 Q106,562 100,558 Z" fill="#060E28" stroke="#1A4080" strokeWidth="1" opacity="0.85"/>
                <path d="M180,310 Q192,314 196,330 L200,420 Q200,435 192,440 L162,440 Q154,435 152,420 L148,330 Q148,314 158,310 Z" fill="#0A1840" stroke="#2A5FB0" strokeWidth="1" opacity="0.9"/>
                <path d="M198,438 Q202,450 204,475 L206,540 Q206,555 196,560 L164,560 Q154,555 154,540 L156,475 Q158,450 162,438 Z" fill="#081438" stroke="#1E4A90" strokeWidth="1" opacity="0.85"/>
                <path d="M210,558 Q216,562 218,572 L218,580 Q216,586 206,588 L160,588 Q152,586 152,578 L152,570 Q154,562 160,558 Z" fill="#060E28" stroke="#1A4080" strokeWidth="1" opacity="0.85"/>

                {/* Veins */}
                <path className="vein-anim" d="M130,155 L130,270" stroke="#CC3010" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path className="vein-anim2" d="M112,138 Q80,145 40,170 Q28,200 22,280 Q20,320 24,340" stroke="#CC3010" strokeWidth="1.5" fill="none" opacity="0.8"/>
                <path className="vein-anim2" d="M148,138 Q180,145 220,170 Q232,200 238,280 Q240,320 236,340" stroke="#CC3010" strokeWidth="1.5" fill="none" opacity="0.8"/>

                {/* ORGANS */}
                <g className={`organ-zone ${activeOrgan === 'head' ? 'lit' : ''}`} onClick={() => handleSelect('head')} onMouseEnter={(e) => handleMouseEnter(e, 'Head & Brain — Shira')} onMouseLeave={handleMouseLeave}>
                  <ellipse cx="118" cy="44" rx="20" ry="18" fill="url(#brainGrad)" opacity="0.85"/>
                  <ellipse cx="142" cy="44" rx="20" ry="18" fill="url(#brainGrad)" opacity="0.85"/>
                  <ellipse cx="130" cy="50" rx="38" ry="44" fill="transparent"/>
                </g>

                <g className={`organ-zone ${activeOrgan === 'throat' ? 'lit' : ''}`} onClick={() => handleSelect('throat')} onMouseEnter={(e) => handleMouseEnter(e, 'Throat — Kantha')} onMouseLeave={handleMouseLeave}>
                  <line x1="130" y1="96" x2="130" y2="122" stroke="rgba(180,220,255,0.4)" strokeWidth="4"/>
                  <ellipse cx="122" cy="110" rx="8" ry="6" fill="rgba(74,158,106,0.5)" stroke="#4A9E6A" strokeWidth="1"/>
                  <ellipse cx="138" cy="110" rx="8" ry="6" fill="rgba(74,158,106,0.5)" stroke="#4A9E6A" strokeWidth="1"/>
                  <rect x="112" y="93" width="36" height="30" fill="transparent"/>
                </g>

                <g className={`organ-zone ${activeOrgan === 'heart' ? 'lit' : ''}`} onClick={() => handleSelect('heart')} onMouseEnter={(e) => handleMouseEnter(e, 'Heart — Hridaya')} onMouseLeave={handleMouseLeave}>
                  <path d="M118,150 Q108,142 104,150 Q100,158 118,172 L130,182 L142,172 Q160,158 156,150 Q152,142 142,150 Q136,144 130,150 Q124,144 118,150Z" fill="url(#heartGrad)" opacity="0.9"/>
                  <ellipse cx="130" cy="163" rx="28" ry="22" fill="transparent"/>
                </g>

                <g className={`organ-zone ${activeOrgan === 'lungs' ? 'lit' : ''}`} onClick={() => handleSelect('lungs')} onMouseEnter={(e) => handleMouseEnter(e, 'Lungs — Phupphusa')} onMouseLeave={handleMouseLeave}>
                  <path d="M96,130 Q78,138 72,155 Q68,175 74,200 Q80,215 96,220 Q108,222 112,210 Q116,195 114,170 Q112,148 100,133Z" fill="url(#lungGrad)" opacity="0.75"/>
                  <path d="M164,130 Q182,138 188,155 Q192,175 186,200 Q180,215 164,220 Q152,222 148,210 Q144,195 146,170 Q148,148 160,133Z" fill="url(#lungGrad)" opacity="0.75"/>
                </g>

                <g className={`organ-zone ${activeOrgan === 'liver' ? 'lit' : ''}`} onClick={() => handleSelect('liver')} onMouseEnter={(e) => handleMouseEnter(e, 'Liver — Yakrit')} onMouseLeave={handleMouseLeave}>
                  <path d="M94,222 Q80,226 76,238 Q74,252 82,260 Q94,266 114,264 Q128,262 132,250 Q134,236 124,226 Q114,220 94,222Z" fill="url(#liverGrad)" opacity="0.85"/>
                  <ellipse cx="104" cy="244" rx="30" ry="24" fill="transparent"/>
                </g>

                <g className={`organ-zone ${activeOrgan === 'stomach' ? 'lit' : ''}`} onClick={() => handleSelect('stomach')} onMouseEnter={(e) => handleMouseEnter(e, 'Stomach — Amashaya')} onMouseLeave={handleMouseLeave}>
                  <path d="M130,228 Q118,226 114,236 Q110,250 116,264 Q122,274 132,274 Q142,274 148,264 Q154,250 150,236 Q146,226 134,228Z" fill="url(#stomachGrad)" opacity="0.85"/>
                  <ellipse cx="132" cy="252" rx="24" ry="28" fill="transparent"/>
                </g>

                <g className={`organ-zone ${activeOrgan === 'kidney' ? 'lit' : ''}`} onClick={() => handleSelect('kidney')} onMouseEnter={(e) => handleMouseEnter(e, 'Kidneys — Vrikka')} onMouseLeave={handleMouseLeave}>
                  <path d="M88,268 Q78,268 76,278 Q74,290 80,298 Q86,304 94,302 Q100,298 102,288 Q104,276 98,270 Q94,266 88,268Z" fill="url(#kidneyGrad)" opacity="0.85"/>
                  <path d="M172,268 Q182,268 184,278 Q186,290 180,298 Q174,304 166,302 Q160,298 158,288 Q156,276 162,270 Q166,266 172,268Z" fill="url(#kidneyGrad)" opacity="0.85"/>
                  <ellipse cx="90" cy="286" rx="16" ry="20" fill="transparent"/>
                  <ellipse cx="170" cy="286" rx="16" ry="20" fill="transparent"/>
                </g>

                <g className={`organ-zone ${activeOrgan === 'arm' ? 'lit' : ''}`} onClick={() => handleSelect('arm')} onMouseEnter={(e) => handleMouseEnter(e, 'Arms & Joints — Bahu')} onMouseLeave={handleMouseLeave}>
                  <rect x="20" y="120" width="38" height="220" rx="14" fill="transparent"/>
                  <rect x="202" y="120" width="38" height="220" rx="14" fill="transparent"/>
                </g>

                <g className={`organ-zone ${activeOrgan === 'leg' ? 'lit' : ''}`} onClick={() => handleSelect('leg')} onMouseEnter={(e) => handleMouseEnter(e, 'Legs & Knees — Janu')} onMouseLeave={handleMouseLeave}>
                  <rect x="56" y="308" width="60" height="250" rx="14" fill="transparent"/>
                  <rect x="144" y="308" width="60" height="250" rx="14" fill="transparent"/>
                </g>

                <g className={`organ-zone ${activeOrgan === 'feet' ? 'lit' : ''}`} onClick={() => handleSelect('feet')} onMouseEnter={(e) => handleMouseEnter(e, 'Feet — Pada Marma')} onMouseLeave={handleMouseLeave}>
                  <rect x="40" y="556" width="72" height="40" rx="6" fill="transparent"/>
                  <rect x="148" y="556" width="72" height="40" rx="6" fill="transparent"/>
                </g>

              </svg>
            </div>

            {/* Dosha legend */}
            <div className="flex gap-4 justify-center mt-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] text-[#8A7060]">
                <div className="w-2 h-2 rounded-full bg-[#5B8FD4]"></div>Vata
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#8A7060]">
                <div className="w-2 h-2 rounded-full bg-[#E06030]"></div>Pitta
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#8A7060]">
                <div className="w-2 h-2 rounded-full bg-[#4A9E6A]"></div>Kapha
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#8A7060]">
                <div className="w-2 h-2 rounded-full bg-[#A060E0]"></div>Chakra
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="sticky top-6">
            {!activeOrgan ? (
              <div className="bg-gradient-to-br from-[#0E0A18] to-[#080612] border border-[#5A82C8]/20 rounded-2xl p-10 text-center shadow-lg">
                <span className="font-devanagari text-6xl text-[#D4A017]/15 block mb-4 animate-pulse">ॐ</span>
                <p className="text-[13px] text-[#8A7060] italic leading-[1.7]">
                  The body is the sacred temple of the soul.<br/><br/>
                  Click any organ or region on the Shareera Kosha to receive the ancient wisdom of Ayurveda.
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#0E0A18] to-[#080612] border border-[#5A82C8]/20 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#D4A017]/10">
                  <div className="w-12 h-12 rounded-full bg-[radial-gradient(circle,rgba(26,58,106,0.6),rgba(10,8,20,0.8))] border border-[#5A82C8]/40 flex items-center justify-center text-[22px] shadow-[0_0_20px_rgba(42,95,176,0.4)] shrink-0">
                    {DATA[activeOrgan].icon}
                  </div>
                  <div>
                    <div className="font-cinzel text-[15px] text-[#D4A017]">{DATA[activeOrgan].name}</div>
                    <div className="font-devanagari text-[12px] text-[#8A7060] mt-1">{DATA[activeOrgan].sa}</div>
                  </div>
                </div>

                <div className={`inline-block px-3 py-1 rounded-full text-[11px] mb-4 border ${
                  DATA[activeOrgan].dosha === 'vata' ? 'bg-[#5B8FD4]/15 text-[#7AAAE8] border-[#5B8FD4]/35' : 
                  DATA[activeOrgan].dosha === 'pitta' ? 'bg-[#E06030]/15 text-[#F07050] border-[#E06030]/35' : 
                  'bg-[#4A9E6A]/15 text-[#6ABE8A] border-[#4A9E6A]/35'
                }`}>
                  {DATA[activeOrgan].dl}
                </div>

                <div className="text-[10px] tracking-[0.12em] uppercase text-[#8A7060] mb-1.5">Ayurvedic View</div>
                <div className="text-[13px] text-[#F2E5C8]/85 leading-[1.75] mb-4">{DATA[activeOrgan].view}</div>

                <div className="text-[10px] tracking-[0.12em] uppercase text-[#8A7060] mb-1.5">Common Imbalances</div>
                <div className="text-[13px] text-[#F2E5C8]/85 leading-[1.75] mb-4">{DATA[activeOrgan].issues}</div>

                <div className="text-[10px] tracking-[0.12em] uppercase text-[#8A7060] mb-1.5">Key Herbs & Remedies</div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {DATA[activeOrgan].herbs.map((h) => (
                    <span 
                      key={h}
                      onClick={() => askVaidya(`What are the Ayurvedic properties, uses, and dosage of the herb ${h}?`)}
                      className="bg-[#E8821A]/10 border border-[#E8821A]/30 text-[#E8821A] text-[11px] px-2.5 py-1 rounded-full cursor-pointer hover:bg-[#E8821A]/20 transition-all"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <button 
                  onClick={() => askVaidya()}
                  className="w-full p-3 bg-gradient-to-br from-[#8B2800] to-[#E8821A] text-[#F2E5C8] border-none rounded-lg text-[14px] cursor-pointer hover:shadow-[0_4px_30px_rgba(232,130,26,0.45)] transition-all flex justify-center items-center gap-2"
                >
                  🪔 Ask the Vaidya about this
                </button>
              </div>
            )}

            {(isLoading || response) && (
              <div className="bg-gradient-to-br from-[#0A0816] to-[#060410] border border-[#D4A017]/20 rounded-[14px] p-5 mt-4">
                <div className="text-[10px] tracking-[0.12em] uppercase text-[#D4A017] mb-2 flex items-center gap-2">
                  Vaidya speaks
                  <div className="flex-1 h-[1px] bg-[#D4A017]/20"></div>
                </div>
                <div className="text-[13px] text-[#F2E5C8]/85 leading-[1.8] italic">
                  {isLoading ? (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-[#D4A017] rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-[#D4A017] rounded-full animate-bounce delay-75"></span>
                      <span className="w-1.5 h-1.5 bg-[#D4A017] rounded-full animate-bounce delay-150"></span>
                    </div>
                  ) : (
                    <>
                      {response}
                      {isTyping && <span className="inline-block w-0.5 h-3.5 bg-[#D4A017] ml-0.5 animate-pulse"></span>}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
