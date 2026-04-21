import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { History, GitCommit, RotateCcw, Loader2, Sparkles } from 'lucide-react';
import { ClockCounterClockwise } from '@phosphor-icons/react';
import { collection, addDoc, onSnapshot, query, serverTimestamp, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
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
  
  // Custom dialog overrides
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const { ai } = useAI();
  const contentRef = useRef(currentContent);

  useEffect(() => {
    contentRef.current = currentContent;
  }, [currentContent]);

  useEffect(() => {
    const q = query(collection(db, 'projects', projectId, 'versions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      docs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Infinity;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Infinity;
        return timeB - timeA;
      });
      setVersions(docs);
    }, (err) => {
      console.error("Error fetching versions:", err);
      setError(err.message);
    });
    return () => unsubscribe();
  }, [projectId]);

  // Auto-save logic every 5 minutes
  useEffect(() => {
    let lastSavedContent = contentRef.current;
    
    const autoSaveInterval = setInterval(async () => {
      if (contentRef.current === lastSavedContent || !contentRef.current.trim()) return;
      
      try {
        const manualVersions = versions.filter(v => v.type !== 'auto');
        const nextSerial = manualVersions.length + versions.filter(v => v.type === 'auto').length + 1;

        await addDoc(collection(db, 'projects', projectId, 'versions'), {
          name: `Auto-save v${nextSerial}`,
          content: contentRef.current,
          createdAt: serverTimestamp(),
          type: 'auto',
          serialNumber: nextSerial
        });
        
        lastSavedContent = contentRef.current;
        await enforceLimits();
      } catch (err) {
        console.error("Auto-save failed", err);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(autoSaveInterval);
  }, [projectId, versions]);

  const enforceLimits = async () => {
    try {
      const allDocsSnap = await getDocs(collection(db, 'projects', projectId, 'versions'));
      const allDocs = allDocsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      allDocs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      const manualDocs = allDocs.filter(d => d.type !== 'auto');
      const autoDocs = allDocs.filter(d => d.type === 'auto');

      // Keep max 15 manual versions
      if (manualDocs.length > 15) {
        const docsToDelete = manualDocs.slice(15);
        for (const docInfo of docsToDelete) {
          await deleteDoc(doc(db, 'projects', projectId, 'versions', docInfo.id));
        }
      }

      // Keep max 5 auto versions
      if (autoDocs.length > 5) {
        const docsToDelete = autoDocs.slice(5);
        for (const docInfo of docsToDelete) {
          await deleteDoc(doc(db, 'projects', projectId, 'versions', docInfo.id));
        }
      }
    } catch (err) {
        console.error("Enforcing limits failed", err);
    }
  };

  const handleSaveVersion = async () => {
    if (!versionName.trim()) return;
    setSaving(true);
    try {
      const manualVersions = versions.filter(v => v.type !== 'auto');
      const nextSerial = manualVersions.length + versions.filter(v => v.type === 'auto').length + 1;

      await addDoc(collection(db, 'projects', projectId, 'versions'), {
        name: versionName,
        content: currentContent,
        createdAt: serverTimestamp(),
        type: 'manual',
        serialNumber: nextSerial
      });
      setVersionName('');
      await enforceLimits();
    } catch (error: any) {
      console.error("Error saving version:", error);
      setAlertMessage("Failed to save version: " + error.message);
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
      setAlertMessage("Failed to generate commit message: " + error.message);
      setVersionName('Updated content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestore = async (versionContent: string) => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'projects', projectId, 'canvas', 'main'), {
        content: versionContent,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setOpen(false);
    } catch (error: any) {
      console.error("Error restoring version:", error);
      setAlertMessage("Failed to restore version: " + error.message);
    } finally {
      setLoading(false);
      setConfirmRestoreId(null);
    }
  };

  return (
    <>
      {alertMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-xl font-semibold mb-2">Notification</h3>
            <p className="text-muted-foreground mb-6">{alertMessage}</p>
            <div className="flex justify-end">
              <Button onClick={() => setAlertMessage(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {confirmRestoreId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-xl font-semibold mb-2 text-destructive">Restore Version?</h3>
            <p className="text-muted-foreground mb-6">Are you sure you want to restore this version? Your current unsaved changes will be overridden immediately.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmRestoreId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                const ver = versions.find(v => v.id === confirmRestoreId);
                if (ver) handleRestore(ver.content);
              }}>
                Restore
              </Button>
            </div>
          </div>
        </div>
      )}

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
                    <div key={v.id} className="flex gap-3 items-center justify-between p-3 rounded-xl bg-card border border-border shadow-sm">
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            #{v.serialNumber || '?'}
                          </span>
                          <span className="font-medium text-sm truncate">{v.name}</span>
                          {v.type === 'auto' && <span className="text-[10px] text-muted-foreground uppercase tracking-wider bg-muted px-1.5 rounded">Auto</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {v.createdAt?.toDate ? format(v.createdAt.toDate(), 'MMM d, yyyy h:mm a') : 'Just now'}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setConfirmRestoreId(v.id)}
                        disabled={loading}
                        className="gap-2 text-xs h-8 shrink-0"
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
    </>
  );
}
