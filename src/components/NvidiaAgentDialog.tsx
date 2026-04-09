import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Cpu } from 'lucide-react';
import Markdown from 'react-markdown';

export default function NvidiaAgentDialog() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    if (!query) return;
    setLoading(true);
    setResult('');
    try {
      const response = await fetch('/api/agents/nvidia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: query })
      });

      const data = await response.json();
      
      if (!response.ok) {
        setResult(data.error || "An error occurred.");
      } else {
        // Extract content from NVIDIA API response format
        const content = data.choices?.[0]?.message?.content || "No content generated.";
        setResult(content);
      }
    } catch (error) {
      console.error("Error generating with NVIDIA agent:", error);
      setResult("An error occurred while connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100" />}>
        <Cpu className="h-4 w-4 text-green-500" />
        Gemma Agent
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-green-500" />
            Gemma-4-31b-it (NVIDIA API)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="flex gap-2">
            <Input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Ask the Gemma agent..."
              className="bg-zinc-900 border-zinc-800 focus-visible:ring-green-500"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <Button 
              onClick={handleGenerate} 
              disabled={!query || loading} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
            </Button>
          </div>
          
          <ScrollArea className="h-[400px] rounded-md border border-zinc-800 bg-zinc-900/50 p-4">
            {loading ? (
              <div className="flex h-full items-center justify-center text-zinc-500 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Gemma is thinking...
              </div>
            ) : result ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <Markdown>{result}</Markdown>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-zinc-500 text-sm gap-2">
                <p>Enter a prompt to test the NVIDIA Gemma agent.</p>
                <p className="text-xs text-zinc-600">Ensure NVIDIA_API_KEY is set in your environment secrets.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
