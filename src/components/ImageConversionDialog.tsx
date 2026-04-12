import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileImage, FileType2, Loader2 } from "lucide-react";

export default function ImageConversionDialog({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const getSelectedImageSrc = () => {
    const { attributes } = editor.getAttributes('image');
    return attributes?.src;
  };

  const handleConvert = async (format: 'svg' | 'png' | 'png-4x' | 'jpg') => {
    const src = getSelectedImageSrc();
    if (!src) return;

    setIsConverting(true);
    try {
      let newSrc = src;

      if (format === 'svg') {
        const ImageTracer = (await import('imagetracerjs')).default;
        newSrc = await new Promise((resolve) => {
          ImageTracer.imageToSVG(src, (svgStr: string) => {
            resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`);
          }, 'posterized2');
        });
      } else {
        // Canvas based conversion for PNG/JPG
        newSrc = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = format === 'png-4x' ? 4 : 1;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('No canvas context');
            
            if (format === 'jpg') {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
            const quality = format === 'jpg' ? 0.9 : undefined;
            resolve(canvas.toDataURL(mimeType, quality));
          };
          img.onerror = reject;
          img.src = src;
        });
      }

      editor.chain().focus().updateAttributes('image', { src: newSrc }).run();
      setOpen(false);
    } catch (err) {
      console.error("Conversion failed:", err);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" title="Convert Image Format" />}>
        <RefreshCw className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] w-[95vw]">
        <DialogHeader>
          <DialogTitle>Convert Image Format</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {isConverting ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Converting image...</p>
            </div>
          ) : (
            <>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handleConvert('svg')}>
                <FileType2 className="mr-3 h-5 w-5 text-indigo-500 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Vectorize to SVG</div>
                  <div className="text-xs text-zinc-500 whitespace-normal">Infinite scaling, best for logos/icons</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handleConvert('png-4x')}>
                <FileImage className="mr-3 h-5 w-5 text-blue-500 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">High-Quality PNG (4x)</div>
                  <div className="text-xs text-zinc-500 whitespace-normal">Upscaled raster, best for detailed exports</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handleConvert('png')}>
                <FileImage className="mr-3 h-5 w-5 text-zinc-500 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Standard PNG</div>
                  <div className="text-xs text-zinc-500 whitespace-normal">Lossless raster format</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handleConvert('jpg')}>
                <FileImage className="mr-3 h-5 w-5 text-zinc-500 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Standard JPG</div>
                  <div className="text-xs text-zinc-500 whitespace-normal">Compressed raster format</div>
                </div>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
