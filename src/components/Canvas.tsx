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
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { BookTypography, DropCap, PageBreak, CustomImage, SmartPunctuation, FontSize, SceneBreak, Callout } from '../lib/tiptap-extensions';
import { ChapterHeader, EpistolaryLetter, TerminalLog, BlockEpigraph, ManuscriptNote, DialogueSpoken, InternalMonologue, RedactedText, SignageText, NewspaperClipping, LitRPGQuest, LitRPGStatBlock, ScreenplayDialogue, ScreenplayCharacter, DedicationFont, ProsePoetry, TextMessage, TextMessageReply, GlossaryDefinition, TimelineDate, FleuronBreak } from '../lib/book-nodes';
import { SlashCommands, slashCommandSuggestion } from '../lib/slash-commands';
import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Scissors, Check, AlertCircle, Download, Underline as UnderlineIcon, Subscript as SubscriptIcon, Superscript as SuperscriptIcon, Link as LinkIcon, CheckSquare, Table as TableIcon, Palette, Highlighter, MessageSquareWarning, Minus, Rows, Columns, Split, Trash2, Settings2 } from 'lucide-react';
import { CircleNotch, CheckCircle, WarningCircle } from '@phosphor-icons/react';
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

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

const MenuBar = ({ editor, saveStatus, layoutMode, setLayoutMode }: { editor: any, saveStatus: 'saved' | 'saving' | 'error', layoutMode: 'horizontal' | 'vertical', setLayoutMode: (m: 'horizontal' | 'vertical') => void }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/50 rounded-t-[2rem]">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setLayoutMode('horizontal')}
        className={layoutMode === 'horizontal' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}
        title="Horizontal Pages"
      >
        <Columns className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setLayoutMode('vertical')}
        className={layoutMode === 'vertical' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}
        title="Vertical Scroll"
      >
        <Rows className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

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
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        disabled={!editor.can().chain().focus().toggleSubscript().run()}
        className={editor.isActive('subscript') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <SubscriptIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        disabled={!editor.can().chain().focus().toggleSuperscript().run()}
        className={editor.isActive('superscript') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <SuperscriptIcon className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-border mx-1" />
      
      <div className="flex items-center gap-1">
        <input
          type="color"
          onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()}
          value={editor.getAttributes('textStyle').color || '#000000'}
          className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
          title="Text Color"
        />
        <input
          type="color"
          onInput={event => editor.chain().focus().toggleHighlight({ color: (event.target as HTMLInputElement).value }).run()}
          value={editor.getAttributes('highlight').color || '#ffff00'}
          className="w-6 h-6 p-0 border-0 rounded cursor-pointer bg-transparent"
          title="Highlight Color"
        />
      </div>

      <div className="w-px h-4 bg-border mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground px-2">
            <span className="text-xs font-medium mr-1">Font</span>
            <ChevronDown className="h-3 w-3" />
          </Button>} />
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Inter').run()}>Sans Serif</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('Merriweather').run()}>Serif</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setFontFamily('JetBrains Mono').run()}>Monospace</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontFamily().run()}>Default</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground px-2">
            <span className="text-xs font-medium mr-1">Size</span>
            <ChevronDown className="h-3 w-3" />
          </Button>} />
        <DropdownMenuContent align="start" className="w-32">
          {['12px', '14px', '16px', '18px', '20px', '24px', '30px'].map(size => (
            <DropdownMenuItem key={size} onClick={() => editor.chain().focus().setFontSize(size).run()}>
              {size}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontSize().run()}>Default</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground px-2">
            <Settings2 className="h-4 w-4 mr-1" />
            <ChevronDown className="h-3 w-3" />
          </Button>} />
        <DropdownMenuContent align="start" className="w-48">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Line Height</div>
          <DropdownMenuItem onClick={() => editor.chain().focus().setLineHeight('1').run()}>Single</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setLineHeight('1.5').run()}>1.5 Lines</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setLineHeight('2').run()}>Double</DropdownMenuItem>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Text Indent</div>
          <DropdownMenuItem onClick={() => editor.chain().focus().setTextIndent('0').run()}>None</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setTextIndent('1rem').run()}>Small</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setTextIndent('2rem').run()}>Large</DropdownMenuItem>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Letter Spacing</div>
          <DropdownMenuItem onClick={() => editor.chain().focus().setLetterSpacing('normal').run()}>Normal</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setLetterSpacing('0.05em').run()}>Wide</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().setLetterSpacing('0.1em').run()}>Extra Wide</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-4 bg-border mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground px-2">
            <Heading1 className="h-4 w-4 mr-1" />
            <ChevronDown className="h-3 w-3" />
          </Button>} />
        <DropdownMenuContent align="start">
          {[1, 2, 3, 4, 5, 6].map((level: any) => (
            <DropdownMenuItem 
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              className={editor.isActive('heading', { level }) ? 'bg-muted' : ''}
            >
              Heading {level}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
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
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        className={editor.isActive('taskList') ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}
      >
        <CheckSquare className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" title="Table Controls">
            <TableIcon className="h-4 w-4" />
          </Button>} />
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Insert Table</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()} disabled={!editor.can().addColumnBefore()}>Add Column Before</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={!editor.can().addColumnAfter()}>Add Column After</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()} disabled={!editor.can().deleteColumn()}>Delete Column</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()} disabled={!editor.can().addRowBefore()}>Add Row Before</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()} disabled={!editor.can().addRowAfter()}>Add Row After</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()} disabled={!editor.can().deleteRow()}>Delete Row</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().mergeCells().run()} disabled={!editor.can().mergeCells()}>Merge Cells</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().splitCell().run()} disabled={!editor.can().splitCell()}>Split Cell</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} disabled={!editor.can().deleteTable()} className="text-destructive">Delete Table</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().setSceneBreak().run()}
        className="text-muted-foreground hover:text-foreground"
        title="Insert Scene Break (***)"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
            <MessageSquareWarning className="h-4 w-4" />
          </Button>} />
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleCallout({ type: 'info' }).run()}>Info Callout</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleCallout({ type: 'success' }).run()}>Success Callout</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleCallout({ type: 'warning' }).run()}>Warning Callout</DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().toggleCallout({ type: 'error' }).run()}>Error Callout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InsertMediaDialog editor={editor} />
      
      <div className="flex-1" />
      <div className="flex items-center gap-2 pr-2">
        <PublishingDirector editor={editor} />
        <WritingAgentsMenu editor={editor} />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="rounded-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
              Quick Agents
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>} />
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Select Agent</div>
            <div className="flex flex-col gap-1 p-1">
              <QuickIdeasDialog contextText={editor.getText()} />
              <ResearchDialog contextText={editor.getText()} />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <GenerateImageDialog onImageGenerated={(url) => {
          editor?.chain().focus().setImage({ src: url, align: 'center', size: 'full' }).run();
        }} />
      </div>
    </div>
  );
};

