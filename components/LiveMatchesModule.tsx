'use client';
import React, { useState, useEffect } from 'react';
import { Loader2, Activity, CalendarClock, Trophy } from 'lucide-react';

const teams = [
  { name: 'Boca Juniors', short: 'BOC', color: '#1d4ed8' },
  { name: 'River Plate', short: 'RIV', color: '#dc2626' },
  { name: 'Racing Club', short: 'RAC', color: '#60a5fa' },
  { name: 'Independiente', short: 'IND', color: '#b91c1c' },
  { name: 'San Lorenzo', short: 'SLO', color: '#1e3a8a' },
  { name: 'Talleres', short: 'TAL', color: '#002855' },
  { name: 'Belgrano', short: 'BEL', color: '#60a5fa' },
  { name: 'Instituto', short: 'INS', color: '#b91c1c' },
  { name: 'Rosario Central', short: 'CEN', color: '#0284c7' },
  { name: 'Newell\'s', short: 'NOB', color: '#991b1b' },
  { name: 'Estudiantes', short: 'EST', color: '#dc2626' },
  { name: 'Gimnasia', short: 'GELP', color: '#1e40af' },
  { name: 'Vélez', short: 'VEL', color: '#1e3a8a' },
  { name: 'Argentinos', short: 'AAAJ', color: '#dc2626' },
  { name: 'Huracán', short: 'HUR', color: '#dc2626' },
  { name: 'Unión', short: 'UNI', color: '#dc2626' },
];

export const LiveMatchesModule = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await fetch('/api/matches');
        if (res.ok) {
          const data = await res.json();
          // Map string dates back to Date objects
          const realMatches = data.matches.map((m: any) => ({
            ...m,
            matchDate: new Date(m.matchDate)
          }));
          setMatches(realMatches);
        }
      } catch (error) {
        console.error("Failed to fetch matches:", error);
      }
    };

    fetchMatches();
    const pollInterval = setInterval(fetchMatches, 60000); // refresh every minute
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    if (matches.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.ceil(matches.length / 3));
    }, 8000); // Rotates every 8s (shows 3 per page)
    return () => clearInterval(interval);
  }, [matches]);

  if (matches.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  const visibleMatches = matches.slice(currentIndex * 3, currentIndex * 3 + 3);

  return (
    <div className="w-full h-full flex flex-col p-2 lg:p-4 bg-[#202020] text-white rounded-md animate-in fade-in zoom-in duration-700 relative overflow-hidden justify-between">


      {/* Header */}
      <div className="flex items-center gap-3 mb-2 lg:mb-4 shrink-0 relative z-10">
        <h2 className="text-base lg:text-xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.3)] leading-none">
          Partidos de Fútbol
        </h2>
      </div>

      <div className="w-full relative z-10 flex flex-col gap-2 flex-1 min-h-0 justify-start mt-1">
        {visibleMatches.map((match, idx) => {
          const prevMatch = idx > 0 ? visibleMatches[idx - 1] : null;
          const showDateHeader = !prevMatch || prevMatch.matchDate.toDateString() !== match.matchDate.toDateString();
          const showLeagueHeader = showDateHeader || prevMatch.leagueName !== match.leagueName;

          return (
            <div key={match.id} className="flex flex-col gap-1 w-full animate-in slide-in-from-right-10 duration-500 min-h-0" style={{ animationDelay: `${idx * 150}ms` }}>
              
              {/* Modern Dashboard Style Headers */}
              {(showDateHeader || showLeagueHeader) && (
                <div className="w-full flex flex-col gap-1 mt-1 mb-0.5">
                  {showDateHeader && (
                    <div className="flex items-center gap-2 px-1">
                      <CalendarClock size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 font-bold uppercase tracking-widest text-[9px] lg:text-[10px]">
                        {match.matchDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                    </div>
                  )}
                  {showLeagueHeader && (
                    <div className="flex items-center gap-1.5 px-1 mt-0.5">
                      <Trophy size={12} className="text-slate-400" />
                      <span className="text-slate-300 font-black uppercase tracking-widest text-[8px] lg:text-[10px]">
                        {match.leagueName}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="w-full bg-[#0a1120]/80 border border-white/10 rounded-xl py-1.5 lg:py-2 px-3 lg:px-4 backdrop-blur-md shadow-xl flex flex-row items-center justify-between min-h-0">

            {/* LADO IZQUIERDO: Local */}
            <div className="flex-1 flex flex-row items-center justify-start gap-2 lg:gap-3 min-w-0">
              <div className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center shrink-0">
                {match.home.logo ? (
                  <img src={match.home.logo} alt={match.home.name} className="w-full h-full object-contain drop-shadow-md" />
                ) : (
                  <span className="text-[8px] lg:text-xs font-black text-white">{match.home.short}</span>
                )}
              </div>
              <h3 className="text-[10px] lg:text-sm font-semibold text-white truncate">{match.home.name}</h3>
            </div>

            {/* CENTRO: Marcador / Estado */}
            <div className="flex-[0.8] flex flex-col items-center justify-center px-1 lg:px-2 min-w-0 shrink-0">
              {match.status === 'LIVE' && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center gap-1.5 lg:gap-3">
                    <span className="text-base lg:text-lg font-black text-white tracking-tighter drop-shadow-2xl">{match.homeScore}</span>
                    <span className="text-slate-500 font-black">-</span>
                    <span className="text-base lg:text-lg font-black text-white tracking-tighter drop-shadow-2xl">{match.awayScore}</span>
                  </div>
                  <div className="text-red-500 text-[8px] lg:text-[10px] font-black tracking-widest uppercase flex items-center gap-1 animate-pulse mt-0.5">
                    🔴 EN VIVO • {match.liveMinute}&apos;
                  </div>
                </div>
              )}
              {match.status === 'FINISHED' && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center gap-1.5 lg:gap-3">
                    <span className="text-base lg:text-lg font-black text-white tracking-tighter drop-shadow-2xl">{match.homeScore}</span>
                    <span className="text-slate-500 font-black">-</span>
                    <span className="text-base lg:text-lg font-black text-white tracking-tighter drop-shadow-2xl">{match.awayScore}</span>
                  </div>
                  <div className="text-slate-400 text-[8px] lg:text-[10px] font-black tracking-widest uppercase mt-0.5">
                    FINAL
                  </div>
                </div>
              )}
              {match.status === 'SCHEDULED' && (
                <div className="flex flex-col items-center justify-center">
                  <span className="text-emerald-400 font-bold text-sm lg:text-base drop-shadow-sm">
                    {match.matchDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </span>
                </div>
              )}
            </div>

            {/* LADO DERECHO: Visitante */}
            <div className="flex-1 flex flex-row items-center justify-end gap-2 lg:gap-3 min-w-0">
              <h3 className="text-[10px] lg:text-sm font-semibold text-white truncate text-right">{match.away.name}</h3>
              <div className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center shrink-0">
                {match.away.logo ? (
                  <img src={match.away.logo} alt={match.away.name} className="w-full h-full object-contain drop-shadow-md" />
                ) : (
                  <span className="text-[8px] lg:text-xs font-black text-white">{match.away.short}</span>
                )}
              </div>
            </div>
          </div>
          </div>
        );
      })}
      </div>

      {/* Rotation indicator */}
      <div className="flex gap-2 justify-center mt-2 shrink-0 relative z-10">
        {Array.from({ length: Math.ceil(matches.length / 3) }).map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-6 lg:w-8 bg-emerald-500' : 'w-2 lg:w-3 bg-white/10'}`} />
        ))}
      </div>
    </div>
  );
};
