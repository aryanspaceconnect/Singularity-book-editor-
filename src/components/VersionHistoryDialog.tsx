import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { History, GitCommit, RotateCcw, Loader2, Sparkles, Clock, AlertTriangle, Trash2 } from 'lucide-react';
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
  
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

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
    setError(null);
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
      setError("Failed to save: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const generateCommitMessage = async () => {
    setIsGenerating(true);
    setError(null);
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
      setError("Generation failed: " + error.message);
      setVersionName('Updated content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestore = async (versionContent: string) => {
    setLoading(true);
    setError(null);
    try {
      await setDoc(doc(db, 'projects', projectId, 'canvas', 'main'), {
        content: versionContent,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setOpen(false);
      setConfirmingId(null);
    } catch (error: any) {
      console.error("Error restoring version:", error);
      setError("Failed to restore: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'versions', versionId));
      if (confirmingId === versionId) {
        setConfirmingId(null);
      }
    } catch (error: any) {
      console.error("Error deleting version:", error);
      setError("Failed to delete: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setConfirmingId(null);
    }}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground rounded-full h-8 w-8 transition-colors" />}>
        <ClockCounterClockwise className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card border-border/50 shadow-2xl p-0 overflow-hidden rounded-[1.5rem] gap-0 outline-none">
        <DialogTitle className="sr-only">Timeline</DialogTitle>
        
        <div className="flex flex-col max-h-[85vh]">
          {/* Header section (sticky) */}
          <div className="px-8 pt-8 pb-6 border-b border-border/60 bg-muted/20 shrink-0">
            <div className="flex items-center gap-3 text-foreground mb-1.5">
              <History className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-medium tracking-tight">Timeline</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Create snapshots of your workspace to securely test new ideas.</p>
            
            <div className="flex relative items-center">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <GitCommit className="h-4 w-4 text-muted-foreground focus-within:text-primary transition-colors" />
              </div>
              <Input 
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="Describe your current state"
                className="pl-11 pr-[120px] h-12 rounded-full border-border/60 bg-background shadow-sm focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-sm font-medium transition-all"
                onKeyDown={(e) => {
                   if (e.key === 'Enter' && versionName.trim() && !saving) handleSaveVersion();
                }}
              />
              <div className="absolute right-1.5 flex flex-row items-center gap-1">
                 <Button 
                    type="button"
                    variant="ghost" 
                    size="icon"
                    onClick={generateCommitMessage}
                    disabled={isGenerating}
                    className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Auto-generate commit message"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                  <Button 
                    onClick={handleSaveVersion} 
                    disabled={saving || !versionName.trim()} 
                    className="h-9 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Commit
                  </Button>
              </div>
            </div>
            {error && <p className="text-destructive text-xs mt-3 ml-2 animate-in fade-in">{error}</p>}
          </div>

          {/* Timeline Stream */}
          <ScrollArea className="flex-1 bg-background/50">
            <div className="p-8 relative min-h-[300px]">
              {versions.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <Clock className="h-8 w-8 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No snapshots yet</p>
                  <p className="text-xs opacity-70">Your history will appear here.</p>
                </div>
              ) : (
                <>
                  {/* Vertical line connecting nodes */}
                  <div className="absolute left-[39px] top-10 bottom-10 w-px bg-border/60" />

                  <div className="space-y-6">
                    {versions.map((v, i) => (
                      <div key={v.id} className="relative z-10 flex gap-6 group">
                        {/* Node */}
                        <div className="mt-2.5 shrink-0 flex flex-col items-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-background border-2 border-primary/50 group-hover:border-primary transition-colors shadow-[0_0_8px_rgba(var(--primary),0.2)]" />
                        </div>
                        
                        {/* Content Card */}
                        <div className={`flex-1 rounded-2xl border transition-all duration-300 ${confirmingId === v.id ? 'border-primary/50 shadow-md bg-primary/5' : 'border-border/40 bg-card hover:bg-muted/30 hover:border-border'} p-4`}>
                          {confirmingId !== v.id ? (
                            // Standard View 
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                                  <span className="font-mono text-xs font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded-md border border-primary/10">
                                    #{v.serialNumber || (versions.length - i)}
                                  </span>
                                  <h4 className="text-sm font-medium text-foreground truncate">{v.name}</h4>
                                  {v.type === 'auto' && (
                                    <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted border border-border/50 px-1.5 py-0.5 rounded-full">
                                      Auto
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 opacity-70" />
                                  {v.createdAt?.toDate ? format(v.createdAt.toDate(), 'MMM d, yyyy h:mm a') : 'Just now'}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setConfirmingId(v.id)} 
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs h-8 rounded-full px-4 border-border/60 shadow-sm shrink-0"
                                >
                                  <RotateCcw className="w-3 h-3 mr-2" />
                                  Restore
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteVersion(v.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full shrink-0"
                                  title="Delete Version"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Confirm Revert View
                            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
                              <div className="flex items-center gap-2 text-primary">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm font-semibold">Revert workspace to #{v.serialNumber || (versions.length - i)}?</span>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed pr-6">
                                Your current unsaved workspace progress will be permanently overridden by this snapshot.
                              </p>
                              <div className="flex gap-2 justify-end mt-1">
                                <Button variant="ghost" size="sm" onClick={() => setConfirmingId(null)} className="h-8 text-xs rounded-full px-4">
                                  Cancel
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  onClick={() => handleRestore(v.content)} 
                                  disabled={loading}
                                  className="h-8 text-xs rounded-full px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                >
                                  {loading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : null}
                                  Confirm Revert
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
