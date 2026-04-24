import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { FilePdf, FileText, Note } from '@phosphor-icons/react';
import { db } from '../firebase';
import { Plus, Search, X, Loader2, LinkIcon, BrainCircuit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface SteppingStonesTrayProps {
  projectId: string;
  userId: string;
  onClose?: () => void;
}

export default function SteppingStonesTray({ projectId, userId, onClose }: SteppingStonesTrayProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const [uploadView, setUploadView] = useState<'list' | 'create_text'>('list');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    // We only load project files for now, as Universal files would require a generic /users/{userId}/files path
    const q = query(collection(db, 'projects', projectId, 'files'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFiles(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const handleSaveTextFile = async () => {
    if (!newTitle.trim()) return;
    try {
      await addDoc(collection(db, 'projects', projectId, 'files'), {
        name: newTitle,
        type: 'text',
        content: newContent,
        folder: 'root',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setUploadView('list');
      setNewTitle('');
      setNewContent('');
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'markdown': return <Note className="h-5 w-5 text-amber-500" />;
      case 'text': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'pdf': return <FilePdf className="h-5 w-5 text-red-500" />;
      default: return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const filtered = files.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="w-80 h-full bg-background border-l border-border flex flex-col shrink-0">
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <BrainCircuit className="h-4 w-4 text-primary" />
          Vault (Ideas/Files)
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
             <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {uploadView === 'list' && (
        <>
          <div className="p-4 border-b border-border shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search resources..." 
                className="pl-8 bg-muted/50 border-none h-9 text-sm"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setUploadView('create_text')}>
                <Plus className="h-3 w-3 mr-1" /> New Note
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                <LinkIcon className="h-3 w-3 mr-1" /> Add Link
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground text-sm">
                No files found. Add resources to your vault to guide the AI.
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer group transition-colors">
                    <div className="shrink-0 p-1.5 bg-background rounded border border-border">
                      {getIcon(f.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{f.type}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={async (e) => {
                        e.stopPropagation();
                        await deleteDoc(doc(db, 'projects', projectId, 'files', f.id))
                    }}>
                        <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {uploadView === 'create_text' && (
        <div className="flex flex-col h-full bg-muted/20">
          <div className="p-4 border-b border-border space-y-3 flex-1 flex flex-col">
            <Input 
              placeholder="Note title..." 
              className="bg-background"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <Textarea 
              placeholder="Start typing..."
              className="flex-1 min-h-[200px] bg-background resize-none"
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
            />
          </div>
          <div className="p-4 border-t border-border flex justify-between shrink-0 bg-background">
            <Button variant="ghost" size="sm" onClick={() => { setUploadView('list'); setNewTitle(''); setNewContent(''); }}>Cancel</Button>
            <Button size="sm" onClick={handleSaveTextFile} disabled={!newTitle.trim()}>Save Note</Button>
          </div>
        </div>
      )}
    </div>
  );
}
