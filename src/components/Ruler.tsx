import React, { useEffect, useRef, useState } from 'react';

interface RulerProps {
  orientation: 'horizontal' | 'vertical';
  zoom: number;
  scrollOffset: number; // The scroll position of the container
  pageMargin: number; // Optional visual guide for page margin
  pageWidth: number; // Total width for margin/bleed lines
}

export const Ruler: React.FC<RulerProps> = ({ orientation, zoom, scrollOffset, pageMargin }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const parent = canvasRef.current?.parentElement;
    if (!parent) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === parent) {
          setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
        }
      }
    });

    observer.observe(parent);
    
    // Initial size
    setSize({ width: parent.clientWidth, height: parent.clientHeight });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support pixel density
    const dpr = window.devicePixelRatio || 1;
    // We draw relative to physical pixels, then scale down using CSS
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size.width, size.height);

    ctx.strokeStyle = '#cbd5e1'; // tailwind border
    ctx.fillStyle = '#64748b'; // tailwind muted-foreground
    ctx.font = '10px Inter, sans-serif';
    ctx.textBaseline = 'top';

    const isHorizontal = orientation === 'horizontal';
    const length = isHorizontal ? size.width : size.height;

    const NICE_INTERVALS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
    
    // Find the smallest interval where the spacing on screen is at least 60px
    const minScreenSpacing = 60;
    
    let majorInterval = NICE_INTERVALS.find(v => v * zoom >= minScreenSpacing);
    if (!majorInterval) majorInterval = 100;
    
    // Determine minor ticks per major interval. Typically 10.
    let minorTicksPerMajor = 10;
    let minorInterval = majorInterval / minorTicksPerMajor;
    
    // Fallback if minor ticks are too squished on screen
    if (minorInterval * zoom < 5) {
      minorTicksPerMajor = 5;
      minorInterval = majorInterval / minorTicksPerMajor;
    }
    if (minorInterval * zoom < 5) {
      minorTicksPerMajor = 1;
      minorInterval = majorInterval; // No minor ticks
    }
    
    const startIdx = Math.floor(scrollOffset / minorInterval);
    const endIdx = startIdx + Math.ceil((length / zoom) / minorInterval) + 1;

    for (let i = startIdx; i <= endIdx; i++) {
        const docValue = i * minorInterval;
        const screenPos = (docValue - scrollOffset) * zoom;
        
        if (screenPos < -50 || screenPos > length + 50) continue;
        
        const eps = minorInterval * 0.01;
        const closestMajor = Math.round(docValue / majorInterval) * majorInterval;
        const isMajorTick = Math.abs(docValue - closestMajor) < eps;
        
        const closestMedium = Math.round(docValue / (majorInterval / 2)) * (majorInterval / 2);
        const isMediumTick = Math.abs(docValue - closestMedium) < eps;
        
        const pos = Math.round(screenPos);
        
        ctx.beginPath();
        if (isHorizontal) {
          const tickHeight = isMajorTick ? size.height : isMediumTick ? 6 : 3;
          const tickY = size.height - tickHeight;
          ctx.moveTo(pos, tickY);
          ctx.lineTo(pos, size.height);
          
          if (isMajorTick) {
            ctx.fillText(Math.round(docValue).toString(), pos + 4, 3);
          }
        } else {
          const tickWidth = isMajorTick ? size.width : isMediumTick ? 6 : 3;
          const tickX = size.width - tickWidth;
          ctx.moveTo(tickX, pos);
          ctx.lineTo(size.width, pos);
          
          if (isMajorTick && pos > 0) { // Avoid overlap at corner
            ctx.save();
            ctx.translate(2, pos + 4);
            // Rotate 90 deg clockwise to be readable vertically
            ctx.rotate(Math.PI / 2);
            ctx.fillText(Math.round(docValue).toString(), 4, -9);
            ctx.restore();
          }
        }
        ctx.stroke();
    }

    // Bonus: Page Margin Guideline
    if (pageMargin > 0) {
      const MM_TO_PX = 3.779527559;
      const marginPx = pageMargin * MM_TO_PX;
      const marginScreenPos = (marginPx - scrollOffset) * zoom;
      
      if (marginScreenPos > 0 && marginScreenPos < length) {
        ctx.beginPath();
        ctx.strokeStyle = '#6366f1'; // tailwind indigo-500
        ctx.setLineDash([4, 4]); // Dashed line
        if (isHorizontal) {
          ctx.moveTo(marginScreenPos, 0);
          ctx.lineTo(marginScreenPos, size.height);
        } else {
          ctx.moveTo(0, marginScreenPos);
          ctx.lineTo(size.width, marginScreenPos);
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
      }
    }

  }, [size, zoom, scrollOffset, orientation, pageMargin]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: size.width,
          height: size.height,
          display: 'block',
        }}
      />
    </div>
  );
};
