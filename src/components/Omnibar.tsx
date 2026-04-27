import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Loader2, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { Block } from '../lib/search.worker';

interface OmnibarProps {
  isOpen: boolean;
  onClose: () => void;
  workerRef: React.MutableRefObject<Worker | null>;
  onSelectCallback: (block: Block) => void;
}

export default function Omnibar({ isOpen, onClose, workerRef, onSelectCallback }: OmnibarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Block[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setQuery('');
      setResults([]);
      setExpandedGroups({});
    }
  }, [isOpen]);

  // Handle escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Setup worker listener for search results
  useEffect(() => {
    if (!workerRef.current) return;
    
    const worker = workerRef.current;
    const handleMessage = (e: MessageEvent) => {
      if (e.data.action === 'SEARCH_RESULTS') {
        setResults(e.data.results || []);
        setIsSearching(false);
        // Auto-expand first few groups when generating results
        const groups = groupByChapter(e.data.results || []);
        const newExpanded: Record<string, boolean> = {};
        Object.keys(groups).slice(0, 3).forEach(k => newExpanded[k] = true);
        setExpandedGroups(newExpanded);
      }
    };
    
    worker.addEventListener('message', handleMessage);
    return () => worker.removeEventListener('message', handleMessage);
  }, [workerRef]);

  // Handle query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setExpandedGroups({});
      return;
    }
    
    setIsSearching(true);
    const timer = setTimeout(() => {
      if (workerRef.current) {
        workerRef.current.postMessage({ 
          action: 'SEARCH', 
          payload: { query }, 
          queryId: Date.now() 
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, workerRef]);

  const groupByChapter = (blocks: Block[]) => {
    const groups: Record<string, Block[]> = {};
    for (const b of blocks) {
      const g = b.chapterName || 'General';
      if (!groups[g]) groups[g] = [];
      groups[g].push(b);
    }
    return groups;
  };
  
  const toggleGroup = (g: string) => {
    setExpandedGroups(prev => ({ ...prev, [g]: !prev[g] }));
  };

  const groupedResults = useMemo(() => groupByChapter(results), [results]);

  if (!isOpen) return null;

  const hasResults = results.length > 0;

  return (
    <div className={`absolute left-1/2 -translate-x-1/2 w-11/12 max-w-4xl z-[100] animate-in fade-in duration-300 ${hasResults ? 'top-1/4 -translate-y-1/4' : 'bottom-12 slide-in-from-bottom-8'}`}>
      <div className={`flex flex-col bg-background/60 backdrop-blur-3xl border border-border/50 shadow-2xl overflow-hidden transition-all duration-300 ${hasResults ? 'rounded-2xl max-h-[60vh]' : 'rounded-[1.5rem]'} `}>
        
        {/* Search Input Area */}
        <div className={`flex items-center shrink-0 px-6 py-4 ${hasResults ? 'border-b border-border/20' : ''}`}>
          <Search className="h-6 w-6 text-muted-foreground mr-4" />
          <input 
            ref={inputRef}
            className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 text-xl font-medium"
            placeholder="Search precision queries, chapters, positions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isSearching && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground ml-2" />}
        </div>

        {/* Results Area */}
        <div className={`overflow-y-auto hide-scrollbar transition-all duration-300 ${hasResults ? 'block p-2' : 'flex items-center px-6 py-2'}`}>
          {!hasResults && query.trim().length > 0 && !isSearching && (
            <div className="text-muted-foreground text-sm italic w-full">No exact precision matches found.</div>
          )}
          {!hasResults && query.trim().length === 0 && (
            <div className="text-muted-foreground/50 text-sm flex items-center w-full">
              Begin typing to traverse the positional AST index
              <ArrowRight className="inline ml-2 h-4 w-4" />
            </div>
          )}
          
          {hasResults && Object.entries(groupedResults).map(([chapter, blocks], idx) => {
            const isExpanded = expandedGroups[chapter] || false;
            return (
              <div key={idx} className="mb-2">
                <button 
                  onClick={() => toggleGroup(chapter)}
                  className="flex items-center justify-between w-full text-left px-4 py-2 hover:bg-foreground/5 rounded-lg transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-semibold text-foreground text-sm tracking-wide">{chapter}</span>
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">{blocks.length}</span>
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="pl-8 pr-4 py-2 space-y-2 border-l-2 border-border/50 ml-6 mt-1">
                    {blocks.map((res, i) => (
                      <button 
                        key={i}
                        onClick={() => onSelectCallback(res)}
                        className="flex flex-col items-start w-full text-left bg-foreground/5 hover:bg-foreground/10 rounded-xl px-4 py-3 transition-colors cursor-pointer"
                      >
                        <div className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1 mb-1">
                          {res.type} {res.hierarchyPath && res.hierarchyPath.length > 2 ? `• ${res.hierarchyPath[1]}` : ''} • POS: {res.pos}
                        </div>
                        <div className="text-sm font-medium text-foreground line-clamp-3 leading-relaxed">
                          {res.content}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
