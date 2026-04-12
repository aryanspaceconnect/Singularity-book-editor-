import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import TextAlign from '@tiptap/extension-text-align';
import Dropcursor from '@tiptap/extension-dropcursor';
import Placeholder from '@tiptap/extension-placeholder';
import Focus from '@tiptap/extension-focus';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import CharacterCount from '@tiptap/extension-character-count';
import { BookTypography, DropCap, PageBreak, CustomImage } from '../lib/tiptap-extensions';
import { SlashCommands, slashCommandSuggestion } from '../lib/slash-commands';
import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Scissors, Check, AlertCircle } from 'lucide-react';
import GenerateImageDialog from './GenerateImageDialog';
import ResearchDialog from './ResearchDialog';
import QuickIdeasDialog from './QuickIdeasDialog';
import NvidiaAgentDialog from './NvidiaAgentDialog';
import WritingAgentsMenu from './WritingAgentsMenu';
import InlineAIChat from './InlineAIChat';
import ContentGraphDialog from './ContentGraphDialog';
import PublishingDirector from './PublishingDirector';
import PretextLayoutDialog from './PretextLayoutDialog';
import InsertMediaDialog from './InsertMediaDialog';
import ImageFormatMenu from './ImageFormatMenu';
import { Button } from '@/components/ui/button';

const MenuBar = ({ editor, saveStatus }: { editor: any, saveStatus: 'saved' | 'saving' | 'error' }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-zinc-200 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50 rounded-t-[2rem]">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-800 mx-1" />
      
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-800 mx-1" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={editor.isActive({ textAlign: 'left' }) ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={editor.isActive({ textAlign: 'center' }) ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={editor.isActive({ textAlign: 'right' }) ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={editor.isActive({ textAlign: 'justify' }) ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
      >
        <AlignJustify className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-800 mx-1" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
      >
        <Quote className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-800 mx-1" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleDropCap().run()}
        className={editor.isActive('paragraph', { dropCap: true }) ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}
        title="Toggle Drop Cap"
      >
        <Type className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setPageBreak().run()}
        className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        title="Insert Page Break"
      >
        <Scissors className="h-4 w-4" />
      </Button>

      <InsertMediaDialog editor={editor} />
      
      <div className="flex-1" />
      <div className="flex items-center gap-2 pr-2">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mr-2 flex items-center gap-1">
          {saveStatus === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>}
          {saveStatus === 'saved' && <><Check className="h-3 w-3" /> Saved</>}
          {saveStatus === 'error' && <><AlertCircle className="h-3 w-3 text-red-500" /> Error saving</>}
        </div>
        <PretextLayoutDialog editor={editor} />
        <PublishingDirector editor={editor} />
        <ContentGraphDialog editor={editor} />
        <WritingAgentsMenu editor={editor} />
        <NvidiaAgentDialog />
        <QuickIdeasDialog />
        <ResearchDialog />
        <GenerateImageDialog onImageGenerated={(url) => {
          editor?.chain().focus().setImage({ src: url, align: 'center', size: 'full' }).run();
        }} />
      </div>
    </div>
  );
};

