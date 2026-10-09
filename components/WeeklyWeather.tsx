'use client';
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cloud, Sun, CloudRain, CloudLightning, CloudFog, Loader2, AlertCircle, CloudSun, Droplet, MapPin, MoreHorizontal } from 'lucide-react';

const getWeatherDetails = (code: number, size = 24) => {
  if (code === 0) return <Sun className="text-[#FFB020]" fill="#FFB020" size={size} />;
  if (code === 1 || code === 2) return <CloudSun className="text-[#FFB020]" fill="#FFB020" size={size} />;
  if (code === 3) return <Cloud className="text-[#D1D5DB]" fill="#D1D5DB" size={size} />;
  if (code === 45 || code === 48) return <CloudFog className="text-[#9CA3AF]" size={size} />;
  if (code >= 51 && code <= 67) return <CloudRain className="text-[#60A5FA]" fill="#60A5FA" size={size} />;
  if (code >= 80 && code <= 82) return <CloudRain className="text-[#60A5FA]" fill="#60A5FA" size={size} />;
  if (code >= 95) return <CloudLightning className="text-[#C084FC]" fill="#C084FC" size={size} />;
  return <Sun className="text-[#FFB020]" fill="#FFB020" size={size} />;
};

const fetchRealWeather = async () => {
  const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-31.464&longitude=-64.359&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunset&hourly=temperature_2m,precipitation_probability,weathercode&current_weather=true&timezone=America/Argentina/Cordoba');
  if (!res.ok) throw new Error('Error fetching weather');
  const data = await res.json();
  
  const days = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'];
  
  const daily = data.daily.time.slice(0, 5).map((timeStr: string, idx: number) => {
    const date = new Date(timeStr + 'T12:00:00');
    return {
      day: days[date.getDay()],
      tempMax: Math.round(data.daily.temperature_2m_max[idx]),
      tempMin: Math.round(data.daily.temperature_2m_min[idx]),
      rainProb: data.daily.precipitation_probability_max[idx],
      code: data.daily.weathercode[idx],
    };
  });

  const nowStr = data.current_weather.time;
  let currentIndex = data.hourly.time.findIndex((t: string) => t === nowStr);
  if (currentIndex === -1) currentIndex = 0;
  const startIndex = currentIndex;
  
  const hourly = data.hourly.time.slice(startIndex, startIndex + 5).map((timeStr: string, idx: number) => {
    const d = new Date(timeStr);
    const h = d.getHours();
    const ampm = h >= 12 ? 'p. m.' : 'a. m.';
    const h12 = h % 12 || 12;
    return {
      time: `${h12} ${ampm}`,
      temp: Math.round(data.hourly.temperature_2m[startIndex + idx]),
      rainProb: data.hourly.precipitation_probability[startIndex + idx],
      code: data.hourly.weathercode[startIndex + idx],
    };
  });

  const todaySunset = data.daily.sunset[0];
  const sunsetTime = new Date(todaySunset).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

  return {
    daily,
    hourly,
    current: {
      temp: Math.round(data.current_weather.temperature),
      sunset: sunsetTime,
      code: data.current_weather.weathercode,
    }
  };
};

export const WeeklyWeather = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['weather-malagueno-widget'],
    queryFn: fetchRealWeather,
    refetchInterval: 1800000,
  });

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#202020] rounded-2xl">
        <Loader2 className="animate-spin text-white mb-4" size={32} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#202020] rounded-2xl text-red-400">
        <AlertCircle size={32} className="mb-2" />
        <p className="text-sm">Error cargando clima</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col p-2 lg:p-3 bg-[#202020] text-white rounded-md font-sans relative overflow-hidden animate-in fade-in duration-500 justify-between">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-1 lg:mb-2 shrink-0">
        <div className="flex items-center gap-1.5 lg:gap-2">
          {getWeatherDetails(data.current.code, 16)}
          <span className="text-xs lg:text-sm font-semibold text-slate-300">MALAGUEÑO</span>
        </div>
        <MoreHorizontal size={16} className="text-white/60" />
      </div>

      {/* Main Current Weather */}
      <div className="flex justify-between items-center mb-1 px-1 lg:px-2 shrink-0">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="drop-shadow-[0_4px_10px_rgba(255,176,32,0.3)] scale-75 lg:scale-[0.85] origin-left">
            {getWeatherDetails(data.current.code, 56)}
          </div>
          <div className="flex items-start">
            <span className="text-3xl lg:text-4xl font-black tracking-tighter">{data.current.temp}</span>
            <span className="text-sm lg:text-base mt-1 text-slate-400 font-bold">°C</span>
          </div>
        </div>
        <div className="text-white/60 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-right">
          Atardecer<br/>
          <span className="text-white text-[10px] lg:text-xs">{data.current.sunset}</span>
        </div>
      </div>



      {/* Daily Forecast */}
      <div className="grid grid-cols-5 gap-1 px-1 flex-1 items-center min-h-0 bg-[#1a1a1a] rounded-xl py-4">
        {data.daily.map((d, idx) => (
          <div key={idx} className="flex flex-col items-center justify-center">
            <span className="text-xs lg:text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{d.day}</span>
            <div className="mb-2 lg:mb-3 scale-110 lg:scale-125">
              {getWeatherDetails(d.code, 24)}
            </div>
            <span className="text-base lg:text-lg font-black text-white mb-0 mt-1">{d.tempMax}°</span>
            <span className="text-sm lg:text-base text-white/40 font-bold mb-1.5">{d.tempMin}°</span>
            <div className="flex items-center gap-1.5 text-[#60A5FA]">
              <Droplet size={14} fill="currentColor" />
              <span className="text-xs lg:text-sm font-bold">{d.rainProb}%</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export const CompactWeather = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['weather-malagueno-widget'],
    queryFn: fetchRealWeather,
    refetchInterval: 1800000,
  });

  if (isLoading || isError || !data) return null;

  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
      {getWeatherDetails(data.current.code, 24)}
      <div className="flex flex-col text-left">
        <span className="text-sm lg:text-base font-black text-white leading-none">{data.current.temp}°C</span>
        <span className="text-[8px] lg:text-[9px] text-slate-400 font-bold tracking-widest uppercase leading-none mt-0.5">Malagueño</span>
      </div>
    </div>
  );
};
