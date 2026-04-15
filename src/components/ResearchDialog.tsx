import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Globe, Send, Bot, User } from 'lucide-react';
import Markdown from 'react-markdown';
import { useAI } from '../lib/ai-context';

export default function ResearchDialog({ contextText = '' }: { contextText?: string }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { ai } = useAI();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const chatWithHistory = ai.chats.create({
        model: 'gemini-3.1-flash-lite-preview', // Use a model that supports Google Search if possible, or stick to flash
        config: {
          systemInstruction: `You are a Research Agent. You have access to Google Search.
Context from the user's current book/selection:
${contextText.substring(0, 5000)}`,
          tools: [{ googleSearch: {} }]
        },
        history: history
      });

      const response = await chatWithHistory.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "No results found." }]);
    } catch (error) {
      console.error("Error researching:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "An error occurred during research." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<div className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-muted rounded-sm">
          <Globe className="h-4 w-4 text-primary" />
          Research Agent
        </div>} />
      <DialogContent className="bg-background border-border text-foreground sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Research Agent (Live Web Search)
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-[500px] mt-4">
          <ScrollArea className="flex-1 rounded-md border border-border bg-muted/20 p-4 mb-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm mt-10">
                  Ask a question to search the web. I have context of your book!
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-muted' : 'bg-primary/20'}`}>
                    {msg.role === 'user' ? <User className="h-4 w-4 text-muted-foreground" /> : <Bot className="h-4 w-4 text-primary" />}
                  </div>
                  <div className={`rounded-xl px-4 py-2 text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-muted text-foreground' : 'bg-card border border-border'}`}>
                    {msg.role === 'user' ? msg.content : (
                      <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-xl px-4 py-2 text-sm bg-card border border-border flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Searching the web...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="flex gap-2">
            <Input 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="What do you want to research?"
              className="bg-muted/50 border-border focus-visible:ring-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || loading} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