export default function Canvas({ projectId, userId }: { projectId: string, userId: string }) {
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const docRef = doc(db, 'projects', projectId, 'canvas', 'main');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit, 
      CustomImage.configure({
        allowBase64: true,
      }),
      Typography,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Start writing your book here, or ask the Observer to generate an outline...',
      }),
      Focus.configure({
        className: 'has-focus',
        mode: 'all',
      }),
      FontFamily,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      CharacterCount,
      BookTypography,
      DropCap,
      PageBreak,
      SlashCommands.configure({
        suggestion: slashCommandSuggestion,
      })
    ],
    content: `<h1>Chapter 1: The Beginning</h1><p>Start writing your book here, or ask the Observer to generate an outline...</p>`,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg mx-auto focus:outline-none max-w-3xl min-h-[500px] pb-32 font-serif',
      },
    },
    onUpdate: ({ editor }) => {
      // Save to firestore with debounce
      setSaveStatus('saving');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const json = editor.getJSON();
        setDoc(docRef, {
          content: JSON.stringify(json),
          updatedAt: new Date().toISOString()
        }, { merge: true })
          .then(() => setSaveStatus('saved'))
          .catch((e) => {
            console.error("Error saving document:", e);
            setSaveStatus('error');
          });
      }, 1000);
    },
  });

  const [runningHeader, setRunningHeader] = useState('');
  const [pageSize, setPageSize] = useState<'infinite' | 'a4' | 'a3'>('infinite');

  useEffect(() => {
    if (!editor) return;

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.runningHeader !== undefined) {
          setRunningHeader(data.runningHeader);
        }
        if (data.pageSize !== undefined) {
          setPageSize(data.pageSize);
        }
        if (data.content) {
          if (data.content.trim().startsWith('<')) {
            // It's HTML
            if (editor.getHTML() !== data.content && !editor.isFocused) {
              editor.commands.setContent(data.content, { emitUpdate: false });
            }
          } else {
            // It's JSON
            try {
              const parsed = JSON.parse(data.content);
              const currentContent = editor.getJSON();
              if (JSON.stringify(currentContent) !== JSON.stringify(parsed) && !editor.isFocused) {
                editor.commands.setContent(parsed, { emitUpdate: false }); 
              }
            } catch (e) {
              console.error("Error parsing canvas content", e);
            }
          }
        }
      } else {
        // Initialize if it doesn't exist
        setSaveStatus('saving');
        setDoc(docRef, {
          content: JSON.stringify(editor.getJSON()),
          updatedAt: new Date().toISOString()
        }).then(() => setSaveStatus('saved')).catch(() => setSaveStatus('error'));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [editor, projectId]);

  const headerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleRunningHeaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setRunningHeader(newValue);
    setSaveStatus('saving');
    
    if (headerTimeoutRef.current) clearTimeout(headerTimeoutRef.current);
    headerTimeoutRef.current = setTimeout(() => {
      setDoc(docRef, { runningHeader: newValue }, { merge: true })
        .then(() => setSaveStatus('saved'))
        .catch((e) => {
          console.error("Error saving running header:", e);
          setSaveStatus('error');
        });
    }, 1000);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value as 'infinite' | 'a4' | 'a3';
    setPageSize(newValue);
    setSaveStatus('saving');
    setDoc(docRef, { pageSize: newValue }, { merge: true })
      .then(() => setSaveStatus('saved'))
      .catch((e) => {
        console.error("Error saving page size:", e);
        setSaveStatus('error');
      });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  const getPageSizeClasses = () => {
    switch (pageSize) {
      case 'a4': return 'relative max-w-[210mm] min-h-[297mm] bg-white dark:bg-zinc-950 shadow-xl border border-zinc-200 dark:border-zinc-800 p-12 mx-auto';
      case 'a3': return 'relative max-w-[297mm] min-h-[420mm] bg-white dark:bg-zinc-950 shadow-xl border border-zinc-200 dark:border-zinc-800 p-16 mx-auto';
      default: return 'relative max-w-3xl mx-auto';
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-black rounded-[2rem]">
      <MenuBar editor={editor} saveStatus={saveStatus} />
      <InlineAIChat editor={editor} />
      <ImageFormatMenu editor={editor} />
      <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative bg-zinc-50 dark:bg-black">
        <div className="max-w-3xl mx-auto mb-8 flex items-center justify-between">
          <input 
            type="text" 
            value={runningHeader}
            onChange={handleRunningHeaderChange}
            placeholder="Running Header (e.g., Chapter 1)" 
            className="flex-1 text-center text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-500 bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
          />
          <select 
            value={pageSize}
            onChange={handlePageSizeChange}
            className="text-xs bg-transparent border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-zinc-500 dark:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="infinite">Infinite Canvas</option>
            <option value="a4">A4 Page</option>
            <option value="a3">A3 Page</option>
          </select>
        </div>
        <div className={`transition-all duration-300 ${getPageSizeClasses()}`}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
