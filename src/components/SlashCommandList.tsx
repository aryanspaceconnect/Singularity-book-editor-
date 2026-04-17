import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Heading1, Heading2, Heading3, List, ListOrdered, Quote, Type, Scissors, Minus, MessageSquareWarning, BookOpen, Mail, Terminal, FileText, StickyNote, MessageCircle, MessageSquare, ShieldAlert, Subscript, AlignCenterHorizontal, ScrollText, Calendar, Swords, Shield, Clapperboard, Users, Heart } from 'lucide-react';

export const getSuggestionItems = ({ query }: { query: string }) => {
  return [
    {
      title: 'Chapter Header',
      icon: <BookOpen className="w-4 h-4 text-purple-600" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setChapterHeader().run(),
    },
    {
      title: 'Signage Text',
      icon: <AlignCenterHorizontal className="w-4 h-4 text-indigo-600" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setSignageText().run(),
    },
    {
      title: 'Fleuron Break',
      icon: <Minus className="w-4 h-4 text-rose-500" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setFleuronBreak().run(),
    },
    {
      title: 'Epigraph (Quote)',
      icon: <Quote className="w-4 h-4 text-slate-500" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setBlockEpigraph().run(),
    },
    {
      title: 'Prose Poetry',
      icon: <ScrollText className="w-4 h-4 text-teal-600" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setProsePoetry().run(),
    },
    {
      title: 'Epistolary Letter',
      icon: <Mail className="w-4 h-4 text-amber-700" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setEpistolaryLetter().run(),
    },
    {
      title: 'Manuscript Note',
      icon: <StickyNote className="w-4 h-4 text-yellow-500" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setManuscriptNote().run(),
    },
    {
      title: 'Dialogue (Spoken)',
      icon: <MessageCircle className="w-4 h-4 text-blue-500" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setDialogueSpoken().run(),
    },
    {
      title: 'Internal Monologue',
      icon: <MessageSquare className="w-4 h-4 text-slate-400" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setInternalMonologue().run(),
    },
    {
      title: 'Terminal / Matrix Log',
      icon: <Terminal className="w-4 h-4 text-green-500" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setTerminalLog().run(),
    },
    {
      title: 'Text Message (Sent)',
      icon: <MessageSquare className="w-4 h-4 text-sky-500" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setTextMessage().run(),
    },
    {
      title: 'Text Message (Reply)',
      icon: <MessageSquare className="w-4 h-4 text-gray-500" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setTextMessageReply().run(),
    },
    {
      title: 'Redacted Text',
      icon: <ShieldAlert className="w-4 h-4 text-black" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setRedactedText().run(),
    },
    {
      title: 'Newspaper Clipping',
      icon: <FileText className="w-4 h-4 text-slate-700" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setNewspaperClipping().run(),
    },
    {
      title: 'Glossary Definition',
      icon: <List className="w-4 h-4 text-indigo-500" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setGlossaryDefinition().run(),
    },
    {
      title: 'Timeline Date Badge',
      icon: <Calendar className="w-4 h-4 text-blue-900" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setTimelineDate().run(),
    },
    {
      title: 'Dedication Font',
      icon: <Heart className="w-4 h-4 text-rose-400" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setDedicationFont().run(),
    },
    {
      title: 'Screenplay Character',
      icon: <Users className="w-4 h-4 text-purple-500" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setScreenplayCharacter().run(),
    },
    {
      title: 'Screenplay Dialogue',
      icon: <Clapperboard className="w-4 h-4 text-purple-500" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setScreenplayDialogue().run(),
    },
    {
      title: 'LitRPG Quest',
      icon: <Swords className="w-4 h-4 text-amber-500" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setLitRPGQuest().run(),
    },
    {
      title: 'LitRPG Stat Block',
      icon: <Shield className="w-4 h-4 text-slate-700" />,
      command: ({ editor, range }: any) => editor.chain().focus().deleteRange(range).setLitRPGStatBlock().run(),
    },
    {
      title: 'Heading 1',
      icon: <Heading1 className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
      },
    },
    {
      title: 'Heading 2',
      icon: <Heading2 className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
      },
    },
    {
      title: 'Heading 3',
      icon: <Heading3 className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
      },
    },
    {
      title: 'Bullet List',
      icon: <List className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: 'Numbered List',
      icon: <ListOrdered className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: 'Quote',
      icon: <Quote className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: 'Drop Cap',
      icon: <Type className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).toggleDropCap().run();
      },
    },
    {
      title: 'Page Break',
      icon: <Scissors className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setPageBreak().run();
      },
    },
    {
      title: 'Scene Break (***)',
      icon: <Minus className="w-4 h-4" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setSceneBreak().run();
      },
    },
    {
      title: 'Info Callout',
      icon: <MessageSquareWarning className="w-4 h-4 text-blue-500" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setCallout({ type: 'info' }).run();
      },
    },
    {
      title: 'Warning Callout',
      icon: <MessageSquareWarning className="w-4 h-4 text-amber-500" />,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).setCallout({ type: 'warning' }).run();
      },
    },
  ].filter(item => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10);
};

export const SlashCommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="bg-background border border-border rounded-xl shadow-xl overflow-hidden flex flex-col w-64 z-50">
      {props.items.length ? (
        props.items.map((item: any, index: number) => (
          <button
            className={`flex items-center gap-2 px-4 py-2 text-sm text-left w-full ${
              index === selectedIndex ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'
            }`}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item.icon}
            {item.title}
          </button>
        ))
      ) : (
        <div className="px-4 py-2 text-sm text-muted-foreground">No result</div>
      )}
    </div>
  );
});
