import { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useAI } from '../lib/ai-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowRight, Loader2, Check, X } from 'lucide-react';
import { diffWords } from 'diff';

export default function InlineAIChat({ editor }: { editor: Editor }) {
  const { ai } = useAI();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when selection changes
  useEffect(() => {
    const handleSelectionUpdate = () => {
      if (isOpen && !result) {
        setIsOpen(false);
        setPrompt('');
        setResult(null);
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, isOpen, result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !editor) return;

    setLoading(true);
    try {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, '\n');
      setOriginalText(selectedText);

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Instruction: ${prompt}\n\nSelected Text:\n${selectedText}`,
        config: {
          systemInstruction: "You are an inline AI writing assistant. Modify the selected text according to the user's instruction. Return ONLY the modified text, formatted in HTML suitable for a rich text editor. You have access to advanced formatting. Use standard HTML tags like <strong>, <em>, <u>, <s>. For colors, use <span style=\"color: #hex\">. For highlight, use <mark data-color=\"#hex\">. For font size, use <span style=\"font-size: 24px\">. For font family, use <span style=\"font-family: 'Inter'\">. For tables, use standard <table> tags. For scene breaks, use <div class=\"scene-break\"></div>. For callouts, use <div class=\"callout\" data-type=\"info|warning|success|error\">content</div>. Do NOT include markdown code blocks. Do NOT include conversational filler."
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

  const renderDiff = () => {
    if (!result) return null;
    // Strip HTML tags for diffing to make it simpler, or just diff the text content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = result;
    const newText = tempDiv.textContent || '';
    
    const diff = diffWords(originalText, newText);

    return (
      <div className="max-h-[200px] max-w-[400px] overflow-y-auto p-2 text-sm leading-relaxed">
        {diff.map((part, index) => {
          const color = part.added ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30 font-medium' :
                        part.removed ? 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30 line-through opacity-70' :
                        'text-foreground';
          return (
            <span key={index} className={color}>
              {part.value}
            </span>
          );
        })}
      </div>
    );
  };

  if (!editor) return null;

  return (
    <BubbleMenu 
      editor={editor} 
      options={{ placement: 'top' }}
      className="flex flex-col gap-1 p-1 bg-background border border-border shadow-lg rounded-lg overflow-hidden"
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
        <div className="flex flex-col">
          {renderDiff()}
          <div className="flex items-center justify-between border-t border-border p-2 bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">Accept changes?</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={discardResult} className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                <X className="h-3 w-3 mr-1" /> Discard
              </Button>
              <Button variant="default" size="sm" onClick={applyResult} className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                <Check className="h-3 w-3 mr-1" /> Accept
              </Button>
            </div>
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
