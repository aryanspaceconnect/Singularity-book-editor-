import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ProjectSettingsDialog({ projectId, trigger }: { projectId: string, trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contributors, setContributors] = useState('');
  const [observerApiKey, setObserverApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      const fetchSettings = async () => {
        const docRef = doc(db, 'projects', projectId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTitle(data.title || '');
          setDescription(data.description || '');
          setContributors(data.contributors || '');
          setObserverApiKey(data.observerApiKey || '');
        }
      };
      fetchSettings();
    }
  }, [open, projectId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'projects', projectId);
      await setDoc(docRef, { 
        title, 
        description, 
        contributors,
        observerApiKey,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setOpen(false);
    } catch (error) {
      console.error("Error saving project settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100" />}>
          <Settings className="h-4 w-4" /> Settings
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-900 dark:text-zinc-100">Project Settings</DialogTitle>
          <DialogDescription className="text-zinc-500 dark:text-zinc-400">
            Update book details and configure the Observer AI for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-zinc-900 dark:text-zinc-100">Book Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description" className="text-zinc-900 dark:text-zinc-100">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 min-h-[100px]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contributors" className="text-zinc-900 dark:text-zinc-100">Contributors</Label>
            <Input
              id="contributors"
              placeholder="e.g., Alice, Bob"
              value={contributors}
              onChange={(e) => setContributors(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="grid gap-2 mt-4">
            <Label htmlFor="observerApiKey" className="text-zinc-900 dark:text-zinc-100">Observer API Key (Gemini)</Label>
            <Input
              id="observerApiKey"
              type="password"
              placeholder="Leave blank to use Universal API Key"
              value={observerApiKey}
              onChange={(e) => setObserverApiKey(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Override the Universal API Key specifically for this project's Observer AI.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200">
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
