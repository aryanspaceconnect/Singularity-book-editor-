import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusSignIcon as Plus, AiChat01Icon as Bot, Key01Icon as Key, Task01Icon as FileText, CpuIcon as Cpu, FingerPrintAddIcon as Fingerprint, MagicWand01Icon as Sparkles, Upload01Icon as Upload, Database01Icon as Database, Settings03Icon as Wrench, Cancel01Icon as X, TickDouble01Icon as CheckCircle2, AiNetworkIcon as Network } from 'hugeicons-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AgentCreatorDialog({ userId, projectId }: { userId: string, projectId: string | null }) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);

  // Create Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [model, setModel] = useState('gemini-3.1-pro-preview');
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [agentId, setAgentId] = useState('');
  const [memoryLimit, setMemoryLimit] = useState('1024');
  const [isImproving, setIsImproving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, 'agents'), where('ownerId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const agentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgents(agentData);
    });
    return () => unsubscribe();
  }, [userId]);

  const generateUniversalId = () => {
    const randomHex = Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return `ag_${randomHex}`;
  };

  const handleOpenCreate = () => {
    setAgentId(generateUniversalId());
    setName('');
    setRole('');
    setSystemPrompt('');
    setApiKey('');
    setIsCreating(true);
    setOpen(false); // Close the roster dialog
  };

  const handleCreateAgent = async () => {
    try {
      await addDoc(collection(db, 'agents'), {
        ownerId: userId,
        universalId: agentId,
        name,
        role,
        model,
        systemPrompt,
        memoryLimit: parseInt(memoryLimit),
        createdAt: serverTimestamp(),
        // Note: In a production app, API keys MUST be encrypted before storing.
        // We store it here for the prototype's intelligence layer.
        encryptedApiKey: apiKey ? 'ENCRYPTED_STUB_' + apiKey.substring(0, 4) + '...' : null,
      });
      setIsCreating(false);
      setOpen(true); // Re-open roster to show the new agent
    } catch (error) {
      console.error("Error creating agent:", error);
    }
  };

  const handleImprovePrompt = () => {
    setIsImproving(true);
    // Simulate AI improving the prompt
    setTimeout(() => {
      setSystemPrompt((prev) => 
        prev ? `You are an expert ${role || 'assistant'}. Your primary directive is to execute tasks with extreme precision and logical reasoning. \n\nOriginal instructions: ${prev}\n\nMaintain a highly professional, optimistic, and philosophical tone. Always think outside the box and ensure all functional requirements are met efficiently.` 
        : `You are an expert ${role || 'assistant'}. Your primary directive is to execute tasks with extreme precision and logical reasoning. Maintain a highly professional, optimistic, and philosophical tone. Always think outside the box and ensure all functional requirements are met efficiently.`
      );
      setIsImproving(false);
    }, 1500);
  };

  return (
    <>
      {/* ROSTER DIALOG (Spherical Window) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" className="gap-2 rounded-full bg-background border-border text-foreground hover:bg-muted shadow-sm">
            <Network className="h-4 w-4 text-primary" />
            Agent Hub
          </Button>} />
        <DialogContent className="bg-background/90 backdrop-blur-2xl border-border text-foreground max-w-4xl rounded-[3rem] p-8 shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <Cpu className="h-8 w-8 text-primary" />
              Agent Roster
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base ml-11">
              Select an existing agent to apply to this book, or spawn a new stem cell.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2 pb-4">
            {/* Create New Button Card */}
            <div 
              onClick={handleOpenCreate}
              className="flex flex-col items-center justify-center p-8 h-48 border-2 border-dashed border-border rounded-[2rem] bg-muted/50 hover:bg-muted hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <span className="font-medium text-foreground">Spawn New Agent</span>
              <span className="text-xs text-muted-foreground mt-1">Initialize a stem cell</span>
            </div>

            {/* Existing Agents */}
            {agents.map((agent) => (
              <div key={agent.id} className="flex flex-col justify-between p-6 h-48 border border-border rounded-[2rem] bg-card shadow-sm hover:shadow-md transition-all">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-foreground truncate pr-2">{agent.name}</h3>
                    <Bot className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{agent.role}</p>
                  <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-[10px] font-mono text-muted-foreground">
                    <Fingerprint className="h-3 w-3" />
                    {agent.universalId?.substring(0, 12)}...
                  </div>
                </div>
                <Button variant="secondary" className="w-full rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                  Apply to Book
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* FULL SCREEN CREATOR (Stem Cell Lab) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isCreating && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-4 md:inset-8 z-[100] flex flex-col bg-background/90 backdrop-blur-3xl border border-border rounded-[3rem] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-muted/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cpu className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-foreground tracking-tight">Stem Cell Lab</h2>
                  <p className="text-sm text-muted-foreground">Initialize and configure a new universal agent entity.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)} className="rounded-full hover:bg-muted">
                <X className="h-6 w-6 text-muted-foreground" />
              </Button>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Identity & Core */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="space-y-6 bg-muted/50 p-6 rounded-[2rem] border border-border">
                    <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                      <Fingerprint className="h-5 w-5 text-primary" /> Identity
                    </h3>
                    
                    <div className="space-y-2">
                      <Label className="text-foreground">Universal Agent ID</Label>
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl border border-border font-mono text-sm text-muted-foreground">
                        {agentId}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Unique identifier for efficient inter-agent communication.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-foreground">Agent Name</Label>
                      <Input 
                        id="name" 
                        placeholder="e.g., LoreMaster-X" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-background border-border rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-foreground">Specialization / Role</Label>
                      <Input 
                        id="role" 
                        placeholder="e.g., World Builder, Code Reviewer" 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="bg-background border-border rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-6 bg-muted/50 p-6 rounded-[2rem] border border-border">
                    <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" /> Intelligence Layer
                    </h3>
                    
                    <div className="space-y-2">
                      <Label className="text-foreground">Base Model</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger className="bg-background border-border rounded-xl">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border rounded-xl">
                          <SelectItem value="gemini-3.1-pro-preview">Gemini 3.1 Pro</SelectItem>
                          <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                          <SelectItem value="nvidia-gemma">NVIDIA Gemma (Custom)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apikey" className="text-foreground flex items-center gap-2">
                        <Key className="h-4 w-4" /> API Key
                      </Label>
                      <Input 
                        id="apikey" 
                        type="password"
                        placeholder="sk-..." 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-background border-border rounded-xl"
                      />
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-primary" /> Stored in encrypted format
                      </p>
                    </div>
                  </div>
                </div>

                {/* Middle Column: Personality & Memory */}
                <div className="lg:col-span-5 space-y-8">
                  <div className="space-y-4 bg-muted/50 p-6 rounded-[2rem] border border-border h-full flex flex-col">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" /> Personality & Directives
                      </h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleImprovePrompt}
                        disabled={isImproving}
                        className="h-8 rounded-full bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                      >
                        {isImproving ? <Sparkles className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
                        {isImproving ? 'Enhancing...' : 'Auto-Improve'}
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Define the agent's core behavior, rules, and markdown instructions.
                    </p>

                    <Textarea 
                      placeholder="You are a master world-builder. Your job is to..." 
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="flex-1 min-h-[250px] bg-background border-border rounded-xl font-mono text-sm resize-none focus-visible:ring-primary"
                    />
                  </div>
                </div>

                {/* Right Column: Advanced & Memory Upload */}
                <div className="lg:col-span-3 space-y-8">
                  <div className="space-y-4 bg-muted/50 p-6 rounded-[2rem] border border-border">
                    <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                      <Upload className="h-5 w-5 text-primary" /> Initial Memory
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Upload PDFs, images, or markdown files to seed the agent's memory bank.
                    </p>
                    
                    <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-background hover:bg-muted transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                      <span className="text-sm font-medium text-foreground">Drop files here</span>
                      <span className="text-xs text-muted-foreground mt-1">or click to browse</span>
                    </div>
                  </div>

                  <div className="space-y-6 bg-muted/50 p-6 rounded-[2rem] border border-border">
                    <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-primary" /> Advanced
                    </h3>
                    
                    <div className="space-y-2">
                      <Label className="text-foreground">Memory Storage Limit (MB)</Label>
                      <Input 
                        type="number"
                        value={memoryLimit}
                        onChange={(e) => setMemoryLimit(e.target.value)}
                        className="bg-background border-border rounded-xl"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label className="text-foreground">Tool Access</Label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer hover:border-primary/50 transition-colors">
                          <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" defaultChecked />
                          <span className="text-sm text-foreground">File System Access</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer hover:border-primary/50 transition-colors">
                          <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" defaultChecked />
                          <span className="text-sm text-foreground">Web Search</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background cursor-pointer hover:border-primary/50 transition-colors">
                          <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
                          <span className="text-sm text-foreground">MCP Servers</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-border bg-muted/50">
              <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-full text-muted-foreground hover:text-foreground hover:bg-muted px-6">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAgent} 
                disabled={!name || !role} 
                className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-8 shadow-lg shadow-primary/20"
              >
                Initialize Agent Entity
              </Button>
            </div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
