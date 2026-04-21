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
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setSize({ width: container.clientWidth, height: container.clientHeight });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    const tickSpacing = 10 * zoom; 
    const largeTickSpacing = 100 * zoom;
    
    // Draw tick marks
    const offset = scrollOffset; 
    const length = isHorizontal ? size.width : size.height;

    // Start drawing at negative offset to support scrolling offset smoothly
    const startPos = - (offset % largeTickSpacing);
    
    // Physical start calculation for label numbers
    const startValue = Math.floor(offset / largeTickSpacing) * 100;

    for (let i = startPos; i < length; i += tickSpacing) {
      // Calculate real value for this tick
      const value = startValue + ((i - startPos) / zoom);
      
      const isLargeTick = Math.abs(value % 100) < 1; // Tolerance for floats
      const isMediumTick = Math.abs(value % 50) < 1;
      
      const pos = Math.round(i);
      
      ctx.beginPath();
      if (isHorizontal) {
        const tickHeight = isLargeTick ? size.height : isMediumTick ? 6 : 3;
        const tickY = size.height - tickHeight;
        ctx.moveTo(pos, tickY);
        ctx.lineTo(pos, size.height);
        
        if (isLargeTick) {
          ctx.fillText(Math.round(value).toString(), pos + 3, 2);
        }
      } else {
        const tickWidth = isLargeTick ? size.width : isMediumTick ? 6 : 3;
        const tickX = size.width - tickWidth;
        ctx.moveTo(tickX, pos);
        ctx.lineTo(size.width, pos);
        
        if (isLargeTick && pos > 0) { // Avoid drawing 0 text overlap if near corner
          ctx.save();
          ctx.translate(2, pos + 3);
          // Optional text rotation for vertical
          const text = Math.round(value).toString();
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
      ctx.stroke();
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
