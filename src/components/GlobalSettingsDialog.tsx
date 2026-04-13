import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function GlobalSettingsDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const fetchSettings = async () => {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().universalApiKey) {
          setApiKey(docSnap.data().universalApiKey);
        }
      };
      fetchSettings();
    }
  }, [open, userId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, { universalApiKey: apiKey }, { merge: true });
      setOpen(false);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" />}>
        <Settings className="h-5 w-5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Universal Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure global settings for the intelligent layer.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="apiKey" className="text-foreground">Universal API Key (Gemini)</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Leave blank to use system default"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-muted/50 border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              This key will be used by default for all AI interactions if provided.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-border text-foreground hover:bg-muted">Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
