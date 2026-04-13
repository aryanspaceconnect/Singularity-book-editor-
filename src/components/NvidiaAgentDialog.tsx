import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Cpu, UserPlus, Globe2, MessageSquare } from 'lucide-react';
import Markdown from 'react-markdown';

export default function NvidiaAgentDialog() {
  const [activeTab, setActiveTab] = useState('general');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // General state
  const [query, setQuery] = useState('');

  // Character state
  const [charName, setCharName] = useState('');
  const [charRole, setCharRole] = useState('');
  const [charTraits, setCharTraits] = useState('');

  // World state
  const [worldName, setWorldName] = useState('');
  const [worldGenre, setWorldGenre] = useState('');
  const [worldElements, setWorldElements] = useState('');

  const handleGenerate = async () => {
    let finalPrompt = '';

    if (activeTab === 'general') {
      if (!query) return;
      finalPrompt = query;
    } else if (activeTab === 'character') {
      if (!charRole) return;
      finalPrompt = `Generate a detailed character profile for a story. 
Name: ${charName || 'Unknown'}
Role/Archetype: ${charRole}
Key Traits: ${charTraits || 'Not specified'}

Please include their background, motivations, internal conflicts, and physical description.`;
    } else if (activeTab === 'world') {
      if (!worldGenre) return;
      finalPrompt = `Generate a comprehensive world-building guide for a story setting.
World Name: ${worldName || 'Unnamed World'}
Genre: ${worldGenre}
Key Elements/Rules: ${worldElements || 'Not specified'}

Please include details on the geography, society, magic/technology system, and major factions.`;
    }

    setLoading(true);
    setResult('');
    try {
      const response = await fetch('/api/agents/nvidia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: finalPrompt })
      });

      const data = await response.json();
      
      if (!response.ok) {
        setResult(data.error || "An error occurred.");
      } else {
        // Extract content from NVIDIA API response format
        const content = data.choices?.[0]?.message?.content || "No content generated.";
        setResult(content);
      }
    } catch (error) {
      console.error("Error generating with NVIDIA agent:", error);
      setResult("An error occurred while connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground" />}>
        <Cpu className="h-4 w-4 text-primary" />
        Gemma Agent
      </DialogTrigger>
      <DialogContent className="bg-background border-border text-foreground max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Gemma-4-31b-it (NVIDIA API)
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-2">
          <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
              <MessageSquare className="w-4 h-4 mr-2" /> General
            </TabsTrigger>
            <TabsTrigger value="character" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
              <UserPlus className="w-4 h-4 mr-2" /> Character
            </TabsTrigger>
            <TabsTrigger value="world" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
              <Globe2 className="w-4 h-4 mr-2" /> World-Building
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 flex gap-4 h-[450px]">
            {/* Left Column: Inputs */}
            <div className="w-1/3 flex flex-col gap-4 border-r border-border pr-4">
              <TabsContent value="general" className="mt-0 flex-1 flex flex-col gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Prompt</label>
                  <Textarea 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                    placeholder="Ask the Gemma agent..."
                    className="bg-muted/50 border-border focus-visible:ring-primary min-h-[200px] resize-none"
                  />
                </div>
              </TabsContent>

              <TabsContent value="character" className="mt-0 flex-1 flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Character Name</label>
                  <Input 
                    value={charName} 
                    onChange={(e) => setCharName(e.target.value)} 
                    placeholder="e.g. Elara Vance"
                    className="bg-muted/50 border-border focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Role / Archetype *</label>
                  <Input 
                    value={charRole} 
                    onChange={(e) => setCharRole(e.target.value)} 
                    placeholder="e.g. Rogue Scholar"
                    className="bg-muted/50 border-border focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-xs font-medium text-muted-foreground">Key Traits</label>
                  <Textarea 
                    value={charTraits} 
                    onChange={(e) => setCharTraits(e.target.value)} 
                    placeholder="e.g. Cynical but fiercely loyal, carries a mysterious artifact"
                    className="bg-muted/50 border-border focus-visible:ring-primary resize-none flex-1"
                  />
                </div>
              </TabsContent>

              <TabsContent value="world" className="mt-0 flex-1 flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">World Name</label>
                  <Input 
                    value={worldName} 
                    onChange={(e) => setWorldName(e.target.value)} 
                    placeholder="e.g. Aethelgard"
                    className="bg-muted/50 border-border focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Genre *</label>
                  <Input 
                    value={worldGenre} 
                    onChange={(e) => setWorldGenre(e.target.value)} 
                    placeholder="e.g. Cyberpunk Fantasy"
                    className="bg-muted/50 border-border focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-xs font-medium text-muted-foreground">Key Elements</label>
                  <Textarea 
                    value={worldElements} 
                    onChange={(e) => setWorldElements(e.target.value)} 
                    placeholder="e.g. Magic is powered by neon, corporations act as feudal lords"
                    className="bg-muted/50 border-border focus-visible:ring-primary resize-none flex-1"
                  />
                </div>
              </TabsContent>

              <Button 
                onClick={handleGenerate} 
                disabled={loading || (activeTab === 'general' && !query) || (activeTab === 'character' && !charRole) || (activeTab === 'world' && !worldGenre)} 
                className="bg-primary hover:bg-primary/90 text-primary-foreground w-full mt-auto shrink-0"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Cpu className="h-4 w-4 mr-2" />}
                {loading ? "Generating..." : "Generate"}
              </Button>
            </div>

            {/* Right Column: Output */}
            <div className="w-2/3">
              <ScrollArea className="h-full rounded-md border border-border bg-muted/50 p-4">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Gemma is thinking...
                  </div>
                ) : result ? (
                  <div className="prose dark:prose-invert prose-sm max-w-none">
                    <Markdown>{result}</Markdown>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                    <p>Configure your prompt on the left and click Generate.</p>
                    <p className="text-xs text-muted-foreground/70">Ensure NVIDIA_API_KEY is set in your environment secrets.</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
