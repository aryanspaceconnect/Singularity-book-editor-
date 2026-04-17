import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bookNodes: {
      setChapterHeader: () => ReturnType;
      setEpistolaryLetter: () => ReturnType;
      setTerminalLog: () => ReturnType;
      setBlockEpigraph: () => ReturnType;
      setManuscriptNote: () => ReturnType;
      setDialogueSpoken: () => ReturnType;
      setInternalMonologue: () => ReturnType;
      setRedactedText: () => ReturnType;
      setSignageText: () => ReturnType;
      setNewspaperClipping: () => ReturnType;
      setLitRPGQuest: () => ReturnType;
      setLitRPGStatBlock: () => ReturnType;
      setScreenplayDialogue: () => ReturnType;
      setScreenplayCharacter: () => ReturnType;
      setDedicationFont: () => ReturnType;
      setProsePoetry: () => ReturnType;
      setTextMessage: () => ReturnType;
      setTextMessageReply: () => ReturnType;
      setGlossaryDefinition: () => ReturnType;
      setTimelineDate: () => ReturnType;
      setFleuronBreak: () => ReturnType;
    }
  }
}

export const ChapterHeader = Node.create({
  name: 'chapterHeader',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'div[data-type="chapter-header"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'chapter-header', class: 'text-center my-16 border-b border-t py-8 border-gray-300' }), 
      ['h1', { class: 'text-5xl font-serif font-bold tracking-tight mb-2 uppercase' }, 0]
    ];
  },
  addCommands() {
    return {
      setChapterHeader: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const EpistolaryLetter = Node.create({
  name: 'epistolaryLetter',
  group: 'block',
  content: 'block+',
  parseHTML() { return [{ tag: 'div[data-type="epistolary-letter"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'epistolary-letter', class: 'my-8 p-8 bg-amber-50/50 border border-amber-200 shadow-sm font-serif italic text-gray-800 rounded-sm' }), 0];
  },
  addCommands() {
    return {
      setEpistolaryLetter: () => ({ commands }) => commands.wrapIn(this.name)
    }
  }
});

export const TerminalLog = Node.create({
  name: 'terminalLog',
  group: 'block',
  content: 'block+',
  parseHTML() { return [{ tag: 'div[data-type="terminal-log"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'terminal-log', class: 'my-6 p-4 bg-zinc-950 text-green-400 font-mono text-sm rounded shadow-inner border border-zinc-900 border-l-4 border-l-green-500 overflow-x-auto' }), 0];
  },
  addCommands() {
    return {
      setTerminalLog: () => ({ commands }) => commands.wrapIn(this.name)
    }
  }
});

export const BlockEpigraph = Node.create({
  name: 'blockEpigraph',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'blockquote[data-type="epigraph"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes(HTMLAttributes, { 'data-type': 'epigraph', class: 'text-right italic pl-12 pr-6 border-r-4 border-gray-300 border-l-0 text-gray-600 my-8 py-2' }), 0];
  },
  addCommands() {
    return {
      setBlockEpigraph: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const ManuscriptNote = Node.create({
  name: 'manuscriptNote',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'div[data-type="manuscript-note"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'manuscript-note', class: 'float-right w-1/3 ml-6 mb-4 p-4 bg-yellow-100/80 rotate-1 border border-yellow-200 shadow-sm text-sm font-serif text-gray-800' }), 0];
  },
  addCommands() {
    return {
      setManuscriptNote: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const DialogueSpoken = Node.create({
  name: 'dialogueSpoken',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'p[data-type="dialogue-spoken"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'dialogue-spoken', class: 'pl-6 border-l-[3px] border-indigo-400 text-gray-900 font-medium' }), 0];
  },
  addCommands() {
    return {
      setDialogueSpoken: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const InternalMonologue = Node.create({
  name: 'internalMonologue',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'p[data-type="internal-monologue"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'internal-monologue', class: 'pl-8 italic text-slate-500 my-4 tracking-wide' }), 0];
  },
  addCommands() {
    return {
      setInternalMonologue: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const RedactedText = Node.create({
  name: 'redactedText',
  group: 'inline',
  inline: true,
  content: 'text*',
  parseHTML() { return [{ tag: 'span[data-type="redacted-text"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'redacted-text', class: 'bg-zinc-950 text-zinc-950 px-1 py-0.5 rounded-sm hover:text-white transition-colors duration-200 cursor-help print:text-zinc-950 print:bg-zinc-950' }), 0];
  },
  addCommands() {
    return {
      setRedactedText: () => ({ commands }) => commands.setMark(this.name)
    }
  }
});

export const SignageText = Node.create({
  name: 'signageText',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'div[data-type="signage"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'signage', class: 'text-center uppercase font-bold tracking-[0.25em] text-xl border-4 border-double border-zinc-800 p-8 my-8 max-w-sm mx-auto bg-zinc-50' }), 0];
  },
  addCommands() {
    return {
      setSignageText: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const NewspaperClipping = Node.create({
  name: 'newspaperClipping',
  group: 'block',
  content: 'block+',
  parseHTML() { return [{ tag: 'div[data-type="newspaper-clipping"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'newspaper-clipping', class: 'columns-2 gap-6 p-6 border-y-4 border-double border-gray-400 bg-gray-50/50 font-serif text-justify text-sm leading-snug my-8' }), 0];
  },
  addCommands() {
    return {
      setNewspaperClipping: () => ({ commands }) => commands.wrapIn(this.name)
    }
  }
});

export const LitRPGQuest = Node.create({
  name: 'litRPGQuest',
  group: 'block',
  content: 'block+',
  parseHTML() { return [{ tag: 'div[data-type="litrpg-quest"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'litrpg-quest', class: 'my-8 p-0 border border-amber-500 rounded bg-amber-50 shadow max-w-md mx-auto overflow-hidden text-amber-900' }), 
      ['div', { class: 'bg-amber-500 text-white font-bold uppercase tracking-wider text-center p-2 text-sm' }, 'New Quest Discovered'],
      ['div', { class: 'p-4' }, 0]
    ];
  },
  addCommands() {
    return {
      setLitRPGQuest: () => ({ commands }) => commands.wrapIn(this.name)
    }
  }
});

export const LitRPGStatBlock = Node.create({
  name: 'litRPGStatBlock',
  group: 'block',
  content: 'block+',
  parseHTML() { return [{ tag: 'div[data-type="litrpg-stat"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'litrpg-stat', class: 'my-6 p-4 border-2 border-slate-700 bg-slate-900 text-slate-200 font-mono text-sm leading-tight max-w-sm' }), 0];
  },
  addCommands() {
    return {
      setLitRPGStatBlock: () => ({ commands }) => commands.wrapIn(this.name)
    }
  }
});

export const ScreenplayDialogue = Node.create({
  name: 'screenplayDialogue',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'div[data-type="screenplay-dialogue"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'screenplay-dialogue', class: 'font-mono text-center w-2/3 mx-auto my-4' }), 0];
  },
  addCommands() {
    return {
      setScreenplayDialogue: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const ScreenplayCharacter = Node.create({
  name: 'screenplayCharacter',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'div[data-type="screenplay-character"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'screenplay-character', class: 'font-mono text-center uppercase mt-8 mb-1 tracking-widest' }), 0];
  },
  addCommands() {
    return {
      setScreenplayCharacter: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const DedicationFont = Node.create({
  name: 'dedicationFont',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'div[data-type="dedication"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'dedication', class: 'text-center italic mt-32 mb-48 text-xl font-serif text-gray-700 tracking-widest' }), 0];
  },
  addCommands() {
    return {
      setDedicationFont: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const ProsePoetry = Node.create({
  name: 'prosePoetry',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'p[data-type="prose-poetry"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'prose-poetry', class: 'pl-16 whitespace-pre-wrap font-serif italic text-gray-800 leading-relaxed my-6' }), 0];
  },
  addCommands() {
    return {
      setProsePoetry: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const TextMessage = Node.create({
  name: 'textMessage',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'div[data-type="text-message"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'text-message', class: 'px-4 py-2 bg-blue-500 text-white rounded-2xl rounded-br-sm w-fit max-w-[75%] ml-auto my-2 font-sans shadow-sm' }), 0];
  },
  addCommands() {
    return {
      setTextMessage: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const TextMessageReply = Node.create({
  name: 'textMessageReply',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'div[data-type="text-message-reply"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'text-message-reply', class: 'px-4 py-2 bg-gray-200 text-gray-900 rounded-2xl rounded-bl-sm w-fit max-w-[75%] my-2 font-sans shadow-sm' }), 0];
  },
  addCommands() {
    return {
      setTextMessageReply: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const GlossaryDefinition = Node.create({
  name: 'glossaryDefinition',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'p[data-type="glossary-definition"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(HTMLAttributes, { 'data-type': 'glossary-definition', class: 'pl-4 border-l-2 border-gray-300 my-2 text-sm text-gray-700' }), 0];
  },
  addCommands() {
    return {
      setGlossaryDefinition: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const TimelineDate = Node.create({
  name: 'timelineDate',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'div[data-type="timeline-date"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'timeline-date', class: 'inline-block bg-slate-800 text-white uppercase text-xs font-bold tracking-widest px-3 py-1 rounded-full mb-4 mt-8' }), 0];
  },
  addCommands() {
    return {
      setTimelineDate: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});

export const FleuronBreak = Node.create({
  name: 'fleuronBreak',
  group: 'block',
  content: 'inline*',
  parseHTML() { return [{ tag: 'div[data-type="fleuron-break"]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'fleuron-break', class: 'text-center my-12 text-2xl text-gray-400 select-none' }), '❦ ❦ ❦'];
  },
  addCommands() {
    return {
      setFleuronBreak: () => ({ commands }) => commands.setNode(this.name)
    }
  }
});
