'use client';
import React, { useState, useEffect } from 'react';

export const FlipSlot = ({ children, interval = 30000 }: { children: React.ReactNode[], interval?: number }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [frontIndex, setFrontIndex] = useState(0);
  const [backIndex, setBackIndex] = useState(children.length > 1 ? 1 : 0);

  useEffect(() => {
    if (children.length <= 1) return;
    const timer = setInterval(() => {
      setIsFlipped(prev => !prev);
    }, interval);
    return () => clearInterval(timer);
  }, [children.length, interval]);

  useEffect(() => {
    if (children.length <= 1) return;
    const timer = setTimeout(() => {
      if (isFlipped) {
        setFrontIndex((backIndex + 1) % children.length);
      } else {
        setBackIndex((frontIndex + 1) % children.length);
      }
    }, 1000); // Update the hidden face right after the 1.2s flip animation
    return () => clearTimeout(timer);
  }, [isFlipped, children.length, backIndex, frontIndex]);

  if (children.length === 0) return null;
  if (children.length === 1) return <div className="w-full h-full">{children[0]}</div>;

  return (
    <div style={{ perspective: '2000px' }} className="w-full h-full">
      <div 
        style={{ 
          transformStyle: 'preserve-3d', 
          transform: isFlipped ? 'rotateX(-180deg)' : 'rotateX(0deg)',
          transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }} 
        className="w-full h-full relative"
      >
        <div style={{ backfaceVisibility: 'hidden' }} className="absolute inset-0 bg-[#0a1120] rounded-[2rem] overflow-hidden shadow-2xl">
          {children[frontIndex]}
        </div>
        <div style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }} className="absolute inset-0 bg-[#0a1120] rounded-[2rem] overflow-hidden shadow-2xl">
          {children[backIndex]}
        </div>
      </div>
    </div>
  );
};
