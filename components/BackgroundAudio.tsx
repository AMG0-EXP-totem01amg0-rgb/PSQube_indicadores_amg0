'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

export const BackgroundAudio = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.4;
      // El autoplay se bloquea por defecto en los navegadores modernos,
      // por lo que iniciamos pausado para que el estado sea consistente.
    }
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl text-white transition-all hover:bg-[#0f172a] hover:border-white/20">
      <audio 
        ref={audioRef} 
        src="https://playerservices.streamtheworld.com/api/livestream-redirect/LAPOPUAAC.aac" 
        preload="none" 
        loop 
      />

      {/* Logo */}
      <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="/popu.png" 
          alt="La Popu" 
          className="w-full h-full object-cover scale-110"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Info & EQ */}
      <div className="flex flex-col pr-1 w-[100px]">
        <h4 className="font-black text-[11px] tracking-tight text-white whitespace-nowrap">FM Popular 92.3</h4>
        
        {/* Animated Equalizer */}
        <div className="flex items-end gap-[3px] h-[10px] mt-0.5">
          {isPlaying ? (
            <>
              <div className="w-[3px] bg-emerald-400 rounded-t-sm animate-[pulse_0.7s_ease-in-out_infinite]" style={{ height: '60%' }}></div>
              <div className="w-[3px] bg-emerald-400 rounded-t-sm animate-[pulse_1.1s_ease-in-out_infinite]" style={{ height: '100%' }}></div>
              <div className="w-[3px] bg-emerald-400 rounded-t-sm animate-[pulse_0.8s_ease-in-out_infinite]" style={{ height: '40%' }}></div>
              <div className="w-[3px] bg-emerald-400 rounded-t-sm animate-[pulse_1.2s_ease-in-out_infinite]" style={{ height: '80%' }}></div>
            </>
          ) : (
             <>
              <div className="w-[3px] h-[3px] bg-slate-600 rounded-full"></div>
              <div className="w-[3px] h-[3px] bg-slate-600 rounded-full"></div>
              <div className="w-[3px] h-[3px] bg-slate-600 rounded-full"></div>
              <div className="w-[3px] h-[3px] bg-slate-600 rounded-full"></div>
             </>
          )}
        </div>
      </div>

      {/* Control */}
      <button 
        onClick={togglePlay}
        className="w-8 h-8 bg-white text-slate-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
      >
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
      </button>
    </div>
  );
};
