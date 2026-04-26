import { collection, doc, setDoc, getDocs, query, where, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export interface BlockNode {
  id: string;      // e.g., "chapter_1_quantum_physics"
  sub: string[];   // e.g., ["3.1", "3.1.1", "3.1.2"]
  mic: Record<string, string>; // e.g., {"3.1": "content...", "3.1.1": "other content..."}
  projectId: string;
  serialNumber: string; // e.g., "1"
}

export interface SearchQuery {
  projectId: string;
  serialNumber?: string;
  id?: string;
  keywords?: string[];
  headingConcepts?: string[];
  mode?: number; // the paragraph selector (e.g., 2 means +2 preceding, +2 succeeding paragraphs)
  directoryMode?: boolean; // if true, returns just the directory structure without contents
}

/**
 * Normalizes text to create an ID.
 * E.g., "Chapter 1 Quantum Physics" -> "chapter_1_quantum_physics"
 */
function createId(text: string, serial: string): string {
  let cleanText = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
  return `chapter_${serial}_${cleanText}`;
}

/**
 * Extremely basic blockifier parser.
 * Realistically, this would parse Markdown or similar.
 * For now, we assume simple heading markers like "# Chapter 1 Title" or "## 3.1 Subtopic"
 */
export async function blockifyDocument(content: string, projectId: string) {
  const lines = content.split('\n');
  let currentMainBlock: BlockNode | null = null;
  let currentSubSerial = '';
  
  const blocks: BlockNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect Chapter / Main block (e.g., "# Chapter 1 Quantum Physics" or "Chapter 1")
    // Let's assume lines starting with "# " are main blocks.
    if (line.startsWith('# ')) {
      if (currentMainBlock) {
        blocks.push(currentMainBlock);
      }
      const title = line.replace('# ', '').trim();
      
      // Try to extract serial number assuming format "# 1 Quantum Physics" or "# Chapter 1 Quantum Physics"
      const serialMatch = title.match(/^(?:Chapter )?(\d+)/i);
      const serial = serialMatch ? serialMatch[1] : `${blocks.length + 1}`;

      currentMainBlock = {
        id: createId(title, serial),
        sub: [],
        mic: {},
        projectId,
        serialNumber: serial,
      };
      currentSubSerial = serial; // Fallback if no sub-section
    } 
    // Detect sub-sections (e.g., "## 3.1", "### 3.1.1")
    else if (line.startsWith('## ') || line.startsWith('### ')) {
      const isH3 = line.startsWith('### ');
      const title = line.replace(/#+ /, '').trim();
      const serialMatch = title.match(/^([\d\.]+)/);
      
      if (serialMatch && currentMainBlock) {
        currentSubSerial = serialMatch[1];
        if (!currentMainBlock.sub.includes(currentSubSerial)) {
           currentMainBlock.sub.push(currentSubSerial);
        }
        currentMainBlock.mic[currentSubSerial] = title.replace(currentSubSerial, '').trim();
      }
    } 
    else if (line.trim().length > 0) {
      if (currentMainBlock) {
        // Find existing content or init
        if (!currentMainBlock.mic[currentSubSerial]) {
          currentMainBlock.mic[currentSubSerial] = '';
          if (!currentMainBlock.sub.includes(currentSubSerial)) {
             currentMainBlock.sub.push(currentSubSerial);
          }
        } else {
          currentMainBlock.mic[currentSubSerial] += '\n';
        }
        currentMainBlock.mic[currentSubSerial] += line.trim();
      }
    }
  }

  if (currentMainBlock) {
    blocks.push(currentMainBlock);
  }

  // Save to db
  const batch = writeBatch(db);
  for (const block of blocks) {
    const docRef = doc(collection(db, 'projects', projectId, 'blocks'), block.id);
    batch.set(docRef, { ...block });
  }
  await batch.commit();

  return blocks;
}

export async function searchBlocks(queryConfig: SearchQuery) {
  const { projectId, id, serialNumber, keywords, mode = 0, directoryMode } = queryConfig;

  let q = query(collection(db, 'projects', projectId, 'blocks'));
  
  // If we have specific ID, just get it
  if (id) {
    q = query(q, where('id', '==', id));
  } else if (serialNumber) {
    q = query(q, where('serialNumber', '==', serialNumber.split('.')[0]));
  }

  const querySnapshot = await getDocs(q);
  const results = [];

  for (const doc of querySnapshot.docs) {
    const data = doc.data() as BlockNode;

    // Directory mode: Skip keyword filtering and content
    if (directoryMode) {
      results.push({
        id: data.id,
        sub: data.sub
      });
      continue;
    }

    // Filter by keywords inside mic
    if (keywords && keywords.length > 0) {
      let matched = false;
      const loweredKeywords = keywords.map(k => k.toLowerCase());
      
      for (const [subId, content] of Object.entries(data.mic)) {
         const loweredContent = content.toLowerCase();
         if (loweredKeywords.some(keyword => loweredContent.includes(keyword))) {
           matched = true;
           // In a full implementation, we'd find the exact paragraph of `content` 
           // and extract `mode` preceding/succeeding paragraphs around it.
           // For simplicity in this structure, we'll return the sub-block and it's neighbors based on mode.
           break;
         }
      }
      if (!matched) continue;
    }
    
    // Apply "mode": if the query meant to extract specific paragraphs.
    // Given the structure, "mic" maps "3.1" to its paragraph. So we can use the keys of `sub` to represent index locations.
    let enrichedMic = { ...data.mic };
    if (mode > 0 && serialNumber && data.mic[serialNumber]) {
      const idx = data.sub.indexOf(serialNumber);
      if (idx !== -1) {
         let selectedKeys = [];
         let startIdx = Math.max(0, idx - mode);
         let endIdx = Math.min(data.sub.length - 1, idx + mode);
         for(let i = startIdx; i <= endIdx; i++) {
            selectedKeys.push(data.sub[i]);
         }
         enrichedMic = {};
         for (const k of selectedKeys) {
            enrichedMic[k] = data.mic[k];
         }
      }
    }

    results.push({
      id: data.id,
      sub: data.sub,
      mic: enrichedMic
    });
  }

  return results;
}
