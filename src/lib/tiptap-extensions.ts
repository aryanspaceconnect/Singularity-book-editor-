import { Extension, Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bookTypography: {
      setTextIndent: (indent: string) => ReturnType;
      setLineHeight: (height: string) => ReturnType;
      setWordSpacing: (spacing: string) => ReturnType;
      setLetterSpacing: (spacing: string) => ReturnType;
    };
    dropCap: {
      toggleDropCap: () => ReturnType;
    };
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const BookTypography = Extension.create({
  name: 'bookTypography',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          textIndent: {
            default: null,
            parseHTML: element => element.style.textIndent || null,
            renderHTML: attributes => {
              if (!attributes.textIndent) {
                return {};
              }
              return {
                style: `text-indent: ${attributes.textIndent}`,
              };
            },
          },
          lineHeight: {
            default: null,
            parseHTML: element => element.style.lineHeight || null,
            renderHTML: attributes => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
          wordSpacing: {
            default: null,
            parseHTML: element => element.style.wordSpacing || null,
            renderHTML: attributes => {
              if (!attributes.wordSpacing) {
                return {};
              }
              return {
                style: `word-spacing: ${attributes.wordSpacing}`,
              };
            },
          },
          letterSpacing: {
            default: null,
            parseHTML: element => element.style.letterSpacing || null,
            renderHTML: attributes => {
              if (!attributes.letterSpacing) {
                return {};
              }
              return {
                style: `letter-spacing: ${attributes.letterSpacing}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextIndent: (indent: string) => ({ commands }) => {
        return commands.updateAttributes('paragraph', { textIndent: indent });
      },
      setLineHeight: (height: string) => ({ commands }) => {
        return commands.updateAttributes('paragraph', { lineHeight: height });
      },
      setWordSpacing: (spacing: string) => ({ commands }) => {
        return commands.updateAttributes('paragraph', { wordSpacing: spacing });
      },
      setLetterSpacing: (spacing: string) => ({ commands }) => {
        return commands.updateAttributes('paragraph', { letterSpacing: spacing });
      },
    };
  },
});

export const DropCap = Extension.create({
  name: 'dropCap',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          dropCap: {
            default: false,
            parseHTML: element => element.classList.contains('drop-cap'),
            renderHTML: attributes => {
              if (!attributes.dropCap) {
                return {};
              }
              return {
                class: 'drop-cap',
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      toggleDropCap: () => ({ editor, commands }) => {
        const isActive = editor.isActive('paragraph', { dropCap: true });
        if (isActive) {
          return commands.updateAttributes('paragraph', { dropCap: false });
        }
        return commands.updateAttributes('paragraph', { dropCap: true });
      },
    };
  },
});

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,

  parseHTML() {
    return [{ tag: 'hr.page-break' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, { class: 'page-break my-12 border-t-2 border-dashed border-zinc-300 dark:border-zinc-700 relative before:content-["PAGE_BREAK"] before:absolute before:left-1/2 before:-translate-x-1/2 before:-top-3 before:bg-white dark:before:bg-black before:px-2 before:text-xs before:text-zinc-400 before:font-mono' })];
  },

  addCommands() {
    return {
      setPageBreak: () => ({ chain }) => {
        return chain().insertContent({ type: this.name }).run();
      },
    };
  },
});
