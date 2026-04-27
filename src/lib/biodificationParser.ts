import { Block } from './search.worker';

const MAJOR_KEYWORDS = /(chapter|episode|part|preface|index|appendix|prologue|epilogue|introduction)/i;

export function buildSearchIndex(editor: any): Block[] {
  const blocks: Block[] = [];
  
  // Counters for the hierarchy tree
  let majorCount = 0;
  let minor1Count = 0;
  let minor2Count = 0;
  let contentCount = 0;
  
  let currentMajorTitle = 'Unnamed Chapter';
  let currentMinor1Title = '';
  let currentMinor2Title = '';
  
  let currentMajorNumberId = '';
  let currentMinor1NumberId = '';
  let currentMinor2NumberId = '';
  
  let hierarchy: string[] = [];

  editor.state.doc.descendants((node: any, pos: number) => {
    if (node.isText) return false;
    
    if (node.type.name === 'heading') {
      contentCount = 0; // Reset content counter on new heading
      
      const text = node.textContent.trim();
      const level = node.attrs?.level || 1;
      
      const textTokens = text.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
      const isMajorByLevel = level === 1;
      const isMajorByKeyword = MAJOR_KEYWORDS.test(text);
      
      const isMajor = isMajorByLevel || isMajorByKeyword;
      
      if (isMajor) {
        majorCount++;
        minor1Count = 0;
        minor2Count = 0;
        currentMajorTitle = text;
        currentMinor1Title = '';
        currentMinor2Title = '';
        hierarchy = [text];
        
        currentMajorNumberId = `${majorCount}`;
        
        blocks.push({
          id: `pos-${pos}`,
          numberId: currentMajorNumberId,
          category: 'major',
          type: 'heading',
          content: text,
          chapterName: currentMajorTitle,
          chapterNumber: majorCount,
          metaFields: Array.from(new Set(['heading', 'major', ...textTokens])),
          hierarchyPath: [...hierarchy],
          pos
        });
      } else if (level === 2) {
        minor1Count++;
        minor2Count = 0;
        currentMinor1Title = text;
        currentMinor2Title = '';
        hierarchy = currentMajorTitle ? [currentMajorTitle, text] : [text];
        
        currentMinor1NumberId = `${currentMajorNumberId || 0}.${minor1Count}`;
        
        blocks.push({
          id: `pos-${pos}`,
          numberId: currentMinor1NumberId,
          category: 'minor',
          type: 'heading',
          content: text,
          chapterName: currentMajorTitle,
          chapterNumber: majorCount,
          metaFields: Array.from(new Set(['heading', 'minor', 'subtopic', ...textTokens])),
          hierarchyPath: [...hierarchy],
          pos
        });
      } else { // 3 or deeper
        minor2Count++;
        currentMinor2Title = text;
        hierarchy = [currentMajorTitle, currentMinor1Title, text].filter(Boolean);
        
        currentMinor2NumberId = `${currentMinor1NumberId || currentMajorNumberId || 0}.${minor2Count}`;
        
        blocks.push({
          id: `pos-${pos}`,
          numberId: currentMinor2NumberId,
          category: 'minor',
          type: 'heading',
          content: text,
          chapterName: currentMajorTitle,
          chapterNumber: majorCount,
          metaFields: Array.from(new Set(['heading', 'minor', 'microtopic', ...textTokens])),
          hierarchyPath: [...hierarchy],
          pos
        });
      }
    } else {
      let isContent = false;
      let textContent = '';
      let typeName = node.type.name;
      let extraTokens: string[] = [];
      
      if (node.type.name === 'paragraph') {
        textContent = node.textContent.trim();
        if (textContent.trim().length > 0) isContent = true;
      } else if (node.type.name === 'image') {
        textContent = node.attrs?.alt || node.attrs?.title || 'Unnamed Image';
        extraTokens = ['image', 'graphic'];
        isContent = true;
      } else if (node.type.name === 'bulletList' || node.type.name === 'orderedList') {
        textContent = node.textContent.trim();
        if (textContent.trim().length > 0) isContent = true;
        typeName = 'list';
      }
      
      if (isContent) {
        contentCount++;
        let parentNumberId = currentMinor2NumberId || currentMinor1NumberId || currentMajorNumberId || '0';
        const numId = `${parentNumberId}.${contentCount}`;
        
        blocks.push({
          id: `pos-${pos}`,
          numberId: numId,
          category: 'content',
          type: typeName,
          content: textContent,
          chapterName: currentMajorTitle,
          chapterNumber: majorCount,
          metaFields: Array.from(new Set(['content', typeName, ...extraTokens])),
          hierarchyPath: [...hierarchy],
          pos
        });
      }
      
      if (typeName === 'list') {
        return false; // Skip list internals
      }
    }

    return true; // continue traversing
  });

  return blocks;
}
