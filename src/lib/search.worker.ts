export interface Block {
  id: string;
  type: string;
  content: string;
  chapterName?: string;
  chapterNumber?: number;
  hierarchyPath?: string[];
  pos?: number;
}

// In-memory Elasticsearch-like architecture
const blocksMap = new Map<string, Block>();
const invertedIndex = new Map<string, { docId: string; tf: number }[]>();
const docLengths = new Map<string, number>();
let averageDocLength = 0;
let totalDocs = 0;

const STOP_WORDS = new Set(['the', 'is', 'at', 'which', 'on', 'in', 'and', 'a', 'to', 'of', 'for', 'it', 'with', 'as']);

function tokenize(text: string): string[] {
  if (!text) return [];
  // Lowercase, remove non-alphanumeric, split by whitespace
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  return words.filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function calculateBM25Score(docId: string, tokens: string[]): number {
  const k1 = 1.2;
  const b = 0.75;
  const docLen = docLengths.get(docId) || 0;
  
  let score = 0;
  for (const token of tokens) {
    const postings = invertedIndex.get(token);
    if (!postings) continue;
    
    // Calculate IDF
    const df = postings.length;
    const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
    
    // Find TF in this doc
    const posting = postings.find(p => p.docId === docId);
    const tf = posting ? posting.tf : 0;
    
    if (tf > 0) {
      const termScore = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / averageDocLength)));
      score += idf * termScore;
    }
  }
  return score;
}

self.onmessage = async (e) => {
  if (!e.data) return;
  const { action, payload, queryId } = e.data;
  
  switch (action) {
    case 'INDEX':
      try {
        // Clear existing index
        blocksMap.clear();
        invertedIndex.clear();
        docLengths.clear();
        totalDocs = 0;
        let totalLen = 0;

        const blocks: Block[] = payload.blocks || [];
        totalDocs = blocks.length;

        for (const block of blocks) {
          blocksMap.set(block.id, block);
          
          // Combine searchable text fields
          const searchableText = `${block.content || ''} ${block.chapterName || ''} ${block.type || ''}`;
          const tokens = tokenize(searchableText);
          
          docLengths.set(block.id, tokens.length);
          totalLen += tokens.length;
          
          // Count term frequencies
          const termFreqs = new Map<string, number>();
          for (const token of tokens) {
            termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
          }
          
          // Add to inverted index
          for (const [term, tf] of termFreqs.entries()) {
            if (!invertedIndex.has(term)) {
              invertedIndex.set(term, []);
            }
            invertedIndex.get(term)!.push({ docId: block.id, tf });
          }
        }
        
        averageDocLength = totalDocs > 0 ? totalLen / totalDocs : 0;
        
        self.postMessage({ action: 'INDEX_COMPLETE', status: 'success', blockCount: totalDocs });
      } catch (err) {
        self.postMessage({ action: 'INDEX_ERROR', status: 'error', error: String(err) });
      }
      break;

    case 'SEARCH':
      if (!payload.query || payload.query.trim() === '') {
        self.postMessage({ action: 'SEARCH_RESULTS', queryId, results: [] });
        return;
      }
      
      try {
        const queryTokens = tokenize(payload.query);
        const docScores = new Map<string, number>();
        
        // Find docs containing at least one query token
        const matchDocs = new Set<string>();
        for (const token of queryTokens) {
          // exact term match
          const exactPostings = invertedIndex.get(token) || [];
          exactPostings.forEach(p => matchDocs.add(p.docId));
          
          // prefix matching (fuzziness approximation)
          for (const term of invertedIndex.keys()) {
            if (term.startsWith(token) && term !== token) {
              const prefixPostings = invertedIndex.get(term) || [];
              prefixPostings.forEach(p => matchDocs.add(p.docId));
            }
          }
        }
        
        // Calculate scores
        for (const docId of matchDocs) {
           docScores.set(docId, calculateBM25Score(docId, queryTokens));
        }
        
        // Filter and sort results
        const minScoreThreshold = 0.1; // Only return relevant results
        const results = Array.from(docScores.entries())
          .filter(([_, score]) => score > minScoreThreshold)
          .sort((a, b) => b[1] - a[1]) // Descending score
          .slice(0, 30) // top 30 hits
          .map(([docId, _]) => blocksMap.get(docId));
          
        // Tie-breaker by pos
        results.sort((a, b) => {
            const scoreDiff = docScores.get(b!.id)! - docScores.get(a!.id)!;
            if (Math.abs(scoreDiff) < 0.1) {
                return (a!.pos || 0) - (b!.pos || 0);
            }
            return scoreDiff;
        });

        self.postMessage({ action: 'SEARCH_RESULTS', queryId, results: results });
      } catch (e) {
        console.error("Local Search Error", e);
        self.postMessage({ action: 'SEARCH_RESULTS', queryId, results: [] });
      }
      break;
  }
};