export default function Canvas({ projectId, userId }: { projectId: string, userId: string }) {
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('horizontal');
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
        placeholder: 'Start writing your book here, or ask the Sidekick to generate an outline...',
      }),
      Focus.configure({
        className: 'has-focus',
        mode: 'all',
      }),
      FontFamily,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Underline,
      Subscript,
      Superscript,
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
      BookTypography,
      SmartPunctuation,
      DropCap,
      PageBreak,
      SceneBreak,
      Callout,
      ChapterHeader,
      EpistolaryLetter,
      TerminalLog,
      BlockEpigraph,
      ManuscriptNote,
      DialogueSpoken,
      InternalMonologue,
      RedactedText,
      SignageText,
      NewspaperClipping,
      LitRPGQuest,
      LitRPGStatBlock,
      ScreenplayDialogue,
      ScreenplayCharacter,
      DedicationFont,
      ProsePoetry,
      TextMessage,
      TextMessageReply,
      GlossaryDefinition,
      TimelineDate,
      FleuronBreak,
      SlashCommands.configure({
        suggestion: slashCommandSuggestion,
      })
    ],
    content: `<h1>Chapter 1: The Beginning</h1><p>Start writing your book here, or ask the Sidekick to generate an outline...</p>`,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg mx-auto focus:outline-none max-w-3xl min-h-[500px] pb-32 font-serif text-gray-900',
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
    let w = 210, h = 297, unit = 'mm';
    if (settings.pageSizeId === 'custom') {
      unit = settings.customUnit || 'mm';
      w = settings.customWidth || 210;
      h = settings.customHeight || 297;
    } else {
      const size = STANDARD_PAGE_SIZES.find(s => s.id === settings.pageSizeId) || STANDARD_PAGE_SIZES[0];
      w = size.width;
      h = size.height;
    }
    const margin = settings.margins || 20;

    return {
      pageWidth: `${w}${unit}`,
      pageHeight: `${h}${unit}`,
      contentWidth: `calc(${w}${unit} - ${margin * 2}mm)`,
      contentHeight: `calc(${h}${unit} - ${margin * 2}mm)`,
      marginVal: `${margin}mm`,
      marginPx: margin // used for gap calculation if needed, but css calc is better
    };
  };

  const { pageWidth, pageHeight, contentWidth, contentHeight, marginVal } = getPageDimensions();

  return (
    <div className={`h-full w-full flex flex-col bg-background rounded-[2rem] print:rounded-none relative overflow-hidden print:overflow-visible print:h-auto layout-${layoutMode}`}>
      <style>
        {`
          @media print {
            @page {
              size: ${pageWidth} ${pageHeight};
              margin: 0;
            }
          }
        `}
      </style>
      <div className="print:hidden">
        <MenuBar editor={editor} saveStatus={saveStatus} layoutMode={layoutMode} setLayoutMode={setLayoutMode} />
        <InlineAIChat editor={editor} />
        <ImageFormatMenu editor={editor} />
        
        {/* Floating Save Indicator */}
        <div className="absolute top-4 right-4 z-50 pointer-events-none flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm text-muted-foreground transition-opacity duration-300">
            {saveStatus === 'saving' && <CircleNotch className="h-4 w-4 animate-spin text-primary" />}
            {saveStatus === 'saved' && <CheckCircle className="h-4 w-4 text-primary" />}
            {saveStatus === 'error' && <WarningCircle className="h-4 w-4 text-destructive" />}
          </div>
        </div>
      </div>

      <div className={`flex-1 relative bg-muted/20 print:p-0 print:bg-white print:overflow-visible print:h-auto ${layoutMode === 'horizontal' ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto overflow-x-hidden'}`}>
        <div className="p-8 lg:p-12 min-w-fit flex items-center justify-center print:hidden absolute top-0 left-0 w-full z-10 pointer-events-none">
          <div className="text-center text-xs uppercase tracking-widest text-muted-foreground bg-transparent border-none">
            {runningHeader || 'Untitled Manuscript'}
          </div>
        </div>
        
        {/* Pagination Container */}
        {layoutMode === 'horizontal' ? (
          <div className="h-full flex flex-col py-8 px-8 lg:px-12 w-max mx-auto">
              <style>
                {`
                  @media print {
                    .print-reset-columns {
                      column-width: auto !important;
                      column-gap: normal !important;
                      height: auto !important;
                      background-image: none !important;
                      padding: 0 !important;
                    }
                  }
                `}
              </style>
              <div 
              className={`transition-all duration-300 relative print:shadow-none print:border-none print:m-0 print-reset-columns page-container texture-${settings.texture || 'none'}`}
              style={{ 
                boxSizing: 'border-box',
                columnWidth: contentWidth,
                columnFill: 'auto',
                columnGap: `calc(${marginVal} * 2 + 40px)`, /* Desk gap between columns spans double margins plus physical desk gap */
                height: pageHeight, /* Border-box height */
                backgroundColor: 'transparent', 
                padding: marginVal,
                '--page-margin': marginVal,
                /* Emulate Canva page boundaries visually by repeating a linear gradient */
                backgroundImage: `linear-gradient(to right, ${settings.pageColor || '#ffffff'} 0px, ${settings.pageColor || '#ffffff'} ${pageWidth}, transparent ${pageWidth}, transparent calc(${pageWidth} + 40px))`,
                backgroundSize: `calc(${pageWidth} + 40px) ${pageHeight}`,
                backgroundRepeat: 'repeat-x',
                boxShadow: 'none',
                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.1))',
                color: '#111827',
              } as React.CSSProperties}
            >
              {settings.showGrid && (
                <div className="absolute inset-0 pointer-events-none opacity-10" style={{ 
                  backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  color: 'var(--foreground)'
                }} />
              )}
              <EditorContent editor={editor} className="h-full" />
            </div>
          </div>
        ) : (
          <div className="py-8 px-8 lg:px-12 w-full flex flex-col items-center">
            <div 
              className={`transition-all duration-300 relative shadow-2xl print:shadow-none print:border-none print:m-0 page-container texture-${settings.texture || 'none'}`}
              style={{ 
                width: pageWidth,
                minHeight: pageHeight,
                backgroundColor: settings.pageColor || '#ffffff',
                padding: marginVal,
                '--page-margin': marginVal,
                color: '#111827',
              } as React.CSSProperties}
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
                  top: marginVal,
                  bottom: marginVal,
                  left: marginVal,
                  right: marginVal,
                }} />
              )}
              <EditorContent editor={editor} className="min-h-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
