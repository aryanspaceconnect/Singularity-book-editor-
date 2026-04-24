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
import { Loading02Icon as Loader2, TextBoldIcon as Bold, TextItalicIcon as Italic, TextStrikethroughIcon as Strikethrough, Heading01Icon as Heading1, Heading02Icon as Heading2, Heading03Icon as Heading3, Heading04Icon as Heading4, Heading05Icon as Heading5, Heading02Icon as Heading6, ListViewIcon as List, LeftToRightListNumberIcon as ListOrdered, QuoteDownIcon as Quote, TextAlignLeftIcon as AlignLeft, TextAlignCenterIcon as AlignCenter, TextAlignRightIcon as AlignRight, TextAlignJustifyCenterIcon as AlignJustify, TextIcon as Type, Scissor01Icon as Scissors, CheckmarkBadge01Icon as Check, Alert01Icon as AlertCircle, Download01Icon as Download, TextUnderlineIcon as UnderlineIcon, TextSubscriptIcon as SubscriptIcon, TextSuperscriptIcon as SuperscriptIcon, Link01Icon as LinkIcon, CheckmarkBadge01Icon as CheckSquare, Table01Icon as TableIcon, PaintBoardIcon as Palette, AiMagicIcon as Highlighter, Comment01Icon as MessageSquareWarning, MinusSignIcon as Minus, Layout01Icon as Rows, Layout03Icon as Columns, ArrowLeftRightIcon as Split, Delete02Icon as Trash2, Settings02Icon as Settings2, PlusSignIcon as Plus, ArrowTurnBackwardIcon as Undo, ArrowTurnForwardIcon as Redo, MagicWand01Icon as Sparkles, MagicWand02Icon as Wand2 } from 'hugeicons-react';
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

import { Ruler } from './Ruler';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { ArrowDown01Icon as ChevronDown } from 'hugeicons-react';
import { useAI } from '../lib/ai-context';
import SearchWorker from '../lib/search.worker?worker';
import { buildSearchIndex } from '../lib/biodificationParser';
import { Block } from '../lib/search.worker';
import Omnibar from './Omnibar';


const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro',
  'Merriweather', 'Playfair Display', 'Lora', 'PT Serif',
  'JetBrains Mono', 'Fira Code', 'Inconsolata', 'Space Mono',
  'Oswald', 'Raleway', 'Poppins', 'Nunito', 'Ubuntu',
  'Dancing Script', 'Pacifico', 'Caveat', 'Satisfy'
];

