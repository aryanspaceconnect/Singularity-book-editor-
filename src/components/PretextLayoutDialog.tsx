import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Loader2 } from "lucide-react";
import { prepareWithSegments, layoutNextLineRange, materializeLineRange, type LayoutCursor } from '@chenglou/pretext';
import { Editor } from '@tiptap/react';

export default function PretextLayoutDialog({ editor }: { editor: Editor }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageWidth, setPageWidth] = useState(400);

  useEffect(() => {
    if (!open || !editor || !canvasRef.current) return;

    const renderLayout = async () => {
      setLoading(true);
      try {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        // Get plain text from editor for demonstration
        // In a full implementation, we would parse the JSON and handle formatting
        const text = editor.getText();
        
        // Clear canvas
        ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        
        // Set up font
        const font = '16px serif';
        ctx.font = font;
        ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#e4e4e7' : '#18181b';
        
        // Prepare text using pretext
        const prepared = prepareWithSegments(text, font);
        
        let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
        let y = 30; // Starting Y position
        const lineHeight = 24;
        
        // Render lines
        while (true) {
          const range = layoutNextLineRange(prepared, cursor, pageWidth);
          if (range === null) break;
          
          const line = materializeLineRange(prepared, range);
          ctx.fillText(line.text, 20, y);
          
          cursor = range.end;
          y += lineHeight;
          
          // Expand canvas if needed
          if (y > canvasRef.current!.height - 50) {
             canvasRef.current!.height += 500;
             // Re-apply font after resizing canvas
             ctx.font = font;
             ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#e4e4e7' : '#18181b';
          }
        }
      } catch (error) {
        console.error("Error rendering pretext layout:", error);
      } finally {
        setLoading(false);
      }
    };

    // Small delay to ensure canvas is ready
    setTimeout(renderLayout, 100);
  }, [open, editor, pageWidth]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <LayoutTemplate className="h-4 w-4" />
        Fluid Layout Preview
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pretext Fluid Layout Engine</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center gap-4 py-2">
          <label className="text-sm font-medium">Page Width:</label>
          <input 
            type="range" 
            min="200" 
            max="700" 
            value={pageWidth} 
            onChange={(e) => setPageWidth(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-zinc-500">{pageWidth}px</span>
        </div>

        <div className="flex-1 overflow-auto border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          )}
          <canvas 
            ref={canvasRef} 
            width={750} 
            height={800} 
            className="w-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
