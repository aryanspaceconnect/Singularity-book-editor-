import { Block } from './search.worker';

export function buildSearchIndex(editor: any): Block[] {
  const blocks: Block[] = [];
  let currentChapterNumber = 0;
  let currentChapterName = 'Unnamed Chapter';
  let hierarchy: string[] = [];

  editor.state.doc.descendants((node: any, pos: number) => {
    if (node.isText) return false; // Text nodes are handled by their parents
    
    if (node.type.name === 'heading') {
      const text = node.textContent;
      if (node.attrs?.level === 1 || node.attrs?.level === 2) {
        currentChapterNumber++;
        currentChapterName = text;
        hierarchy = [text];
      } else {
        hierarchy = [currentChapterName, text];
      }
      
      blocks.push({
        id: `pos-${pos}`,
        type: 'heading',
        content: text,
        chapterName: currentChapterName,
        chapterNumber: currentChapterNumber,
        hierarchyPath: [...hierarchy],
        pos
      });
    } else if (node.type.name === 'paragraph') {
      const text = node.textContent;
      if (text.trim().length > 0) {
        blocks.push({
          id: `pos-${pos}`,
          type: 'paragraph',
          content: text,
          chapterName: currentChapterName,
          chapterNumber: currentChapterNumber,
          hierarchyPath: [...hierarchy],
          pos
        });
      }
    } else if (node.type.name === 'image') {
      const altText = node.attrs?.alt || node.attrs?.title || 'Unnamed Image';
      blocks.push({
        id: `pos-${pos}`,
        type: 'image',
        content: altText,
        chapterName: currentChapterName,
        chapterNumber: currentChapterNumber,
        hierarchyPath: [...hierarchy],
        pos
      });
    } else if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
        const text = node.textContent;
        if (text.trim().length > 0) {
            blocks.push({
                id: `pos-${pos}`,
                type: 'list',
                content: text,
                chapterName: currentChapterName,
                chapterNumber: currentChapterNumber,
                hierarchyPath: [...hierarchy],
                pos
            });
        }
        return false; // Don't traverse inside list items since we grab the text here at the macro level
    }

    return true; // continue traversing
  });

  return blocks;
}
