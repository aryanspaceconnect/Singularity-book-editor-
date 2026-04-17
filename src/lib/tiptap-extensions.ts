import { Extension, Node, mergeAttributes, InputRule } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import DraggableImageComponent from '../components/DraggableImageComponent';

export const SmartPunctuation = Extension.create({
  name: 'smartPunctuation',

  addInputRules() {
    return [
      // Double space to period + space
      new InputRule({
        find: /([a-zA-Z0-9])  $/,
        handler: ({ state, range, match, commands }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          tr.insertText(`${match[1]}. `, start, end);
        },
      }),
      // Capitalize first letter of sentence
      new InputRule({
        find: /(?:^|[.!?]\s+)([a-z])$/,
        handler: ({ state, range, match, commands }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          tr.insertText(match[0].toUpperCase(), start, end);
        },
      }),
    ]
  },
});

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: 'center',
        parseHTML: element => element.getAttribute('data-align') || 'center',
        renderHTML: attributes => ({ 'data-align': attributes.align }),
      },
      size: {
        default: 'full',
        parseHTML: element => element.getAttribute('data-size') || 'full',
        renderHTML: attributes => ({ 'data-size': attributes.size }),
      },
      positionType: {
        default: 'inline',
        parseHTML: element => element.getAttribute('data-position-type') || 'inline',
        renderHTML: attributes => ({ 'data-position-type': attributes.positionType }),
      },
      x: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-x') || '0', 10),
        renderHTML: attributes => ({ 'data-x': attributes.x }),
      },
      y: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('data-y') || '0', 10),
        renderHTML: attributes => ({ 'data-y': attributes.y }),
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('data-width'),
        renderHTML: attributes => ({ 'data-width': attributes.width }),
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('data-height'),
        renderHTML: attributes => ({ 'data-height': attributes.height }),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DraggableImageComponent);
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
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
    sceneBreak: {
      setSceneBreak: () => ReturnType;
    };
    callout: {
      setCallout: (options?: { type?: 'info' | 'warning' | 'success' | 'error' }) => ReturnType;
      toggleCallout: (options?: { type?: 'info' | 'warning' | 'success' | 'error' }) => ReturnType;
    };
  }
}

export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

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
    return ['hr', mergeAttributes(HTMLAttributes, { class: 'page-break' })];
  },

  addCommands() {
    return {
      setPageBreak: () => ({ chain }) => {
        return chain().insertContent({ type: this.name }).run();
      },
    };
  },
});

export const SceneBreak = Node.create({
  name: 'sceneBreak',
  group: 'block',
  atom: true,

  parseHTML() {
    return [{ tag: 'div.scene-break' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'scene-break my-8 text-center text-2xl tracking-[1em] text-muted-foreground font-serif' }), '***'];
  },

  addCommands() {
    return {
      setSceneBreak: () => ({ chain }) => {
        return chain().insertContent({ type: this.name }).run();
      },
    };
  },
});

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-type') || 'info',
        renderHTML: attributes => {
          return {
            'data-type': attributes.type,
            class: `callout p-4 my-4 rounded-lg border-l-4 ${
              attributes.type === 'warning' ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200' :
              attributes.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-900 dark:text-green-200' :
              attributes.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-900 dark:text-red-200' :
              'bg-blue-500/10 border-blue-500 text-blue-900 dark:text-blue-200'
            }`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'div.callout' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setCallout: (options) => ({ commands }) => {
        return commands.setNode(this.name, options)
      },
      toggleCallout: (options) => ({ commands }) => {
        return commands.toggleNode(this.name, 'paragraph', options)
      },
    }
  },
});
