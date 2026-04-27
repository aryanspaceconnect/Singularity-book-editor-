/// <reference types="vite/client" />
import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, Upload, Link as LinkIcon, Library, Search, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InsertMediaDialog({ editor, trigger, open: controlledOpen, onOpenChange }: { editor: any, trigger?: React.ReactNode, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  
  const [url, setUrl] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Search state
  const [imageQuery, setImageQuery] = useState('');
  const [imageResults, setImageResults] = useState<any[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('image_gallery');
    if (saved) {
      try {
        setGallery(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveToGallery = (src: string) => {
    const newGallery = [src, ...gallery.filter(g => g !== src)].slice(0, 20); // Keep last 20
    setGallery(newGallery);
    localStorage.setItem('image_gallery', JSON.stringify(newGallery));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        saveToGallery(result);
        editor.chain().focus().setImage({ src: result, align: 'center', size: 'full' }).run();
        setOpen(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlSubmit = () => {
    if (url) {
      saveToGallery(url);
      editor.chain().focus().setImage({ src: url, align: 'center', size: 'full' }).run();
      setOpen(false);
      setUrl('');
    }
  };

  const searchImages = async () => {
    if (!imageQuery) return;
    setImageLoading(true);
    setImageError('');
    try {
      const key = import.meta.env.VITE_PEXELS_API_KEY || import.meta.env.VITE_UNSPLASH_API_KEY;
      if (!key) {
        throw new Error("Missing VITE_PEXELS_API_KEY or VITE_UNSPLASH_API_KEY in .env");
      }
      
      const isUnsplash = !!import.meta.env.VITE_UNSPLASH_API_KEY;
      
      if (isUnsplash) {
         const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(imageQuery)}&per_page=10`, {
            headers: {
              Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_API_KEY}`
            }
         });
         if (!res.ok) throw new Error("Unsplash API Error: " + res.statusText);
         const data = await res.json();
         setImageResults(data.results.map((r: any) => ({ url: r.urls.regular, id: r.id, alt: r.alt_description })));
      } else {
          // Pexels API
          const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(imageQuery)}&per_page=10`, {
            headers: {
              Authorization: import.meta.env.VITE_PEXELS_API_KEY
            }
          });
          if (!res.ok) throw new Error("Pexels API Error: " + res.statusText);
          const data = await res.json();
          setImageResults(data.photos.map((p: any) => ({ url: p.src.medium, id: p.id, alt: p.alt })));
      }
    } catch (error: any) {
      console.error(error);
      setImageError(error.message);
    } finally {
      setImageLoading(false);
    }
  };

  const insertSearchedImage = (src: string) => {
    saveToGallery(src);
    editor.chain().focus().setImage({ src, align: 'center', size: 'full' }).run();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* @ts-ignore - The asChild prop is present in Radix DialogTrigger but TS doesn't see it via this wrapping */}
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button variant="ghost" size="icon" title="Insert Image" className="h-8 w-8 rounded-full">
            <ImageIcon className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] w-[95vw] bg-background border-border text-foreground p-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="pt-6 px-6 shrink-0">
          <DialogTitle>Insert Image</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="search" className="w-full mt-4 flex flex-col min-h-0">
          <div className="px-6 shrink-0">
            <TabsList className="grid w-full grid-cols-4 bg-muted">
              <TabsTrigger value="search" className="data-[state=active]:bg-background data-[state=active]:text-foreground"><Search className="w-4 h-4 sm:mr-2"/><span className="hidden sm:inline">Search</span></TabsTrigger>
              <TabsTrigger value="upload" className="data-[state=active]:bg-background data-[state=active]:text-foreground"><Upload className="w-4 h-4 sm:mr-2"/><span className="hidden sm:inline">Upload</span></TabsTrigger>
              <TabsTrigger value="gallery" className="data-[state=active]:bg-background data-[state=active]:text-foreground"><Library className="w-4 h-4 sm:mr-2"/><span className="hidden sm:inline">Gallery</span></TabsTrigger>
              <TabsTrigger value="url" className="data-[state=active]:bg-background data-[state=active]:text-foreground"><LinkIcon className="w-4 h-4 sm:mr-2"/><span className="hidden sm:inline">URL</span></TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="search" className="m-0 space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Search free images..." 
                  value={imageQuery} 
                  onChange={(e) => setImageQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchImages()}
                  className="flex-1 border-border"
                />
                <Button onClick={searchImages} disabled={imageLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 w-24">
                  {imageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
              
              {imageError && (
                 <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md text-sm whitespace-pre-wrap">
                   {imageError}
                   <br/><br/>
                   To fix this, add either:<br/>
                   <code className="bg-background px-1 rounded block mt-1">VITE_PEXELS_API_KEY="your_key"</code>
                   or<br/>
                   <code className="bg-background px-1 rounded block mt-1">VITE_UNSPLASH_API_KEY="your_key"</code>
                   <br/>to your environment variables.
                 </div>
               )}
               {imageResults.length === 0 && !imageLoading && !imageError ? (
                 <div className="text-center text-muted-foreground pt-12">Search Unsplash / Pexels</div>
               ) : (
                 <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {imageResults.map((img, i) => (
                      <div key={i} className="aspect-square rounded-md overflow-hidden relative group cursor-pointer border border-border hover:border-primary transition-colors" onClick={() => insertSearchedImage(img.url)}>
                        <img src={img.url} alt={img.alt || 'img'} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-xs font-semibold">Insert</span>
                        </div>
                      </div>
                    ))}
                 </div>
               )}
            </TabsContent>

            <TabsContent value="upload" className="m-0 space-y-4">
              <div 
                className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted transition-colors cursor-pointer relative overflow-hidden" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">Click to upload image</p>
                <p className="text-xs text-muted-foreground mt-1">Supports PNG, JPG, SVG, WEBP</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/png, image/jpeg, image/svg+xml, image/webp, image/gif" 
                  onChange={handleFileChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="gallery" className="m-0">
              {gallery.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Library className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No images saved to local gallery yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {gallery.map((src, i) => (
                    <div 
                      key={i} 
                      className="aspect-square rounded-md border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => insertSearchedImage(src)}
                    >
                      <img src={src} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="url" className="m-0 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Image URL</label>
                <Input 
                  placeholder="https://example.com/image.png" 
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button onClick={handleUrlSubmit} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!url}>Insert Image</Button>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
