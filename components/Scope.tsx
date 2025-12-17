import React from 'react';
import { Point } from '../types';

interface ScopeProps {
  position: Point | null;
}

export const Scope: React.FC<ScopeProps> = ({ position }) => {
  if (!position) return null;

  return (
    <div
      className="fixed pointer-events-none z-50 mix-blend-normal"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* 
        Scope Logic:
        1. Large vignette outside (simulates tube) - REDUCED DARKNESS (black/40)
        2. Clean inner circle
        3. Realistic Mil-Dot Crosshair
      */}

      {/* 1. Outer Vignette / Tube - Lighter now */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vmax] h-[120vmax] rounded-full border-[60vmax] border-black/40"></div>

      {/* 2. Lens Container */}
      <div className="relative w-80 h-80 rounded-full border-[4px] border-black/80 bg-transparent shadow-[inset_0_0_20px_rgba(0,0,0,0.2)] overflow-hidden flex items-center justify-center">
        
        {/* Lighter Glass tint (almost invisible) */}
        <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>

        {/* --- Crosshair Lines (Thick Outer) --- */}
        {/* Left */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[35%] h-1 bg-black/80"></div>
        {/* Right */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[35%] h-1 bg-black/80"></div>
        {/* Top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[35%] w-1 bg-black/80"></div>
        {/* Bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[35%] w-1 bg-black/80"></div>

        {/* --- Crosshair Lines (Thin Inner) --- */}
        <div className="absolute w-full h-[1px] bg-black/80"></div>
        <div className="absolute h-full w-[1px] bg-black/80"></div>

        {/* --- Mil-Dots --- */}
        <div className="absolute flex gap-4 opacity-60">
            <div className="w-1 h-1 bg-black rounded-full"></div>
            <div className="w-1 h-1 bg-black rounded-full"></div>
            <div className="w-1 h-1 bg-black rounded-full"></div>
        </div>
        <div className="absolute flex flex-col gap-4 opacity-60">
            <div className="w-1 h-1 bg-black rounded-full"></div>
            <div className="w-1 h-1 bg-black rounded-full"></div>
            <div className="w-1 h-1 bg-black rounded-full"></div>
        </div>

        {/* Rangefinder curved lines (aesthetic) */}
        <div className="absolute bottom-10 left-10 w-12 h-12 border-l border-b border-black/30 rounded-bl-full"></div>
        <div className="absolute bottom-10 right-10 w-12 h-12 border-r border-b border-black/30 rounded-br-full"></div>

        {/* Center Red Dot (optional for ease of use) */}
        <div className="w-1.5 h-1.5 bg-red-600 rounded-full z-10 shadow-[0_0_4px_red] animate-pulse"></div>
      </div>
    </div>
  );
};