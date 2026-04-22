import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ArrowRight } from 'lucide-react';
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setQuery('');
      setResults([]);
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
      }
    };
    
    worker.addEventListener('message', handleMessage);
    return () => worker.removeEventListener('message', handleMessage);
  }, [workerRef]);

  // Handle query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    setIsSearching(true);
    // Debounce the physical search slightly
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

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-11/12 max-w-4xl z-[100] animate-in fade-in slide-in-from-bottom-8 duration-300">
      {/* Watermark style bar */}
      <div className="flex items-center bg-background/40 backdrop-blur-xl border border-border/50 shadow-2xl rounded-[1.5rem] p-2 pr-4 overflow-hidden">
        
        {/* Search Input Area */}
        <div className="flex items-center flex-1 shrink-0 px-4 py-2 border-r border-border/20">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <input 
            ref={inputRef}
            className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/60 text-lg font-medium"
            placeholder="Search chapters, words, images..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
        </div>

        {/* Horizontal Results Area */}
        <div className="flex flex-1 overflow-x-auto gap-3 px-4 hide-scrollbar py-2">
          {results.length === 0 && query.trim().length > 0 && !isSearching && (
            <div className="text-muted-foreground text-sm italic py-1">No matches found in the index.</div>
          )}
          {results.map((res, idx) => (
            <button 
              key={idx}
              onClick={() => onSelectCallback(res)}
              className="flex flex-col items-start justify-center shrink-0 min-w-[200px] max-w-[280px] bg-foreground/5 hover:bg-foreground/10 text-left rounded-xl px-4 py-3 transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1 mb-1">
                {res.type} {res.chapterNumber ? `• CH ${res.chapterNumber}` : ''}
              </div>
              <div className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                {res.content}
              </div>
            </button>
          ))}
          {results.length === 0 && query.trim().length === 0 && (
            <div className="text-muted-foreground/50 text-sm py-1 flex items-center">
              Type to parse the AST index
              <ArrowRight className="inline ml-2 h-4 w-4" />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
