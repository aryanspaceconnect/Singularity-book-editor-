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
import { BookTypography, DropCap, PageBreak, CustomImage, SmartPunctuation } from '../lib/tiptap-extensions';
import { SlashCommands, slashCommandSuggestion } from '../lib/slash-commands';
import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Scissors, Check, AlertCircle, Download } from 'lucide-react';
import ProjectSettingsDialog, { STANDARD_PAGE_SIZES } from './ProjectSettingsDialog';
import GenerateImageDialog from './GenerateImageDialog';
import ResearchDialog from './ResearchDialog';
import QuickIdeasDialog from './QuickIdeasDialog';
import NvidiaAgentDialog from './NvidiaAgentDialog';
import WritingAgentsMenu from './WritingAgentsMenu';
import InlineAIChat from './InlineAIChat';
import PublishingDirector from './PublishingDirector';
import InsertMediaDialog from './InsertMediaDialog';
import ImageFormatMenu from './ImageFormatMenu';
import { Button } from '@/components/ui/button';

const MenuBar = ({ editor, saveStatus }: { editor: any, saveStatus: 'saved' | 'saving' | 'error' }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/50 rounded-t-[2rem]">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-border mx-1" />
      
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={editor.isActive('heading', { level: 3 }) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        className={editor.isActive('heading', { level: 4 }) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <Heading4 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
        className={editor.isActive('heading', { level: 5 }) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <Heading5 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
        className={editor.isActive('heading', { level: 6 }) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <Heading6 className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={editor.isActive({ textAlign: 'left' }) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={editor.isActive({ textAlign: 'center' }) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={editor.isActive({ textAlign: 'right' }) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={editor.isActive({ textAlign: 'justify' }) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <AlignJustify className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={editor.isActive('blockquote') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <Quote className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleDropCap().run()}
        className={editor.isActive('paragraph', { dropCap: true }) ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
        title="Toggle Drop Cap"
      >
        <Type className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setPageBreak().run()}
        className="text-muted-foreground hover:text-foreground"
        title="Insert Page Break"
      >
        <Scissors className="h-4 w-4" />
      </Button>

      <InsertMediaDialog editor={editor} />
      
      <div className="flex-1" />
      <div className="flex items-center gap-2 pr-2">
        <PublishingDirector editor={editor} />
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

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (!projectId) return;
    const settingsRef = doc(db, 'projects', projectId);
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    });
    return () => unsubscribe();
  }, [projectId]);

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
      SmartPunctuation,
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

  useEffect(() => {
    if (!editor) return;

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.runningHeader !== undefined) {
          setRunningHeader(data.runningHeader);
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

  if (loading || !settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getPageDimensions = () => {
    if (settings.pageSizeId === 'custom') {
      const unit = settings.customUnit || 'mm';
      return {
        width: `${settings.customWidth}${unit}`,
        height: `${settings.customHeight}${unit}`,
      };
    }
    const size = STANDARD_PAGE_SIZES.find(s => s.id === settings.pageSizeId) || STANDARD_PAGE_SIZES[0];
    return {
      width: `${size.width}mm`,
      height: `${size.height}mm`,
    };
  };

  const { width, height } = getPageDimensions();

  return (
    <div className="h-full w-full flex flex-col bg-background rounded-[2rem] relative overflow-hidden">
      <MenuBar editor={editor} saveStatus={saveStatus} />
      <InlineAIChat editor={editor} />
      <ImageFormatMenu editor={editor} />
      
      {/* Floating Save Indicator */}
      <div className="absolute top-4 right-4 z-50 pointer-events-none flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm text-xs font-medium text-muted-foreground transition-opacity duration-300">
          {saveStatus === 'saving' && <><Loader2 className="h-3 w-3 animate-spin text-primary" /> <span>Saving...</span></>}
          {saveStatus === 'saved' && <><Check className="h-3 w-3 text-primary" /> <span>Saved</span></>}
          {saveStatus === 'error' && <><AlertCircle className="h-3 w-3 text-destructive" /> <span>Error</span></>}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.print()} 
          className="pointer-events-auto rounded-full bg-background/80 backdrop-blur-sm border-border text-muted-foreground hover:bg-muted hover:text-foreground gap-2"
        >
          <Download className="h-3 w-3" />
          Export PDF
        </Button>
        <ProjectSettingsDialog projectId={projectId} />
      </div>

      <div className="flex-1 overflow-y-auto p-8 lg:p-12 relative bg-muted/20 print:p-0 print:bg-white print:overflow-visible">
        <div className="max-w-fit mx-auto mb-8 flex items-center justify-center print:hidden">
          <div className="text-center text-xs uppercase tracking-widest text-muted-foreground bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50">
            {runningHeader || 'Untitled Manuscript'}
          </div>
        </div>
        
        <div 
          className={`transition-all duration-300 mx-auto relative shadow-2xl print:shadow-none print:border-none print:m-0 page-container texture-${settings.texture || 'none'}`}
          style={{ 
            width, 
            minHeight: height,
            backgroundColor: settings.pageColor || '#ffffff',
            padding: `${settings.margins || 20}mm`,
          }}
        >
          {settings.showGrid && (
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ 
              backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              color: 'var(--foreground)'
            }} />
          )}
          {settings.showMargins && (
            <div className="absolute pointer-events-none border border-primary/20 border-dashed" style={{
              top: `${settings.margins || 20}mm`,
              bottom: `${settings.margins || 20}mm`,
              left: `${settings.margins || 20}mm`,
              right: `${settings.margins || 20}mm`,
            }} />
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