export default function Canvas({ projectId, userId }: { projectId: string, userId: string }) {
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>('vertical');
  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { ai } = useAI();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Biodification Search System
  const searchWorkerRef = useRef<Worker | null>(null);
  const [isOmnibarOpen, setIsOmnibarOpen] = useState(false);

  useEffect(() => {
    searchWorkerRef.current = new SearchWorker();

    const handleCmdK = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOmnibarOpen(prev => !prev);
      }
    };
    
    const handleOpenSearch = () => {
      setIsOmnibarOpen(true);
    };

    window.addEventListener('keydown', handleCmdK);
    window.addEventListener('open-search', handleOpenSearch);

    return () => {
      window.removeEventListener('keydown', handleCmdK);
      window.removeEventListener('open-search', handleOpenSearch);
      if (searchWorkerRef.current) {
        searchWorkerRef.current.terminate();
      }
    };
  }, []);

  const handleOmnibarSelect = (block: Block) => {
    setIsOmnibarOpen(false);
    if (editor && block.pos !== undefined) {
      editor.commands.setTextSelection(block.pos);
      editor.commands.focus();
      editor.commands.scrollIntoView();
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2.5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.25));
  const handleZoomReset = () => setZoom(1);

  // AI Context Menu Actions
  const handleContextAI = async (prompt: string, editor: any) => {
    if (!editor || isProcessing) return;
    setIsProcessing(true);
    
    try {
      const { from, to, empty } = editor.state.selection;
      let textToProcess = '';
      let replaceFrom = from;
      let replaceTo = to;
      
      if (!empty) {
        textToProcess = editor.state.doc.textBetween(from, to, '\n');
      } else {
        const $from = editor.state.selection.$from;
        const depth = $from.depth;
        if (depth > 0) {
          replaceFrom = $from.before(depth);
          replaceTo = $from.after(depth);
          textToProcess = editor.state.doc.textBetween($from.start(depth), $from.end(depth), '\n');
        }
      }

      if (!textToProcess.trim()) return;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `${prompt}\n\nText:\n${textToProcess}`,
        config: {
          systemInstruction: "You are an expert writing assistant embedded in a frictionless context menu. Return ONLY the modified text formatting in valid HTML. Do NOT include markdown blocks. Do not add conversational filler."
        }
      });

      if (response.text) {
        const cleanHtml = response.text.replace(/^```html\n?/, '').replace(/\n?```$/, '');
        editor.chain().focus().deleteRange({ from: replaceFrom, to: replaceTo }).insertContent(cleanHtml).run();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Horizontal scroll mapping for mouse wheels
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || layoutMode !== 'horizontal') return;

    const handleWheel = (e: WheelEvent) => {
      // If user is primarily scrolling vertically with a standard mouse wheel, convert to horizontal scroll
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        container.scrollLeft += e.deltaY; // Smooth layout scroll translation
      }
    };
    
    // Explicitly set passive to false so preventDefault smoothly blocks native vertical scrolling bounce
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [layoutMode]);

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const docRef = doc(db, 'projects', projectId, 'canvas', 'main');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [settings, setSettings] = useState<any>(null);
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollX(e.currentTarget.scrollLeft);
    setScrollY(e.currentTarget.scrollTop);
  };

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
        placeholder: 'Write the sentence you have never dared to write...',
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
    content: ``,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg focus:outline-none font-serif text-gray-900 mx-auto print:max-w-none print:w-full',
      },
    },
    onUpdate: ({ editor, transaction }) => {
      // Clear AI highlights if user modifies anything
      if (transaction.docChanged && !transaction.getMeta('aiUpdate')) {
        let hasHighlights = false;
        editor.state.doc.descendants((node) => {
          if (node.marks.find(m => m.type.name === 'highlight' && m.attrs.color === '#fcd34d33')) {
             hasHighlights = true;
          }
        });

        if (hasHighlights) {
           editor.commands.unsetHighlight();
        }
      }

      // Index for search omnibar
      if (searchWorkerRef.current) {
        const blocks = buildSearchIndex(editor);
        searchWorkerRef.current.postMessage({
          action: 'INDEX',
          payload: { blocks }
        });
      }

      // Save to firestore with debounce
      setSaveStatus('saving');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        const json = editor.getJSON();
        const html = editor.getHTML();
        const text = editor.getText();
        setDoc(docRef, {
          content: JSON.stringify(json),
          htmlContent: html,
          textContent: text,
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
  
  const MenuBar = ({ editor, saveStatus, layoutMode, setLayoutMode, settings }: { editor: any, saveStatus: 'saved' | 'saving' | 'error', layoutMode: 'horizontal' | 'vertical', setLayoutMode: (m: 'horizontal' | 'vertical') => void, settings: any }) => {
    if (!editor) return null;

    const currentFont = editor.getAttributes('textStyle').fontFamily || 'Font';

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
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground px-2">
              <span className="text-xs font-medium mr-1 truncate max-w-[90px]" style={{ fontFamily: currentFont !== 'Font' ? currentFont : 'inherit' }}>
                {currentFont.replace(/['"]/g, '')}
              </span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 max-h-[300px] overflow-y-auto">
            {GOOGLE_FONTS.map(font => (
              <DropdownMenuItem 
                key={font} 
                onClick={() => editor.chain().focus().setFontFamily(font).run()}
                style={{ fontFamily: font }}
              >
                {font}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontFamily().run()}>Default</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground px-2">
              <span className="text-xs font-medium mr-1">Size</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
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
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground px-2">
              <Settings2 className="h-4 w-4 mr-1" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
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
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground px-2">
              <Heading1 className="h-4 w-4 mr-1" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
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
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" title="Table Controls">
              <TableIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
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
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
              <MessageSquareWarning className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
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
          <PublishingDirector editor={editor} bookPlan={settings.bookPlan} />
          <WritingAgentsMenu editor={editor} bookPlan={settings.bookPlan} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
                Quick Agents
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
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

  useEffect(() => {
    if (!editor) return;

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.runningHeader !== undefined) {
          setRunningHeader(data.runningHeader);
        }
        
        const contentToLoad = data.previewContent || data.content;
        const _isPreview = !!data.previewContent;
        setIsPreviewMode(_isPreview);
        editor.setEditable(!_isPreview, false); // Make readonly if previewing

        if (contentToLoad) {
          if (contentToLoad.trim().startsWith('<')) {
            // It's HTML
            if (editor.getHTML() !== contentToLoad && !editor.isFocused) {
              editor.commands.setContent(contentToLoad, { emitUpdate: false });
            }
          } else {
            // It's JSON
            try {
              const parsed = JSON.parse(contentToLoad);
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
        <MenuBar editor={editor} saveStatus={saveStatus} layoutMode={layoutMode} setLayoutMode={setLayoutMode} settings={settings} />
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

      <div className="flex-1 relative flex overflow-hidden">
        {/* Vertical Ruler */}
        <div className="w-[30px] border-r border-border shrink-0 bg-background z-20 print:hidden hidden sm:block">
          <Ruler orientation="vertical" zoom={zoom} scrollOffset={scrollY} pageMargin={settings.margins || 20} pageWidth={0} />
        </div>

        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Horizontal Ruler */}
          <div className="h-[30px] border-b border-border shrink-0 bg-background z-20 print:hidden hidden sm:block">
            <Ruler orientation="horizontal" zoom={zoom} scrollOffset={scrollX} pageMargin={settings.margins || 20} pageWidth={0} />
          </div>

          <ContextMenu>
            <ContextMenuTrigger 
              ref={scrollContainerRef} 
              onScroll={handleScroll}
              className={`flex-1 relative bg-muted/20 print:p-0 print:bg-white print:overflow-visible print:h-auto ${layoutMode === 'horizontal' ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto overflow-x-hidden'} ${isPreviewMode ? 'ring-inset ring-4 ring-amber-500/50 bg-amber-500/5' : ''}`}
            >
            
            {isPreviewMode && (
              <div className="sticky top-4 z-50 pointer-events-none flex justify-center w-full">
                <div className="bg-amber-500 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-2xl flex items-center gap-3 border-2 border-amber-400">
                  <div className="w-2.5 h-2.5 rounded-full bg-white animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  Previewing Actions (Confirm or Reject via Sidekick)
                </div>
              </div>
            )}
            
            {/* Pagination Container */}
            {layoutMode === 'horizontal' ? (
              <div className="h-full flex flex-col py-8 px-8 lg:px-12 w-max mx-auto shadow-none">
                  <style>
                    {`
                      @media print {
                        @page {
                          /* Native printer margins for perfect structural layout */
                          margin: ${marginVal}; 
                          size: ${pageWidth} ${pageHeight};
                        }
                        html, body {
                          background: white !important;
                          margin: 0 !important;
                          padding: 0 !important;
                        }
                        .print-reset-columns {
                          background-image: none !important;
                          box-shadow: none !important;
                          width: 100% !important;
                          overflow: visible !important;
                          display: block !important;
                          zoom: 1 !important;
                        }
                        .print-reset-columns .ProseMirror {
                           column-width: auto !important;
                           column-gap: normal !important;
                           height: auto !important;
                        }
                      }

                      /* Force multi-column onto ProseMirror */
                      .force-multi-column > div > .ProseMirror {
                        column-width: ${contentWidth} !important;
                        column-gap: calc(${marginVal} * 2 + 40px) !important;
                        height: ${contentHeight} !important;
                        column-fill: auto !important;
                        min-height: ${contentHeight} !important;
                        max-height: ${contentHeight} !important;
                        box-sizing: border-box;
                        overflow-y: hidden !important; 
                      }
                    `}
                  </style>
                  <div 
                  className={`transition-all duration-300 relative print:shadow-none print:border-none print:m-0 print-reset-columns force-multi-column page-container texture-${settings.texture || 'none'}`}
                  style={{ 
                    boxSizing: 'content-box',
                    backgroundColor: 'transparent', 
                    paddingLeft: marginVal,
                    paddingRight: marginVal,
                    paddingTop: marginVal,
                    paddingBottom: marginVal,
                    '--page-margin': marginVal,
                    /* Emulate perfect paper physical bounds */
                    backgroundImage: `repeating-linear-gradient(to right, ${settings.pageColor || '#ffffff'} 0px, ${settings.pageColor || '#ffffff'} ${pageWidth}, transparent ${pageWidth}, transparent calc(${pageWidth} + 40px))`,
                    backgroundSize: `calc(${pageWidth} + 40px) 100%`,
                    backgroundRepeat: 'repeat-x',
                    boxShadow: 'none',
                    filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.1))',
                    color: '#111827',
                    width: 'max-content',
                    minWidth: pageWidth,
                    height: contentHeight, // Keep outer div tall so background repeats correctly
                    zoom: zoom,
                  } as React.CSSProperties}
                >
                  <div className="absolute inset-0 pointer-events-none print:hidden flex">
                     {/* Margin Visual Guides (Left/Right) */}
                     <div style={{ width: marginVal, height: '100%', borderRight: '1px dashed rgba(99, 102, 241, 0.4)' }} />
                     <div style={{ flex: 1 }} />
                     <div style={{ width: `calc(${marginVal} + 40px)`, height: '100%', borderLeft: '1px dashed rgba(99, 102, 241, 0.4)' }} />
                  </div>
                  <div className="absolute inset-0 pointer-events-none print:hidden flex flex-col">
                     {/* Margin Visual Guides (Top/Bottom) */}
                     <div style={{ height: marginVal, width: '100%', borderBottom: '1px dashed rgba(99, 102, 241, 0.4)' }} />
                     <div style={{ flex: 1 }} />
                     <div style={{ height: marginVal, width: '100%', borderTop: '1px dashed rgba(99, 102, 241, 0.4)' }} />
                  </div>
                  
                  {settings.showGrid && (
                    <div className="absolute inset-0 pointer-events-none opacity-10" style={{ 
                      backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                      color: 'var(--foreground)'
                    }} />
                  )}
                  <EditorContent editor={editor} className="h-full print:h-auto" />
                </div>
              </div>
            ) : (
              <div className="py-8 px-8 lg:px-12 w-full flex flex-col items-center">
                 <style>
                    {`
                      @media print {
                        @page {
                          /* Native printer pagination mapping */
                          margin: ${marginVal}; 
                          size: ${pageWidth} ${pageHeight};
                        }
                        html, body {
                          background: white !important;
                          margin: 0 !important;
                          padding: 0 !important;
                        }
                      }
                    `}
                  </style>
                <div 
                  className={`transition-all duration-300 relative shadow-2xl print:shadow-none print:border-none print:m-0 print:p-0 print:w-full print:min-h-0 page-container texture-${settings.texture || 'none'}`}
                  style={{ 
                    width: pageWidth,
                    minHeight: pageHeight,
                    backgroundColor: settings.pageColor || '#ffffff',
                    padding: marginVal,
                    '--page-margin': marginVal,
                    color: '#111827',
                    boxSizing: 'border-box',
                    zoom: zoom,
                  } as React.CSSProperties}
                >
                  <div className="absolute inset-0 pointer-events-none print:hidden flex">
                     <div style={{ width: marginVal, height: '100%', borderRight: '1px dashed rgba(99, 102, 241, 0.4)' }} />
                     <div style={{ flex: 1 }} />
                     <div style={{ width: marginVal, height: '100%', borderLeft: '1px dashed rgba(99, 102, 241, 0.4)' }} />
                  </div>
                  <div className="absolute inset-0 pointer-events-none print:hidden flex flex-col">
                     <div style={{ height: marginVal, width: '100%', borderBottom: '1px dashed rgba(99, 102, 241, 0.4)' }} />
                     <div style={{ flex: 1 }} />
                     <div style={{ height: marginVal, width: '100%', borderTop: '1px dashed rgba(99, 102, 241, 0.4)' }} />
                  </div>
                  {settings.showGrid && (
                    <div className="absolute inset-0 pointer-events-none opacity-10" style={{ 
                      backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                      color: 'var(--foreground)'
                    }} />
                  )}
                  <EditorContent editor={editor} className="min-h-full print:min-h-0" />
                </div>
              </div>
            )}
        </ContextMenuTrigger>

        <ContextMenuContent className="w-64 z-50">
          <ContextMenuItem onClick={() => handleContextAI('Improve this text to be more engaging and flow better.', editor)} disabled={isProcessing}>
            <Sparkles className="h-4 w-4 mr-2" />
            {isProcessing ? 'AI is thinking...' : 'Improve Writing'}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleContextAI('Continue writing from this point, maintaining the tone and pushing the narrative forward.', editor)} disabled={isProcessing}>
            <Wand2 className="h-4 w-4 mr-2" />
            Continue Story
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleContextAI('Make this text more concise. Remove fluff.', editor)} disabled={isProcessing}>
            <Scissors className="h-4 w-4 mr-2" />
            Make Concise
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleContextAI('Fix any grammatical issues, typos, and improve punctuation.', editor)} disabled={isProcessing}>
            <Check className="h-4 w-4 mr-2" />
            Fix Grammar & Syntax
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => document.execCommand('copy')}>
            Copy
          </ContextMenuItem>
          <ContextMenuItem onClick={() => document.execCommand('cut')}>
            Cut
          </ContextMenuItem>
          <ContextMenuItem onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            Undo
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Omnibar 
        isOpen={isOmnibarOpen}
        onClose={() => setIsOmnibarOpen(false)}
        workerRef={searchWorkerRef}
        onSelectCallback={handleOmnibarSelect}
      />

      {/* Floating Action Bar (Zoom, Undo, Redo) */}
      <div className="absolute bottom-6 right-6 z-50 print:hidden flex items-center gap-1 bg-background/40 backdrop-blur-md border border-border shadow-sm rounded-full p-1.5 opacity-20 hover:opacity-100 transition-opacity duration-300">
        <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} className="h-8 w-8 rounded-full">
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} className="h-8 w-8 rounded-full">
          <Redo className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8 rounded-full">
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium w-12 text-center cursor-pointer select-none text-foreground" onClick={handleZoomReset} title="Reset Zoom">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8 rounded-full">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      </div>
     </div>
    </div>
  );
}
