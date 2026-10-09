'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProductionStats, fetchDowntimes, fetchStocks, fetchTopRecords, fetchRankings } from '../services/sheetService';
import { Package, AlertCircle, Activity, Trophy, Calendar, Users, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

export const RotatingMetrics = () => {
  const [dateRange] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return { start: d, end: new Date() };
  });

  const [monthRange] = useState(() => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    return { start, end: new Date() };
  });

  // State for animations
  const [hybridSide, setHybridSide] = useState<'A' | 'B'>('A');
  const [recordIdx, setRecordIdx] = useState(0);
  const [paroIdx, setParoIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHybridSide(prev => prev === 'A' ? 'B' : 'A');
    }, 15000); // Gira la tarjeta cada 15 segundos
    return () => clearInterval(timer);
  }, []);

  const [orderedParos, setOrderedParos] = useState<any[]>([]);
  const [orderedRecords, setOrderedRecords] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setOrderedParos(prev => {
        if (prev.length <= 1) return prev;
        const next = [...prev];
        const first = next.shift();
        next.push(first!);
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (hybridSide === 'A') {
        setOrderedRecords(prev => {
          if (prev.length <= 1) return prev;
          const next = [...prev];
          const first = next.shift();
          next.push(first!);
          return next;
        });
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [hybridSide]);


  const { data: prodData } = useQuery({
    queryKey: ['production', dateRange.start.toISOString()],
    queryFn: () => fetchProductionStats(dateRange.start, dateRange.start),
    refetchInterval: 300000,
  });

  const { data: downData } = useQuery({
    queryKey: ['downtimes', dateRange.start.toISOString()],
    queryFn: () => fetchDowntimes(dateRange.start, dateRange.start),
    refetchInterval: 300000,
  });

  const { data: stockData } = useQuery({
    queryKey: ['stocks', dateRange.start.toISOString()],
    queryFn: () => fetchStocks(dateRange.start, dateRange.start),
    refetchInterval: 300000,
  });

  const { data: topRecords } = useQuery({
    queryKey: ['monitor-top-records', monthRange.start.toISOString(), monthRange.end.toISOString()],
    queryFn: () => fetchTopRecords(20, monthRange.start, monthRange.end),
    refetchInterval: 300000,
  });

  const { data: rankingData } = useQuery({
    queryKey: ['rankings', monthRange.start.toISOString()],
    queryFn: () => fetchRankings(monthRange.start, monthRange.end),
    refetchInterval: 300000,
  });

  const historicalRecords = useMemo(() => {
    const machines = ['MG.672-PZ1', 'MG.673-PZ1', 'MG.674-PZ1'];
    const safeRecords = topRecords || [];
    return machines.map(machineId => {
      const machineRecords = safeRecords.filter((r: any) => isMachineMatch(r.machineId, machineId) || isMachineMatch(r.machineName, machineId));
      const record = machineRecords.length > 0
        ? [...machineRecords].sort((a: any, b: any) => b.valueTn - a.valueTn)[0]
        : null;
      return { machineId, record };
    });
  }, [topRecords]);

  // Sync orderedRecords with data updates without jumping
  useEffect(() => {
    if (orderedRecords.length === 0 && historicalRecords.length > 0) {
      setOrderedRecords(historicalRecords);
    } else if (historicalRecords.length > 0) {
      setOrderedRecords(prev => {
        const next = prev.map(p => {
          const updated = historicalRecords.find(b => b.machineId === p.machineId);
          return updated || p;
        });
        // Only update if references actually changed to avoid unnecessary renders
        const isDifferent = next.some((item, i) => item !== prev[i]);
        return isDifferent ? next : prev;
      });
    }
  }, [historicalRecords]);

  const topMaquinistas = useMemo(() => {
    if (!rankingData?.productionRankings?.byOperator) return [];
    return rankingData.productionRankings.byOperator.slice(0, 4);
  }, [rankingData]);

  const internalDownData = useMemo(() => {
    return downData ? downData.filter((d: any) => d.downtimeType === 'Interno') : [];
  }, [downData]);

  const producedStock = useMemo(() => {
    if (!stockData?.items) return [];
    const order = ["CPF 40", "CPC 40", "CPC 30", "MAESTRO", "RAPIDO"];
    return stockData.items
      .filter((i: any) => {
        const name = i.product.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return order.some(o => name.includes(o));
      })
      .sort((a: any, b: any) => {
        const nameA = a.product.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const nameB = b.product.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const indexA = order.findIndex(o => nameA.includes(o));
        const indexB = order.findIndex(o => nameB.includes(o));
        return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
      });
  }, [stockData]);

  const totalStockTons = useMemo(() => {
    return producedStock.reduce((acc, curr) => acc + (curr.tonnage || 0), 0);
  }, [producedStock]);

  const totalProduction = useMemo(() => {
    if (!prodData?.details) return 0;
    const machines = ['MG.672-PZ1', 'MG.673-PZ1', 'MG.674-PZ1'];
    return prodData.details.reduce((sum: number, curr: any) => {
      const isTarget = machines.some(m => isMachineMatch(curr.machineName, m) || isMachineMatch(curr.machineId, m));
      if (isTarget) {
        return sum + (curr.actualTons || curr.valueTn || 0);
      }
      return sum;
    }, 0);
  }, [prodData]);

  const parosBreakdown = useMemo(() => {
    const machines = ['MG.672-PZ1', 'MG.673-PZ1', 'MG.674-PZ1'];
    return machines.map(m => {
      const machineDowns = internalDownData.filter((d: any) => d.machineId === m);
      const totalMachineMins = machineDowns.reduce((acc: number, curr: any) => acc + curr.durationMinutes, 0);

      const causes: Record<string, number> = {};
      machineDowns.forEach((d: any) => {
        const cause = d.reason || d.sapCause || d.downtimeType || 'Desconocido';
        causes[cause] = (causes[cause] || 0) + d.durationMinutes;
      });
      let topCause = '---';
      let maxMins = 0;
      Object.entries(causes).forEach(([c, dur]) => {
        if (dur > maxMins) {
          maxMins = dur;
          topCause = c;
        }
      });

      return { name: m.split('-')[0], mins: maxMins, cause: topCause, totalMachineMins };
    });
  }, [internalDownData]);

  // Sync orderedParos with data updates without jumping
  useEffect(() => {
    if (orderedParos.length === 0 && parosBreakdown.length > 0) {
      setOrderedParos(parosBreakdown);
    } else if (parosBreakdown.length > 0) {
      // Update existing items in order while preserving the current rotation
      setOrderedParos(prev => {
        const next = prev.map(p => {
          const updated = parosBreakdown.find(b => b.name === p.name);
          return updated || p;
        });
        const isDifferent = next.some((item, i) => item !== prev[i]);
        return isDifferent ? next : prev;
      });
    }
  }, [parosBreakdown]);

  const totalDowntime = parosBreakdown.reduce((acc, m) => acc + m.totalMachineMins, 0);


  return (
    <div className="w-full h-full min-h-[160px] px-4 animate-in fade-in duration-700 max-w-[120rem] mx-auto">
      <div className="grid grid-cols-4 gap-4 h-full">

        {/* 1. PRODUCCIÓN ULTRA COMPACTA */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900/80 to-sky-900/30 backdrop-blur-md shadow-2xl border border-blue-500/20 flex flex-col justify-center items-center p-3 lg:p-4">
          <div className="absolute top-2 left-2 opacity-20">
            <Activity size={40} className="text-emerald-400" />
          </div>
          <h3 className="text-xs lg:text-sm font-black text-emerald-400/80 tracking-widest uppercase mb-1">Producción total del día</h3>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-lg flex items-baseline gap-2">
            {totalProduction > 0 ? Math.floor(totalProduction).toLocaleString('es-AR') : '---'}
            <span className="text-lg lg:text-xl font-bold text-emerald-400">TN</span>
          </h2>
        </div>

        {/* 2. TARJETA HÍBRIDA: RÉCORDS Y RANKING OPERATIVO (Gira completa) */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 [perspective:1000px]">
          <div className={`w-full h-full relative transition-all duration-1000 [transform-style:preserve-3d] ${hybridSide === 'B' ? '[transform:rotateY(180deg)]' : ''}`}>
            
            {/* SIDE A: RÉCORDS DEL MES */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-sky-900/30 backdrop-blur-md [backface-visibility:hidden] flex flex-col p-3 lg:p-4">
              <div className="flex items-center gap-2 mb-2 shrink-0">
                <Trophy size={16} className="text-amber-400" />
                <h3 className="text-[10px] lg:text-xs font-black text-amber-400 tracking-widest uppercase">Récords del mes</h3>
              </div>
              <div className="flex-1 relative overflow-hidden mt-1" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)' }}>
                <div className="w-full h-full flex flex-col gap-2 relative">
                  <AnimatePresence mode="popLayout">
                    {orderedRecords.map((m, index) => {
                      const isActive = index === 0;
                      return (
                        <motion.div
                          layout
                          key={m.machineId}
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -50 }}
                          transition={{ type: "tween", duration: 0.7, ease: "easeInOut" }}
                          className="w-full shrink-0"
                        >
                          <motion.div
                            animate={{ 
                              opacity: isActive ? 1 : index === 1 ? 0.5 : 0.2, 
                              scale: isActive ? 1 : 0.85 
                            }}
                            transition={{ type: "tween", duration: 0.7, ease: "easeInOut" }}
                            className={`flex flex-col border rounded-lg p-2.5 transform origin-left ${isActive ? 'bg-amber-500/20 border-amber-500/40 shadow-lg shadow-amber-500/10' : 'bg-amber-500/5 border-amber-500/10'}`}
                            style={{ height: '76px' }}
                          >
                            <div className="flex justify-between items-center mb-1 shrink-0">
                              <span className="text-xs font-black text-amber-400">{m.machineId.split('-')[0]}</span>
                              <span className={`transition-all duration-700 font-bold ${isActive ? 'text-xs lg:text-sm text-amber-200' : 'text-[10px] text-amber-200/50'}`}>
                                {m.record?.date ? new Date(m.record.date).toLocaleDateString('es-AR') : '---'}
                              </span>
                            </div>
                            <div className="text-2xl font-black text-white leading-none">
                              {m.record?.valueTn ? Math.floor(m.record.valueTn).toLocaleString('es-AR') : '---'} <span className="text-sm text-amber-400">TN</span>
                            </div>
                          </motion.div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* SIDE B: RANKING OPERATIVO */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-sky-900/30 backdrop-blur-md [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col p-3 lg:p-4">
              <div className="flex items-center gap-2 mb-2 shrink-0">
                <Users size={16} className="text-indigo-400" />
                <h3 className="text-[10px] lg:text-xs font-black text-indigo-400 tracking-widest uppercase">Top 4 Maquinistas</h3>
              </div>
              <div className="flex-1 flex flex-col justify-around">
                {topMaquinistas.length > 0 ? (
                  topMaquinistas.map((maq, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs lg:text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`font-black w-4 text-center ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'}`}>{idx + 1}</span>
                        <span className="font-semibold text-white truncate max-w-[100px]">{maq.name.split(' ')[0]}</span>
                      </div>
                      <div className="font-black text-indigo-300">{Math.floor(maq.value).toLocaleString('es-AR')} <span className="text-[8px] text-indigo-400/50">TN</span></div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 text-center mt-4">Sin datos del mes</div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* 3. TARJETA PAROS DEL DÍA (Rotación Interna) */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900/80 to-sky-900/30 backdrop-blur-md shadow-2xl border border-blue-500/20 flex flex-col p-3 lg:p-4">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-400" />
              <h3 className="text-[10px] lg:text-xs font-black text-red-400 tracking-widest uppercase">Paros del Día</h3>
            </div>
            <div className="text-[10px] font-bold text-red-300">
              Total: {totalDowntime} MIN
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden mt-1" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 75%, transparent 100%)' }}>
            <div className="w-full h-full flex flex-col gap-2 relative">
              <AnimatePresence mode="popLayout">
                {orderedParos.map((m, index) => {
                  const isActive = index === 0;
                  return (
                    <motion.div
                      layout
                      key={m.name}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -50 }}
                      transition={{ type: "tween", duration: 0.7, ease: "easeInOut" }}
                      className="w-full shrink-0"
                    >
                      <motion.div
                        animate={{ 
                          opacity: isActive ? 1 : index === 1 ? 0.5 : 0.2, 
                          scale: isActive ? 1 : 0.85 
                        }}
                        transition={{ type: "tween", duration: 0.7, ease: "easeInOut" }}
                        className={`flex flex-col border rounded-lg p-2.5 transform origin-left ${isActive ? 'bg-red-500/20 border-red-500/40 shadow-lg shadow-red-500/10' : 'bg-red-500/5 border-red-500/10'}`}
                        style={{ height: '96px' }}
                      >
                        <div className="flex justify-between items-center mb-1 shrink-0">
                          <span className="text-xs lg:text-sm font-black text-red-400">{m.name}</span>
                          <span className="text-lg lg:text-xl font-black text-white leading-none">{m.mins} <span className="text-[10px] text-red-400">MIN</span></span>
                        </div>
                        <div className="w-full text-[11px] lg:text-xs text-slate-200 font-bold bg-black/20 rounded px-1.5 py-1 line-clamp-2 leading-tight">
                          {m.cause}
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* 4. STOCK */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-900/80 to-sky-900/30 backdrop-blur-md shadow-2xl border border-blue-500/20 flex flex-col p-3 lg:p-4">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <Package size={16} className="text-purple-400" />
            <h3 className="text-[10px] lg:text-xs font-black text-purple-400 tracking-widest uppercase">Stock de las 00:00 hs</h3>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-2">
            {producedStock.slice(0, 4).map((item: any, idx) => (
              <div key={idx} className="bg-[#0a1120]/50 rounded-lg border border-white/5 p-1.5 flex flex-col justify-center items-center">
                <span className="text-[10px] lg:text-xs text-purple-400 font-black uppercase tracking-widest mb-0.5 truncate w-full text-center">
                  {item.product.replace('CEMENTO ', '')}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl lg:text-2xl font-black text-white tracking-tighter">
                    {Math.floor(item.tonnage).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 pt-2 border-t border-white/10 shrink-0 flex justify-between items-center">
            <span className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest">Total</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl lg:text-2xl font-black text-white tracking-tighter">{Math.floor(totalStockTons).toLocaleString('es-AR')}</span>
              <span className="text-[10px] font-bold text-slate-500">TN</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
