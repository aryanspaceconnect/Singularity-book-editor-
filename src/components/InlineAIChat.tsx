import { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useAI } from '../lib/ai-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowRight, Loader2, Check, X } from 'lucide-react';

export default function InlineAIChat({ editor }: { editor: Editor }) {
  const { ai } = useAI();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when selection changes
  useEffect(() => {
    const handleSelectionUpdate = () => {
      if (isOpen) {
        setIsOpen(false);
        setPrompt('');
        setResult(null);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !editor) return;

    setLoading(true);
    try {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, '\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Instruction: ${prompt}\n\nSelected Text:\n${selectedText}`,
        config: {
          systemInstruction: "You are an inline AI writing assistant. Modify the selected text according to the user's instruction. Return ONLY the modified text, formatted in HTML suitable for a rich text editor. Do NOT include markdown code blocks. Do NOT include conversational filler."
        }
      });

      const cleanHtml = response.text?.replace(/^```html\n?/, '').replace(/\n?```$/, '') || '';
      setResult(cleanHtml);
    } catch (error) {
      console.error('Inline AI Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyResult = () => {
    if (result && editor) {
      editor.chain().focus().deleteSelection().insertContent(result).run();
      setIsOpen(false);
      setPrompt('');
      setResult(null);
    }
  };

  const discardResult = () => {
    setResult(null);
    setPrompt('');
    inputRef.current?.focus();
  };

  if (!editor) return null;

  return (
    <BubbleMenu 
      editor={editor} 
      options={{ placement: 'top' }}
      className="flex items-center gap-1 p-1 bg-background border border-border shadow-lg rounded-lg overflow-hidden"
    >
      {!isOpen ? (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 gap-2 text-primary hover:bg-primary/10"
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          <Sparkles className="h-4 w-4" />
          Ask AI
        </Button>
      ) : result ? (
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="text-sm text-muted-foreground max-w-[200px] truncate">
            Ready to apply
          </span>
          <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
            <Button variant="ghost" size="icon-sm" onClick={applyResult} className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10">
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={discardResult} className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center gap-1 px-1">
          <Sparkles className="h-4 w-4 text-primary ml-1" />
          <Input
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Tell AI what to do..."
            className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-[250px] shadow-none bg-transparent text-foreground placeholder:text-muted-foreground"
            disabled={loading}
          />
          <Button 
            type="submit" 
            size="icon-sm" 
            variant="ghost" 
            disabled={!prompt.trim() || loading}
            className="h-6 w-6 shrink-0 text-primary hover:text-primary hover:bg-primary/10"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      )}
    </BubbleMenu>
  );
}
