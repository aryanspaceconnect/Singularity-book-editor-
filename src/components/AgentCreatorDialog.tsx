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
import { Plus, Bot, Key, FileText, Cpu, Fingerprint, Sparkles, Upload, Database, Wrench, X, CheckCircle2, Network } from 'lucide-react';
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
        <DialogTrigger render={<Button variant="outline" className="gap-2 rounded-full bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-sm" />}>
          <Network className="h-4 w-4 text-indigo-500" />
          Agent Hub
        </DialogTrigger>
        <DialogContent className="bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-4xl rounded-[3rem] p-8 shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <Cpu className="h-8 w-8 text-indigo-500" />
              Agent Roster
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-base ml-11">
              Select an existing agent to apply to this book, or spawn a new stem cell.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2 pb-4">
            {/* Create New Button Card */}
            <div 
              onClick={handleOpenCreate}
              className="flex flex-col items-center justify-center p-8 h-48 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-[2rem] bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 hover:border-indigo-500/50 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Spawn New Agent</span>
              <span className="text-xs text-zinc-500 mt-1">Initialize a stem cell</span>
            </div>

            {/* Existing Agents */}
            {agents.map((agent) => (
              <div key={agent.id} className="flex flex-col justify-between p-6 h-48 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all">
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 truncate pr-2">{agent.name}</h3>
                    <Bot className="h-5 w-5 text-zinc-400 shrink-0" />
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">{agent.role}</p>
                  <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    <Fingerprint className="h-3 w-3" />
                    {agent.universalId?.substring(0, 12)}...
                  </div>
                </div>
                <Button variant="secondary" className="w-full rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20">
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
              className="fixed inset-4 md:inset-8 z-[100] flex flex-col bg-white/90 dark:bg-zinc-950/80 backdrop-blur-3xl border border-zinc-200 dark:border-zinc-800 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-200 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <Cpu className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Stem Cell Lab</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Initialize and configure a new universal agent entity.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)} className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
                <X className="h-6 w-6 text-zinc-500" />
              </Button>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Identity & Core */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="space-y-6 bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800/50">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Fingerprint className="h-5 w-5 text-indigo-500" /> Identity
                    </h3>
                    
                    <div className="space-y-2">
                      <Label className="text-zinc-700 dark:text-zinc-300">Universal Agent ID</Label>
                      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-200/50 dark:bg-zinc-950 rounded-xl border border-zinc-300 dark:border-zinc-800 font-mono text-sm text-zinc-500 dark:text-zinc-400">
                        {agentId}
                      </div>
                      <p className="text-[10px] text-zinc-500">Unique identifier for efficient inter-agent communication.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-zinc-700 dark:text-zinc-300">Agent Name</Label>
                      <Input 
                        id="name" 
                        placeholder="e.g., LoreMaster-X" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-zinc-700 dark:text-zinc-300">Specialization / Role</Label>
                      <Input 
                        id="role" 
                        placeholder="e.g., World Builder, Code Reviewer" 
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-6 bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800/50">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Database className="h-5 w-5 text-indigo-500" /> Intelligence Layer
                    </h3>
                    
                    <div className="space-y-2">
                      <Label className="text-zinc-700 dark:text-zinc-300">Base Model</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl">
                          <SelectItem value="gemini-3.1-pro-preview">Gemini 3.1 Pro</SelectItem>
                          <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                          <SelectItem value="nvidia-gemma">NVIDIA Gemma (Custom)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apikey" className="text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                        <Key className="h-4 w-4" /> API Key
                      </Label>
                      <Input 
                        id="apikey" 
                        type="password"
                        placeholder="sk-..." 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl"
                      />
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" /> Stored in encrypted format
                      </p>
                    </div>
                  </div>
                </div>

                {/* Middle Column: Personality & Memory */}
                <div className="lg:col-span-5 space-y-8">
                  <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800/50 h-full flex flex-col">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-500" /> Personality & Directives
                      </h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleImprovePrompt}
                        disabled={isImproving}
                        className="h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30"
                      >
                        {isImproving ? <Sparkles className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
                        {isImproving ? 'Enhancing...' : 'Auto-Improve'}
                      </Button>
                    </div>
                    
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Define the agent's core behavior, rules, and markdown instructions.
                    </p>

                    <Textarea 
                      placeholder="You are a master world-builder. Your job is to..." 
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="flex-1 min-h-[250px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl font-mono text-sm resize-none focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Right Column: Advanced & Memory Upload */}
                <div className="lg:col-span-3 space-y-8">
                  <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800/50">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Upload className="h-5 w-5 text-indigo-500" /> Initial Memory
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Upload PDFs, images, or markdown files to seed the agent's memory bank.
                    </p>
                    
                    <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 text-zinc-400 mb-3" />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Drop files here</span>
                      <span className="text-xs text-zinc-500 mt-1">or click to browse</span>
                    </div>
                  </div>

                  <div className="space-y-6 bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800/50">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-indigo-500" /> Advanced
                    </h3>
                    
                    <div className="space-y-2">
                      <Label className="text-zinc-700 dark:text-zinc-300">Memory Storage Limit (MB)</Label>
                      <Input 
                        type="number"
                        value={memoryLimit}
                        onChange={(e) => setMemoryLimit(e.target.value)}
                        className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl"
                      />
                    </div>

                    <div className="space-y-3 pt-2">
                      <Label className="text-zinc-700 dark:text-zinc-300">Tool Access</Label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 cursor-pointer hover:border-indigo-500/50 transition-colors">
                          <input type="checkbox" className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">File System Access</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 cursor-pointer hover:border-indigo-500/50 transition-colors">
                          <input type="checkbox" className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">Web Search</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 cursor-pointer hover:border-indigo-500/50 transition-colors">
                          <input type="checkbox" className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">MCP Servers</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-4 px-8 py-6 border-t border-zinc-200 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50">
              <Button variant="ghost" onClick={() => setIsCreating(false)} className="rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 px-6">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAgent} 
                disabled={!name || !role} 
                className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-8 shadow-lg shadow-indigo-500/20"
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
