import React from 'react';
import { TargetEntity } from '../types';
import { TARGET_CONFIG } from '../constants';

interface TargetProps {
  target: TargetEntity;
  customImage: string | null;
}

export const Target: React.FC<TargetProps> = ({ target, customImage }) => {
  const config = TARGET_CONFIG[target.value];
  
  // We double radiusPx because radius is half width, but we want to render the full circle width
  const size = config.radiusPx * 2;

  // Convert background color class to border color class for the ring when image is present
  const borderColorClass = config.color.replace('bg-', 'border-');

  // If hit, prevent pointer events so it can't be hit again during animation
  // And remove data attributes used for hit detection
  const hitProps = target.isHit ? {} : {
      'data-target-id': target.id,
      'data-target-radius': config.radiusPx,
      'data-target-value': target.value,
  };

  return (
    <div
      {...hitProps}
      className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg flex items-center justify-center transition-transform overflow-visible"
      style={{
        left: `${target.x}%`,
        top: `${target.y}%`,
        width: `${size}px`,
        height: `${size}px`,
        zIndex: target.isHit ? 0 : 10 // Move hit targets to back
      }}
    >
      {/* 
         If custom image exists:
         1. Show image fully opaque.
         2. Show a colored border to indicate points (instead of full bg color).
         
         If no image:
         1. Show standard background color.
         2. Standard white border.
      */}
      <div 
        className={`
            rounded-full w-full h-full flex items-center justify-center relative pointer-events-none overflow-hidden
            ${customImage ? `border-[3px] ${borderColorClass} bg-black/20` : `${config.color} border-2 border-white/80`}
            ${target.isHit ? 'animate-spin-vanish' : ''}
        `}
      >
        {/* Custom Image Logic */}
        {customImage && (
          <img 
            src={customImage} 
            alt="target" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Point Label - Added background for better readability over images */}
        <span className="text-[10px] font-bold text-white absolute -top-5 pointer-events-none drop-shadow-md z-20 bg-black/60 px-1.5 rounded-full backdrop-blur-sm border border-white/10">
          {target.value}
        </span>

        {/* Bullseye Center */}
        <div className={`
            w-[30%] h-[30%] rounded-full z-10
            ${customImage 
                ? 'bg-transparent border border-white/50 shadow-[0_0_2px_black]' // Transparent with guide ring if image
                : 'bg-black/60 shadow-inner' // Standard dark center
            }
        `} />
      </div>
    </div>
  );
};