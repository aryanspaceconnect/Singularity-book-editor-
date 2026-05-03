import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { doc, getDoc, setDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { verifyApiKey } from '../services/aiService';
import { AI_MODELS } from '../services/aiModels';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function GlobalSettingsDialog({ userId, trigger }: { userId: string, trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState(AI_MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'success' | 'failure' | null>(null);

  const handleVerify = async () => {
    setVerifying(true);
    setVerificationResult(null);
    const isValid = await verifyApiKey(apiKey, modelId);
    setVerificationResult(isValid ? 'success' : 'failure');
    setVerifying(false);
  };

  useEffect(() => {
    if (open) {
      const fetchSettings = async () => {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.universalApiKey) setApiKey(data.universalApiKey);
          if (data.universalModel) setModelId(data.universalModel);
        }
      };
      fetchSettings();
    }
  }, [open, userId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'users', userId);
      const updateData: any = { universalModel: modelId };
      if (apiKey.trim() === '') {
        updateData.universalApiKey = deleteField();
      } else {
        updateData.universalApiKey = apiKey;
      }
      await setDoc(docRef, updateData, { merge: true });
      setOpen(false);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" />}>
            <Settings className="h-5 w-5" />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Universal Settings</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Configure global settings for the intelligent layer.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="model" className="text-foreground">AI Model</Label>
            <Select 
              value={modelId.startsWith('custom-google') ? 'custom-google' : modelId.startsWith('custom-nvidia') ? 'custom-nvidia' : modelId} 
              onValueChange={(val) => { 
                setModelId(val === 'custom-google' ? 'custom-google:' : val === 'custom-nvidia' ? 'custom-nvidia:' : val); 
                setVerificationResult(null); 
              }}
            >
              <SelectTrigger className="bg-muted/50 border-border">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(modelId.startsWith('custom-google') || modelId.startsWith('custom-nvidia')) && (
              <Input
                placeholder="Enter exact model ID..."
                value={modelId.split(':')[1] || ''}
                onChange={(e) => setModelId(`${modelId.split(':')[0]}:${e.target.value}`)}
                className="mt-1 bg-muted/50 border-border text-xs h-8"
              />
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="apiKey" className="text-foreground">Universal API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Leave blank to use system default"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setVerificationResult(null);
              }}
              className="bg-muted/50 border-border text-foreground"
            />
            <div className="flex gap-2">
              <Button onClick={handleVerify} disabled={verifying || !apiKey} variant="secondary" className="text-xs">
                {verifying ? "Verifying..." : "Verify Key"}
              </Button>
              {verificationResult === 'success' && <span className="text-xs text-green-500 self-center">Valid</span>}
              {verificationResult === 'failure' && <span className="text-xs text-destructive self-center">Invalid</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              This model and key will be used by default if provided.
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
