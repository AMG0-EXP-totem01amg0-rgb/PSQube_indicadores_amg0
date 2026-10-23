'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const BackgroundAudio = () => {
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      if (playerRef.current) return;

      try {
        playerRef.current = new window.YT.Player('yt-radio-player', {
          height: '1',
          width: '1',
          videoId: 'k9bMyNGsmhU',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: typeof window !== 'undefined' ? window.location.origin : undefined
          },
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              try {
                event.target.setVolume(50);
              } catch (e) {}
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2 || event.data === 0) {
                setIsPlaying(false);
              }
            },
            onError: (err: any) => {
              console.warn('YouTube radio stream error:', err);
              if (isMounted) setIsPlaying(false);
            }
          }
        });
      } catch (err) {
        console.warn('Failed to initialize YouTube radio player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prevOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevOnReady) prevOnReady();
        initPlayer();
      };

      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    }

    return () => {
      isMounted = false;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch (err) {
      console.warn('Error toggling YouTube radio:', err);
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl text-white transition-all hover:bg-[#0f172a] hover:border-white/20">
      {/* Hidden YouTube audio element */}
      <div 
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none'
        }}
        aria-hidden="true"
      >
        <div id="yt-radio-player" />
      </div>

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
        title={isPlaying ? 'Pausar radio' : 'Reproducir radio'}
      >
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
      </button>
    </div>
  );
};

