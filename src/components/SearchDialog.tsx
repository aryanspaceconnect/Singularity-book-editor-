import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, Loader2, ArrowRight } from 'lucide-react';
import { searchBlocks } from '../lib/blockifier';

export default function SearchDialog({ projectId }: { projectId: string | null }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener('open-search', handleOpen);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('open-search', handleOpen);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const executeSearch = async () => {
    if (!projectId || !query.trim()) return;
    setLoading(true);
    
    // Extremely basic parser for keywords and mode:
    // e.g., "quantum mode:2 id:chapter_1_quantum_physics serial:3.1"
    let mode = 0;
    let id = undefined;
    let serialNumber = undefined;
    let keywords = [];
    
    const terms = query.split(' ');
    for (const term of terms) {
      if (term.startsWith('mode:')) {
        mode = parseInt(term.replace('mode:', ''), 10);
      } else if (term.startsWith('id:')) {
        id = term.replace('id:', '');
      } else if (term.startsWith('serial:')) {
        serialNumber = term.replace('serial:', '');
      } else if (term.trim()) {
        keywords.push(term);
      }
    }
    
    try {
      const dbResults = await searchBlocks({
        projectId,
        keywords: keywords.length > 0 ? keywords : undefined,
        id,
        serialNumber,
        mode
      });
      setResults(dbResults);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const jumpToText = (text: string) => {
    setOpen(false);
    // Custom event to scroll/highlight in canvas if needed
    window.dispatchEvent(new CustomEvent('highlight-text', { detail: { text } }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] border-border bg-background">
        <DialogHeader>
          <DialogTitle>Smart Block Search</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 items-center">
          <Input 
            autoFocus
            placeholder="Search keywords, id:..., serial:..., mode:..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
          />
          <Button onClick={executeSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SearchIcon className="h-4 w-4" />}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mb-4">
          Try: "quantum serial:3.1 mode:2"
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-4">
          {results.length === 0 && !loading && query && (
             <p className="text-sm text-muted-foreground text-center py-4">No blocks matched your query.</p>
          )}
          {results.map((res, i) => (
            <div key={i} className="p-4 border border-border rounded-xl bg-card">
              <div className="text-xs font-mono text-primary mb-2">ID: {res.id}</div>
              <div className="space-y-3">
                {Object.entries(res.mic).map(([subId, content]) => (
                  <div key={subId} className="group relative">
                    <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full mr-2">
                      {subId}
                    </span>
                    <span className="text-sm">{(content as string)}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => jumpToText(content as string)}
                      className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
