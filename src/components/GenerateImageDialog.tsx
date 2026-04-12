import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { useAI } from '../lib/ai-context';

export default function GenerateImageDialog({ onImageGenerated }: { onImageGenerated: (url: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { ai } = useAI();

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: "1K"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64EncodeString}`;
          onImageGenerated(imageUrl);
          setOpen(false);
          setPrompt('');
          break;
        }
      }
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100" />}>
        <ImageIcon className="h-4 w-4" />
        Add Illustration
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
        <DialogHeader>
          <DialogTitle>Generate Illustration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Prompt</label>
            <Input 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              placeholder="A cyberpunk city at night..."
              className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Aspect Ratio</label>
            <select 
              value={aspectRatio} 
              onChange={(e) => setAspectRatio(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="1:1">1:1 (Square)</option>
              <option value="2:3">2:3 (Portrait)</option>
              <option value="3:2">3:2 (Landscape)</option>
              <option value="3:4">3:4</option>
              <option value="4:3">4:3</option>
              <option value="9:16">9:16 (Vertical)</option>
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="21:9">21:9 (Cinematic)</option>
            </select>
          </div>
          <Button 
            onClick={handleGenerate} 
            disabled={!prompt || loading} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
