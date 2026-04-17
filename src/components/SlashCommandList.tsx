import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Heading1, Heading2, Heading3, List, ListOrdered, Quote, Type, Scissors, Minus, MessageSquareWarning } from 'lucide-react';

export const getSuggestionItems = ({ query }: { query: string }) => {
  return [
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
