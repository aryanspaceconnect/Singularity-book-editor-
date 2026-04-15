import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, Upload, Link as LinkIcon, Library } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InsertMediaDialog({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" title="Insert Image">
          <ImageIcon className="h-4 w-4" />
        </Button>} />
      <DialogContent className="sm:max-w-[500px] w-[95vw] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Insert Image</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="upload" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="upload" className="data-[state=active]:bg-background data-[state=active]:text-foreground"><Upload className="w-4 h-4 mr-2 hidden sm:block"/> Upload</TabsTrigger>
            <TabsTrigger value="gallery" className="data-[state=active]:bg-background data-[state=active]:text-foreground"><Library className="w-4 h-4 mr-2 hidden sm:block"/> Gallery</TabsTrigger>
            <TabsTrigger value="url" className="data-[state=active]:bg-background data-[state=active]:text-foreground"><LinkIcon className="w-4 h-4 mr-2 hidden sm:block"/> URL</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="mt-4 space-y-4">
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

          <TabsContent value="gallery" className="mt-4">
            {gallery.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Library className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No images uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
                {gallery.map((src, i) => (
                  <div 
                    key={i} 
                    className="aspect-square rounded-md border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                    onClick={() => {
                      editor.chain().focus().setImage({ src, align: 'center', size: 'full' }).run();
                      setOpen(false);
                    }}
                  >
                    <img src={src} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="url" className="mt-4 space-y-4">
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
