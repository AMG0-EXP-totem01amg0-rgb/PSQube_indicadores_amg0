'use client';
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Newspaper, Loader2, AlertCircle } from 'lucide-react';

interface NewsItem {
  title: string;
  excerpt: string;
  image: string;
  category: string;
  source?: string;
}

const fetchNews = async (): Promise<NewsItem[]> => {
  // Fetch from two reliable feeds (News and Sports)
  const rssNews = 'https://www.clarin.com/rss/lo-ultimo/';
  const rssSports = 'https://www.ole.com.ar/rss/'; // Sports
  
  try {
    const [resNews, resSports] = await Promise.all([
      fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssNews)}`),
      fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssSports)}`)
    ]);
    
    const dataNews = await resNews.json();
    const dataSports = await resSports.json();
    
    let combined: NewsItem[] = [];

    const parseItems = (items: any[], source: string, category: string) => {
      if (!items) return [];
      return items.slice(0, 10).map((item: any) => {
        let imgUrl = 'https://images.unsplash.com/photo-1541888086225-ee5933d3bb7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
        if (item.enclosure && item.enclosure.link) imgUrl = item.enclosure.link;
        else if (item.thumbnail) imgUrl = item.thumbnail;
        else if (item.content && item.content.includes('<img')) {
          const match = item.content.match(/src="([^"]+)"/);
          if (match) imgUrl = match[1];
        } else if (item.description && item.description.includes('<img')) {
          const match = item.description.match(/src="([^"]+)"/);
          if (match) imgUrl = match[1];
        }

        const cleanExcerpt = item.description.replace(/<[^>]+>/g, '').substring(0, 200) + '...';
        return { title: item.title, excerpt: cleanExcerpt, image: imgUrl, category, source };
      });
    };

    if (dataNews.status === 'ok') combined = [...combined, ...parseItems(dataNews.items, 'Telefe Noticias', 'NOTICIAS LOCALES')];
    if (dataSports.status === 'ok') combined = [...combined, ...parseItems(dataSports.items, 'Cadena 3', 'DEPORTES')];
    
    // Shuffle to mix news and sports
    return combined.sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error("Failed to fetch news:", error);
  }

  return [
    {
      category: 'LOCALES',
      title: 'Nuevas obras de pavimentación en el ingreso a la planta',
      excerpt: 'Se ha completado el 80% de las obras de asfaltado en el acceso principal, mejorando los tiempos de logística de los camiones.',
      image: 'https://images.unsplash.com/photo-1541888086225-ee5933d3bb7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
    }
  ];
};

export const AutoExpandNews = () => {
  const { data: newsQueue, isLoading, isError } = useQuery({
    queryKey: ['newsFeed'],
    queryFn: fetchNews,
    refetchInterval: 300000, 
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!newsQueue || newsQueue.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % newsQueue.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [newsQueue]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="tracking-widest uppercase font-bold text-sm">Cargando Noticias...</p>
      </div>
    );
  }

  if (isError || !newsQueue || newsQueue.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-red-500">
        <AlertCircle size={48} className="mb-4" />
        <p className="tracking-widest uppercase font-bold text-sm">Error cargando feed de noticias</p>
      </div>
    );
  }

  const visibleNews = newsQueue.slice(currentIndex, currentIndex + 1);

  return (
    <div className="w-full h-full flex flex-col p-2 lg:p-4 animate-in fade-in zoom-in duration-700 bg-[#202020] text-white rounded-md relative overflow-hidden justify-between">
      
      {/* Banner / Category Title */}
      <div className="flex items-center justify-between w-full mb-2 lg:mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 lg:p-3 rounded-2xl bg-blue-600/20 text-blue-400">
            <Newspaper size={20} className="lg:w-6 lg:h-6" />
          </div>
          <h2 className="text-base lg:text-xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_15px_rgba(96,165,250,0.3)] leading-none">
            NOTICIAS
          </h2>
        </div>
        <p className="text-[8px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] text-right">
          Últimas 24 horas
        </p>
      </div>

      {/* Single Card */}
      <div className="flex-1 min-h-0 flex flex-col w-full relative">
        {visibleNews.map((news: any, idx: number) => (
          <div key={idx} className="flex-1 bg-[#0f172a]/90 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-row relative animate-in fade-in duration-500">
            
            {/* Text Section (Left) */}
            <div className="flex-1 p-4 lg:p-6 flex flex-col justify-center min-w-0">
              {/* Source Badge */}
              <div className="flex items-center gap-1.5 mb-3">
                <div className={`w-2 h-2 rounded-full ${news.category === 'DEPORTES' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-emerald-400">
                  {news.source || 'Portal'}
                </span>
              </div>
              
              <h3 className="text-lg lg:text-2xl font-bold text-white leading-snug mb-3 tracking-tight">
                {news.title}
              </h3>
              <p className="text-xs lg:text-sm text-slate-400 line-clamp-5 leading-relaxed font-medium pr-2">
                {news.excerpt}
              </p>
            </div>

            {/* Image Section (Right) */}
            <div className="w-[40%] lg:w-[45%] h-full relative shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={news.image} 
                alt={news.title}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541888086225-ee5933d3bb7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/90 via-[#0f172a]/20 to-transparent" />
            </div>
            
          </div>
        ))}
      </div>

      {/* Progress indicators */}
      <div className="flex gap-2 justify-center mt-2 lg:mt-4 shrink-0">
        {Array.from({ length: Math.min(newsQueue.length, 10) }).map((_, idx) => (
          <div 
            key={idx} 
            className={`h-1.5 lg:h-2 rounded-full transition-all duration-500 ${idx === currentIndex ? 'w-8 lg:w-10 bg-blue-500' : 'w-3 lg:w-4 bg-white/20'}`}
          />
        ))}
      </div>
    </div>
  );
};
