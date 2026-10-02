'use client';
import React, { useState, useEffect } from 'react';
import { Dices, Ticket, Loader2 } from 'lucide-react';

const generateSeededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export const LotteryModule = () => {
  const [data, setData] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchLottery = async () => {
      try {
        const res = await fetch('/api/lottery');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchLottery();
    const interval = setInterval(fetchLottery, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    if (!data) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % 6);
    }, 10000); // 10 seconds per slide
    return () => clearInterval(interval);
  }, [data]);

  if (!data) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  const quinielaSlides = [
    { title: 'LA PREVIA', data: data.previa, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'LA PRIMERA', data: data.primera, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { title: 'MATUTINA', data: data.matutina, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { title: 'VESPERTINA', data: data.vespertina, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: 'NOCTURNA', data: data.nocturna, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  ];

  return (
    <div className="w-full h-full flex flex-col p-2 lg:p-4 bg-[#202020] text-white rounded-md relative overflow-hidden justify-between">

      {/* Header */}
      <div className="flex items-center gap-2 mb-2 lg:mb-4 shrink-0">
        <div className="p-1.5 lg:p-2 rounded-xl bg-purple-600/20 text-purple-400">
          <Dices size={16} />
        </div>
        <div>
          <h2 className="text-base lg:text-xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.3)] leading-none">
            LOTERÍA
          </h2>
          <p className="text-[8px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Quinielas y Quini 6</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative w-full h-full">

        {/* Quiniela Slides (0 to 4) */}
        {quinielaSlides.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-all duration-700 transform flex flex-col justify-center
              ${currentSlide === idx ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'}
            `}
          >
            <div className={`w-full max-w-4xl mx-auto border border-white/10 rounded-md p-2 lg:p-3 backdrop-blur-sm relative overflow-hidden ${slide.bg} flex flex-col justify-center min-h-0 h-full`}>

              <h3 className={`text-sm lg:text-base font-black ${slide.color} tracking-wider mb-2 text-center border-b border-white/10 pb-1 shrink-0`}>
                {slide.title}
              </h3>

              <div className="grid grid-cols-4 gap-2 lg:gap-4 flex-1 min-h-0 items-center">
                {[
                  { label: 'Nacional', val: slide.data.nacional },
                  { label: 'Provincia', val: slide.data.provincia },
                  { label: 'Córdoba', val: slide.data.cordoba },
                  { label: 'Santa Fe', val: slide.data.santaFe }
                ].map((draw, i) => (
                  <div key={i} className="flex flex-col items-center justify-center bg-[#0a0f1e]/50 p-1.5 lg:p-2 rounded-md border border-white/5 h-full min-h-0">
                    <span className="text-[8px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{draw.label}</span>
                    <span className="text-lg lg:text-xl font-black text-white tracking-tighter leading-none">{draw.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Quini 6 Slide (5) */}
        <div
          className={`absolute inset-0 transition-all duration-700 transform flex flex-col justify-center
            ${currentSlide === 5 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12 pointer-events-none'}
          `}
        >
          <div className="w-full max-w-4xl mx-auto bg-[#0a0f1e] border-2 border-emerald-500/50 rounded-lg p-0 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col min-h-0 h-full overflow-hidden">
            <div className="flex-1 min-h-0 flex flex-col w-full h-full">
              <div className="grid grid-cols-4 w-full h-full bg-white/5">
                {[
                  { label: 'TRADICIONAL', val: data.quini6?.tradicional || ['--', '--', '--', '--', '--', '--'] },
                  { label: 'SEGUNDA', val: data.quini6?.laSegunda || ['--', '--', '--', '--', '--', '--'] },
                  { label: 'REVANCHA', val: data.quini6?.revancha || ['--', '--', '--', '--', '--', '--'] },
                  { label: 'SIEMPRE SALE', val: data.quini6?.siempreSale || ['--', '--', '--', '--', '--', '--'] }
                ].map((draw, i) => (
                  <div key={i} className={`flex flex-col min-h-0 h-full ${i < 3 ? 'border-r border-emerald-600/50' : ''}`}>
                    <div className="bg-emerald-700/80 p-0.5 lg:p-1 flex items-center justify-center border-b border-emerald-600/50 shrink-0 h-8 lg:h-10">
                      <span className="text-[7px] lg:text-[10px] font-bold text-white uppercase text-center leading-tight">
                        QUINI 6<br />{draw.label}
                      </span>
                    </div>
                    <div className="flex-1 min-h-0 flex flex-col justify-evenly p-1 lg:p-2 bg-[#FAF8DE]/10 items-center">
                      <div className="flex gap-1.5 lg:gap-2 w-full justify-center">
                        {draw.val.slice(0, 3).map((num: string, idx: number) => (
                          <span key={`top-${idx}`} className="text-sm lg:text-lg font-black text-emerald-100 tracking-tighter w-4 lg:w-6 text-center">{num}</span>
                        ))}
                      </div>
                      <div className="flex gap-1.5 lg:gap-2 w-full justify-center">
                        {draw.val.slice(3, 6).map((num: string, idx: number) => (
                          <span key={`bot-${idx}`} className="text-sm lg:text-lg font-black text-emerald-100 tracking-tighter w-4 lg:w-6 text-center">{num}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Rotation indicator */}
      <div className="flex gap-2 justify-center mt-2 shrink-0 relative z-10">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-6 lg:w-8 bg-emerald-500' : 'w-2 lg:w-3 bg-white/10'}`} />
        ))}
      </div>
    </div>
  );
};
