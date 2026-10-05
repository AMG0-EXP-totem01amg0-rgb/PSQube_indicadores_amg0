'use client';
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProductionStats } from '../services/sheetService';
import { RotatingMetrics } from './RotatingMetrics';
import { WeeklyWeather } from './WeeklyWeather';
import { AutoExpandNews } from './AutoExpandNews';
import { LotteryModule } from './LotteryModule';
import { LiveMatchesModule } from './LiveMatchesModule';
import { FlipSlot } from './FlipSlot';
import { BackgroundAudio } from './BackgroundAudio';
import { LayoutDashboard, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const isMachineMatch = (id1: string, id2: string) => {
  if (!id1 || !id2) return false;
  const s1 = String(id1).replace(/\s/g, '').toUpperCase();
  const s2 = String(id2).replace(/\s/g, '').toUpperCase();
  if (s1.includes(s2) || s2.includes(s1)) return true;
  const a1 = s1.replace(/[^A-Z0-9]/g, '');
  const a2 = s2.replace(/[^A-Z0-9]/g, '');
  if (!a1 || !a2) return false;
  return a1.includes(a2) || a2.includes(a1);
};

const HalfGauge = ({ value, color, label, subtext, max = 100 }: { value: number, color: string, label: string, subtext: string, max?: number }) => {
  const radius = 35;
  const stroke = 8;
  const normalizedValue = Math.min(max, Math.max(0, value));
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - (normalizedValue / max) * circumference;

  return (
    <div className="flex flex-col items-center relative">
      <svg width="90" height="45" viewBox="0 0 90 45" className="overflow-visible">
        <path d="M 10 45 A 35 35 0 0 1 80 45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} strokeLinecap="round" />
        <path d="M 10 45 A 35 35 0 0 1 80 45" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="text-center absolute bottom-0">
        <p className="text-white font-black text-sm">{subtext}</p>
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );
};

interface KioskContainerProps {
  onBack?: () => void;
}

export const KioskContainer: React.FC<KioskContainerProps> = ({ onBack }) => {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Top Bar Data
  const [dateRange] = useState(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return { start: d, end: new Date() };
  });

  const { data: prodData } = useQuery({
    queryKey: ['production', dateRange.start.toISOString()],
    queryFn: () => fetchProductionStats(dateRange.start, dateRange.start),
    refetchInterval: 300000,
  });

  const { data: downtimeResult } = useQuery({
    queryKey: ['downtimes', dateRange.start.toISOString()],
    // We import fetchDowntimes inline since we didn't add it to imports earlier
    queryFn: async () => {
      const { fetchDowntimes } = await import('../services/sheetService');
      return fetchDowntimes(dateRange.start, dateRange.start);
    },
    refetchInterval: 300000,
  });

  // Calculate metrics per machine matching exactly the HOME (SummaryView) logic
  const machineData = React.useMemo(() => {
    const stats: Record<string, { tn: number, availSum: number, perfSum: number, count: number, machineId: string, machineName: string, shiftMaxes: Record<string, number> }> = {
      'MG.672-PZ1': { tn: 0, availSum: 0, perfSum: 0, count: 0, machineId: 'MG.672-PZ1', machineName: 'MG.672-PZ1', shiftMaxes: {} },
      'MG.673-PZ1': { tn: 0, availSum: 0, perfSum: 0, count: 0, machineId: 'MG.673-PZ1', machineName: 'MG.673-PZ1', shiftMaxes: {} },
      'MG.674-PZ1': { tn: 0, availSum: 0, perfSum: 0, count: 0, machineId: 'MG.674-PZ1', machineName: 'MG.674-PZ1', shiftMaxes: {} }
    };

    if (prodData?.details) {
      prodData.details.forEach(d => {
        let key = Object.keys(stats).find(k => isMachineMatch(d.machineId, k) || isMachineMatch(d.machineName, k));
        if (!key) {
          stats[d.machineId] = { tn: 0, availSum: 0, perfSum: 0, count: 0, machineId: d.machineId, machineName: d.machineName, shiftMaxes: {} };
          key = d.machineId;
        }
        
        stats[key].tn += ((d as any).actualTons || (d as any).valueTn || 0);
        
        const hs = d.hsMarcha || 0;
        stats[key].availSum += (d.availability || 0) * hs;
        stats[key].perfSum += (d.performance || 0) * hs;
        
        const shiftDateKey = `${d.shift}|${d.date || 'today'}`;
        if (!stats[key].shiftMaxes[shiftDateKey]) {
            stats[key].shiftMaxes[shiftDateKey] = 0;
        }
        stats[key].shiftMaxes[shiftDateKey] = Math.max(stats[key].shiftMaxes[shiftDateKey], hs);

        stats[key].count += 1;
      });
    }

    return Object.entries(stats).map(([id, s]) => {
      let hsMarchaTotal = 0;
      Object.values(s.shiftMaxes).forEach(val => { hsMarchaTotal += val; });

      let finalAvail = 1.0;
      let finalPerf = 1.0;

      if (s.tn === 0) {
        finalPerf = 0.0;

        const machineDowntimes = downtimeResult 
          ? downtimeResult.filter(d => 
              isMachineMatch(d.machineId, id) || 
              isMachineMatch(d.machineId, s.machineName)
            )
          : [];

        const internalParos = machineDowntimes.filter(p => String(p.downtimeType || '').toLowerCase().includes('interno'));
        const internalMinutes = internalParos.reduce((sum, p) => sum + (p.durationMinutes || 0), 0);
        const externalParos = machineDowntimes.filter(p => String(p.downtimeType || '').toLowerCase().includes('externo'));
        const externalMinutes = externalParos.reduce((sum, p) => sum + (p.durationMinutes || 0), 0);

        const totalPeriodMinutes = (s.count > 0 ? s.count : 1) * 480;

        if (machineDowntimes.length === 0) {
          finalAvail = 1.0;
        } else if (externalMinutes >= totalPeriodMinutes) {
          finalAvail = 1.0;
        } else if (internalMinutes > 0) {
          finalAvail = Math.max(0, (totalPeriodMinutes - internalMinutes) / totalPeriodMinutes);
        } else {
          finalAvail = 1.0;
        }
      } else {
        finalAvail = hsMarchaTotal > 0 ? s.availSum / hsMarchaTotal : 1.0;
        finalPerf = hsMarchaTotal > 0 ? s.perfSum / hsMarchaTotal : 1.0;
      }

      return {
        name: s.machineName,
        availability: Math.round(finalAvail * 100),
        performance: Math.round(finalPerf * 100),
        tons: Math.floor(s.tn),
        hours: parseFloat(hsMarchaTotal.toFixed(1))
      };
    }).filter(m => m.name.includes('672') || m.name.includes('673') || m.name.includes('674'));
  }, [prodData, downtimeResult]);

  const [scale, setScale] = useState(1);
  const targetWidth = 1920;
  const targetHeight = 1080;

  useEffect(() => {
    const calculateScale = () => {
      const scaleX = window.innerWidth / targetWidth;
      const scaleY = window.innerHeight / targetHeight;
      setScale(Math.min(scaleX, scaleY));
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const formattedDate = currentTime.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

  const handleBack = () => {
    if (onBack) onBack();
    else router.push('/');
  };

  return (
    <div className="fixed inset-0 w-full h-screen bg-[#050B14] overflow-hidden flex items-center justify-center z-[100]">
      <div 
        className="flex flex-col bg-[#050B14] text-white font-sans shrink-0 origin-center relative"
        style={{ 
          width: `${targetWidth}px`, 
          height: `${targetHeight}px`,
          transform: `scale(${scale})`
        }}
      >
      {/* TOP HEADER */}
      <div className="shrink-0 flex flex-col z-10 px-4 py-2 border-b border-white/10 bg-[#0a1b33]">
        {/* Superior Row: Title & Date & Radio */}
        <div className="flex justify-between items-center mb-2 mt-1">
          {/* Left: Title */}
          <div className="flex items-center gap-3 flex-1">
            <button onClick={handleBack} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-2.5 py-1 text-slate-300 text-[10px] font-bold uppercase tracking-wider transition-colors">
              <ArrowLeft size={12} /> Volver
            </button>
            <div className="p-1.5 bg-blue-600 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <LayoutDashboard size={14} className="text-white" />
            </div>
            <h1 className="text-sm lg:text-base font-black tracking-tighter text-white uppercase leading-none">
              MONITOR DE PRODUCTIVIDAD
            </h1>
          </div>
          
          {/* Center: Clock & Date */}
          <div className="text-center flex-1">
            <h2 className="text-2xl lg:text-3xl font-black tracking-tighter leading-none">{formattedTime}</h2>
            <p className="text-[8px] lg:text-[9px] text-blue-400 font-bold tracking-[0.2em] mt-0.5">{formattedDate}</p>
          </div>
          
          {/* Right: Radio Pill */}
          <div className="flex justify-end flex-1">
            <BackgroundAudio />
          </div>
        </div>

        {/* Inferior Row: 3 Machine Cards */}
        <div className="grid grid-cols-3 gap-4 mb-2">
          {machineData.map(m => (
            <div key={m.name} className="bg-[#0f172a]/80 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-2xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Paletizadora</p>
                  <h3 className="text-xl font-black text-white leading-none mt-1">{m.name.split('-')[0]}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Total Hoy</p>
                  <p className="text-3xl font-black text-emerald-400 leading-none mt-1">{m.tons}<span className="text-sm text-emerald-400/50">TN</span></p>
                </div>
              </div>
              <div className="flex justify-around items-end px-2">
                <HalfGauge value={m.availability} color="#3b82f6" label="DISP." subtext={`${m.availability}%`} />
                <HalfGauge value={m.performance} color="#10b981" label="REND." subtext={`${m.performance}%`} />
                <HalfGauge value={m.hours} max={24} color="#f59e0b" label="HS MARCHA" subtext={`${m.hours}h`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MIDDLE ROW: OPERATIONAL CARDS */}
      <div className="flex-[2] min-h-0 flex items-center justify-center py-4 relative z-20">
        <RotatingMetrics />
      </div>

      {/* BOTTOM ROW: INFORMATIVE GRID WITH FLIP CARDS */}
      <div className="w-full flex-[3] min-h-0 relative pb-4 px-6 grid grid-cols-2 gap-4 z-10 mx-auto">
        
        {/* Left Column (50%): News & Sports */}
        <div className="col-span-1 h-full min-h-0">
          <FlipSlot interval={120000}>
            <AutoExpandNews />
            <LiveMatchesModule />
          </FlipSlot>
        </div>

        {/* Right Column (50%): Weather & Lottery */}
        <div className="col-span-1 h-full min-h-0">
          <FlipSlot interval={60000}>
            <WeeklyWeather />
            <LotteryModule />
          </FlipSlot>
        </div>

      </div>
    </div>
    </div>
  );
};
