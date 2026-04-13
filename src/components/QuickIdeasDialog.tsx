import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Zap } from 'lucide-react';
import { useAI } from '../lib/ai-context';

export default function QuickIdeasDialog() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { ai } = useAI();

  const handleGenerate = async () => {
    if (!query) return;
    setLoading(true);
    setResult('');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: `Give me 3 quick, creative ideas for: ${query}`,
      });
      setResult(response.text || "No ideas generated.");
    } catch (error) {
      console.error("Error generating ideas:", error);
      setResult("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground" />}>
        <Zap className="h-4 w-4 text-primary" />
        Quick Ideas
      </DialogTrigger>
      <DialogContent className="bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Brainstorm
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="flex gap-2">
            <Input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="e.g. A plot twist for a mystery novel"
              className="bg-muted/50 border-border focus-visible:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <Button 
              onClick={handleGenerate} 
              disabled={!query || loading} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
            </Button>
          </div>
          
          <ScrollArea className="h-[200px] rounded-md border border-border bg-muted/50 p-4">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Brainstorming...
              </div>
            ) : result ? (
              <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                {result}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Enter a topic to get instant ideas.
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
