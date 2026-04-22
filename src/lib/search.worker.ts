import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

export interface Block {
  id: string;
  type: string;
  content: string;
  chapterName?: string;
  chapterNumber?: number;
  hierarchyPath?: string[];
  pos?: number;
}

let db: any = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

async function getDB() {
  if (db) return db;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: file => sqlWasmUrl
        });
        db = new SQL.Database();
        // Create table in WebAssembly Memory
        db.run(`
          CREATE TABLE blocks (
            id TEXT PRIMARY KEY,
            type TEXT,
            content TEXT,
            chapterName TEXT,
            chapterNumber INTEGER,
            hierarchyPath TEXT,
            pos INTEGER
          );
        `);
      } catch (err) {
        console.error("Failed to initialize WASM SQLite", err);
      }
    })();
  }
  await initPromise;
  return db;
}

self.onmessage = async (e) => {
  if (!e.data) return;
  const { action, payload, queryId } = e.data;
  
  const database = await getDB();
  if (!database) {
     self.postMessage({ action: 'SEARCH_RESULTS', queryId, results: [], error: 'WASM engine failed to load' });
     return;
  }

  switch (action) {
    case 'INDEX':
      try {
        database.run('BEGIN TRANSACTION;');
        database.run('DELETE FROM blocks;');
        
        const stmt = database.prepare(`
          INSERT INTO blocks (id, type, content, chapterName, chapterNumber, hierarchyPath, pos)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const block of payload.blocks) {
          stmt.run([
            block.id || '',
            block.type || '',
            block.content || '',
            block.chapterName || '',
            block.chapterNumber || 0,
            JSON.stringify(block.hierarchyPath || []),
            block.pos || 0
          ]);
        }
        stmt.free();
        database.run('COMMIT;');
        self.postMessage({ action: 'INDEX_COMPLETE', status: 'success', blockCount: payload.blocks.length });
      } catch (err) {
        database.run('ROLLBACK;');
        self.postMessage({ action: 'INDEX_ERROR', status: 'error', error: String(err) });
      }
      break;

    case 'SEARCH':
      if (!payload.query || payload.query.trim() === '') {
        self.postMessage({ action: 'SEARCH_RESULTS', queryId, results: [] });
        return;
      }
      
      const q = "%" + payload.query.toLowerCase().trim() + "%";
      const results: Block[] = [];
      
      try {
        const stmt = database.prepare(`
          SELECT * FROM blocks 
          WHERE LOWER(content) LIKE ? 
          OR LOWER(chapterName) LIKE ?
          OR type LIKE ?
          ORDER BY pos ASC
          LIMIT 30
        `);
        
        let numericQuery = parseInt(payload.query.trim(), 10);
        if (isNaN(numericQuery)) numericQuery = -1;

        // Optionally, check if they typed "chapter <num>"
        const isChapterMatch = payload.query.toLowerCase().includes('chapter');

        // Execute fast WASM matrix search
        stmt.bind([q, q, q]);

        while (stmt.step()) {
          const row = stmt.getAsObject();
          results.push({
            id: row.id,
            type: row.type,
            content: row.content,
            chapterName: row.chapterName,
            chapterNumber: row.chapterNumber,
            hierarchyPath: JSON.parse(row.hierarchyPath || '[]'),
            pos: row.pos
          });
        }
        stmt.free();

        // If numeric was found, also throw in exactly matching chapter block ids manually
        if (numericQuery !== -1 || isChapterMatch) {
            const chStmt = database.prepare('SELECT * FROM blocks WHERE chapterNumber = ? LIMIT 5');
            chStmt.bind([numericQuery !== -1 ? numericQuery : 9999]); // If chapter matches text but no num, fallback.
            while (chStmt.step()) {
               const row = chStmt.getAsObject();
               if (!results.find(r => r.id === row.id)) {
                 results.push({
                    id: row.id,
                    type: row.type,
                    content: row.content,
                    chapterName: row.chapterName,
                    chapterNumber: row.chapterNumber,
                    hierarchyPath: JSON.parse(row.hierarchyPath || '[]'),
                    pos: row.pos
                 });
               }
            }
            chStmt.free();
        }

      } catch (e) {
        console.error("WASM SQLite Search Error", e);
      }

      self.postMessage({ action: 'SEARCH_RESULTS', queryId, results });
      break;
  }
};
