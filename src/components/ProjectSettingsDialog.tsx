import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Ruler, Grid3X3, Palette, Maximize2, Key, FileText } from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type PageSize = {
  id: string;
  name: string;
  width: number; // in mm
  height: number; // in mm
  unit: 'mm' | 'in' | 'px' | 'cm';
};

export const STANDARD_PAGE_SIZES: PageSize[] = [
  { id: 'a4', name: 'A4', width: 210, height: 297, unit: 'mm' },
  { id: 'a3', name: 'A3', width: 297, height: 420, unit: 'mm' },
  { id: 'a5', name: 'A5', width: 148, height: 210, unit: 'mm' },
  { id: 'letter', name: 'Letter', width: 215.9, height: 279.4, unit: 'mm' },
  { id: 'legal', name: 'Legal', width: 215.9, height: 355.6, unit: 'mm' },
  { id: 'executive', name: 'Executive', width: 184.1, height: 266.7, unit: 'mm' },
  { id: 'b5', name: 'B5', width: 176, height: 250, unit: 'mm' },
];

export default function ProjectSettingsDialog({ projectId, trigger }: { projectId: string, trigger?: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState<any>({
    title: '',
    description: '',
    contributors: '',
    observerApiKey: '',
    pageSizeId: 'a4',
    customWidth: 210,
    customHeight: 297,
    customUnit: 'mm',
    margins: 20,
    showGrid: false,
    showMargins: false,
    texture: 'none',
    pageColor: '#ffffff',
  });

  useEffect(() => {
    if (open && projectId) {
      const docRef = doc(db, 'projects', projectId);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(prev => ({ ...prev, ...data }));
        }
      });
      return () => unsubscribe();
    }
  }, [open, projectId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'projects', projectId);
      await setDoc(docRef, { 
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setOpen(false);
    } catch (error) {
      console.error("Error saving project settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground" />}>
          <Settings className="h-4 w-4" /> Settings
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[700px] bg-background border-border rounded-[2rem] p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Project Configuration
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update book details, physical dimensions, and AI settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="mt-6">
          <TabsList className="grid w-full grid-cols-4 bg-muted rounded-xl">
            <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-background"><FileText className="h-4 w-4 mr-1" /> General</TabsTrigger>
            <TabsTrigger value="dimensions" className="rounded-lg data-[state=active]:bg-background"><Ruler className="h-4 w-4 mr-1" /> Size</TabsTrigger>
            <TabsTrigger value="layout" className="rounded-lg data-[state=active]:bg-background"><Grid3X3 className="h-4 w-4 mr-1" /> Layout</TabsTrigger>
            <TabsTrigger value="aesthetics" className="rounded-lg data-[state=active]:bg-background"><Palette className="h-4 w-4 mr-1" /> Style</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Book Title</Label>
              <Input
                id="title"
                value={settings.title}
                onChange={(e) => updateSetting('title', e.target.value)}
                className="bg-muted/50 border-border"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={settings.description}
                onChange={(e) => updateSetting('description', e.target.value)}
                className="bg-muted/50 border-border min-h-[80px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observerApiKey" className="flex items-center gap-2">
                <Key className="h-4 w-4" /> Observer API Key
              </Label>
              <Input
                id="observerApiKey"
                type="password"
                placeholder="Leave blank to use Universal API Key"
                value={settings.observerApiKey}
                onChange={(e) => updateSetting('observerApiKey', e.target.value)}
                className="bg-muted/50 border-border"
              />
            </div>
          </TabsContent>

          <TabsContent value="dimensions" className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Standard Page Size</Label>
                <Select value={settings.pageSizeId} onValueChange={(v) => updateSetting('pageSizeId', v)}>
                  <SelectTrigger className="bg-muted/50 border-border rounded-xl">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border rounded-xl">
                    {STANDARD_PAGE_SIZES.map(size => (
                      <SelectItem key={size.id} value={size.id}>{size.name} ({size.width}x{size.height}mm)</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Size</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.pageSizeId === 'custom' && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Width</Label>
                    <Input 
                      type="number" 
                      value={settings.customWidth} 
                      onChange={(e) => updateSetting('customWidth', parseFloat(e.target.value))}
                      className="bg-muted/50 border-border rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height</Label>
                    <Input 
                      type="number" 
                      value={settings.customHeight} 
                      onChange={(e) => updateSetting('customHeight', parseFloat(e.target.value))}
                      className="bg-muted/50 border-border rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Select value={settings.customUnit} onValueChange={(v) => updateSetting('customUnit', v)}>
                      <SelectTrigger className="bg-muted/50 border-border rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border rounded-xl">
                        <SelectItem value="mm">mm</SelectItem>
                        <SelectItem value="in">in</SelectItem>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="px">px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Margins (mm)</Label>
                <Input 
                  type="number" 
                  value={settings.margins} 
                  onChange={(e) => updateSetting('margins', parseFloat(e.target.value))}
                  className="bg-muted/50 border-border rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Show Grid</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.showGrid} 
                    onChange={(e) => updateSetting('showGrid', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border">
                  <div className="flex items-center gap-2">
                    <Maximize2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Show Margins</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={settings.showMargins} 
                    onChange={(e) => updateSetting('showMargins', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="aesthetics" className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Page Texture</Label>
                <Select value={settings.texture} onValueChange={(v) => updateSetting('texture', v)}>
                  <SelectTrigger className="bg-muted/50 border-border rounded-xl">
                    <SelectValue placeholder="Select texture" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border rounded-xl">
                    <SelectItem value="none">Smooth (None)</SelectItem>
                    <SelectItem value="parchment">Parchment</SelectItem>
                    <SelectItem value="grainy">Grainy Paper</SelectItem>
                    <SelectItem value="linen">Linen</SelectItem>
                    <SelectItem value="recycled">Recycled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Page Color</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color" 
                    value={settings.pageColor} 
                    onChange={(e) => updateSetting('pageColor', e.target.value)}
                    className="w-12 h-10 p-1 bg-muted/50 border-border rounded-xl cursor-pointer"
                  />
                  <Input 
                    type="text" 
                    value={settings.pageColor} 
                    onChange={(e) => updateSetting('pageColor', e.target.value)}
                    className="flex-1 bg-muted/50 border-border rounded-xl font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-8">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full px-6">Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="rounded-full px-8 bg-primary hover:bg-primary/90 text-primary-foreground">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

