import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { History, GitCommit, RotateCcw, Loader2, Sparkles } from 'lucide-react';
import { ClockCounterClockwise } from '@phosphor-icons/react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { useAI } from '../lib/ai-context';

export default function VersionHistoryDialog({ projectId, currentContent }: { projectId: string, currentContent: string }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ai } = useAI();

  useEffect(() => {
    if (!open) return;
    setError(null);
    const q = query(collection(db, 'projects', projectId, 'versions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Sort on client side to avoid requiring a composite index if one was needed
      docs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Infinity; // Pending writes go to top
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Infinity;
        return timeB - timeA;
      });
      setVersions(docs);
    }, (err) => {
      console.error("Error fetching versions:", err);
      setError(err.message);
    });
    return () => unsubscribe();
  }, [projectId, open]);

  const handleSaveVersion = async () => {
    if (!versionName.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'projects', projectId, 'versions'), {
        name: versionName,
        content: currentContent,
        createdAt: serverTimestamp()
      });
      setVersionName('');
    } catch (error: any) {
      console.error("Error saving version:", error);
      alert("Failed to save version: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const generateCommitMessage = async () => {
    setIsGenerating(true);
    try {
      const lastVersion = versions.length > 0 ? versions[0].content : '';
      const prompt = `Compare the following two versions of a document and write a very short, concise commit message (max 50 characters) describing the main changes.
      
      Previous Version:
      ${lastVersion.substring(0, 2000)}...
      
      Current Version:
      ${currentContent.substring(0, 2000)}...
      
      Commit Message:`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-preview',
        contents: prompt,
      });
      
      setVersionName(response.text?.trim() || 'Updated content');
    } catch (error: any) {
      console.error("Error generating commit message:", error);
      alert("Failed to generate commit message: " + error.message);
      setVersionName('Updated content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestore = async (versionContent: string) => {
    if (!confirm("Are you sure you want to restore this version? Your current unsaved changes will be lost.")) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'projects', projectId, 'canvas', 'main'), {
        content: versionContent,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setOpen(false);
    } catch (error: any) {
      console.error("Error restoring version:", error);
      alert("Failed to restore version: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full h-8 w-8">
          <ClockCounterClockwise className="h-4 w-4" />
        </Button>} />
      <DialogContent className="bg-background border-border text-foreground sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Version History
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {error && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md border border-destructive/20">
              Error loading versions: {error}
            </div>
          )}
          <div className="flex gap-2">
            <Input 
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="Commit message (e.g., 'Added chapter 2')"
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={generateCommitMessage}
              disabled={isGenerating}
              title="Auto-generate commit message"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
            </Button>
            <Button 
              onClick={handleSaveVersion} 
              disabled={saving || !versionName.trim()} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCommit className="h-4 w-4" />}
              Commit
            </Button>
          </div>
          
          <ScrollArea className="h-[300px] rounded-md border border-border bg-muted/20 p-4">
            {versions.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No versions saved yet.
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border shadow-sm">
                    <div>
                      <div className="font-medium text-sm">{v.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {v.createdAt?.toDate ? format(v.createdAt.toDate(), 'MMM d, yyyy h:mm a') : 'Just now'}
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleRestore(v.content)}
                      disabled={loading}
                      className="gap-2 text-xs h-8"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
