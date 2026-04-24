import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Sparkles, Wand2, Search, ArrowRight, ArrowLeft, Loader2, Play } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { useAI } from '../lib/ai-context';

interface OutlineItem {
  id: string;
  type: 'volume' | 'part' | 'chapter' | 'episode' | 'scene';
  title: string;
  summary: string;
  children?: OutlineItem[];
}

interface BookWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onProjectCreated: (projectId: string) => void;
}

export default function BookWizardDialog({ open, onOpenChange, userId, onProjectCreated }: BookWizardDialogProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { ai } = useAI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Wizards state
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [posPrompts, setPosPrompts] = useState('');
  const [negPrompts, setNegPrompts] = useState('');
  const [tone, setTone] = useState('');
  const [creativity, setCreativity] = useState('50');
  const [complexity, setComplexity] = useState('50');
  const [pacing, setPacing] = useState('50');
  const [formatting, setFormatting] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState('A4');
  
  // Architect Planning State
  const [uploadedContext, setUploadedContext] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [outline, setOutline] = useState<OutlineItem[] | null>(null);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      // In a real WASM scenario, we pass this text to our Rust/C++ worker to chunk and index.
      // For this wizard, we store the raw text to pass to our Architect Agent.
      const text = event.target?.result as string;
      setUploadedContext(prev => prev + '\n\n' + text);
      setIsProcessingFile(false);
    };
    reader.onerror = () => setIsProcessingFile(false);
    reader.readAsText(file);
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingOutline(true);
    try {
      const prompt = `
        You are an expert Structural Book Architect.
        I will provide you with raw text, ideas, tone preferences, and context for a new book.
        
        Topic: ${topic}
        Title: ${title}
        Description: ${description}
        Tone: ${tone} (Creativity: ${creativity}/100, Complexity: ${complexity}/100, Pacing: ${pacing}/100)
        Positive Prompts: ${posPrompts}
        Negative Prompts: ${negPrompts}
        
        Raw Content/Context:
        ${uploadedContext.substring(0, 15000) /* truncate to fit context gracefully */}
        
        Please generate a compact hierarchical JSON outline for this book.
        Deduce the best structure based on the topic (e.g. Science books use Chapters, Sci-Fi books might use Volumes/Episodes).
        
        Output MUST be valid JSON adhering strictly to this schema:
        [
          {
             "id": "unique-id",
             "type": "volume" | "part" | "chapter" | "episode" | "scene",
             "title": "String",
             "summary": "String",
             "children": [ ...recursive OutlineItem ]
          }
        ]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      if (response.text) {
        const parsed = JSON.parse(response.text);
        setOutline(parsed);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to generate plan. Please check your API limits or try a smaller dataset.');
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      // 1. Create the book DNA markdown
      const bookDNA = `
# Book DNA structure
## Metadata
- **Title:** ${title || 'Untitled'}
- **Description:** ${description}

## Core Information
- **Topic:** ${topic}
- **Tone & Style:** ${tone}
- **Formatting Preferences:** ${formatting}
- **Page Size:** ${size}
`.trim();

      // 2. Create the project document
      const docRef = await addDoc(collection(db, 'projects'), {
        title: title || 'Untitled Book',
        description,
        ownerId: userId,
        mode: 'fast-book-writing', // Defines the UI Mode internally
        pageSettings: { color, size },
        outline: outline || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      const projectId = docRef.id;

      // 3. Save the DNA as the first "Universal/Project File"
      await addDoc(collection(db, 'projects', projectId, 'files'), {
        name: 'book-dna.md',
        type: 'markdown',
        content: bookDNA,
        folder: 'root',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 4. Save the outline as another Project File
      if (outline) {
        await addDoc(collection(db, 'projects', projectId, 'files'), {
          name: 'book-outline.json',
          type: 'text',
          content: JSON.stringify(outline, null, 2),
          folder: 'root',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      onProjectCreated(projectId);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderOutlineTree = (items: OutlineItem[], level = 0) => {
    return items.map((item, idx) => (
      <div key={item.id || idx} className={`ml-${level * 4} mt-2`}>
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 shrink-0 bg-muted rounded-full flex items-center justify-center text-[10px] text-muted-foreground uppercase font-bold">
            {item.type.charAt(0)}
          </div>
          <p className="text-sm font-medium">{item.title}</p>
        </div>
        <p className="text-xs text-muted-foreground ml-7 mt-1">{item.summary}</p>
        {item.children && item.children.length > 0 && (
          <div className="border-l border-border/50 ml-2.5 pl-4 mt-2">
            {renderOutlineTree(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border/80 shadow-2xl p-0 overflow-hidden rounded-[2rem] gap-0">
        <DialogTitle className="sr-only">Create New Book</DialogTitle>
        
        {/* Progress header */}
        <div className="bg-muted/30 p-6 flex items-center justify-between border-b border-border">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Fast Way (Guided Book Writing)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Step {step} of 4: {
                step === 1 ? 'Topic & Theme' : 
                step === 2 ? 'Tone & Knowledge' : 
                step === 3 ? 'Page & Layout' : 'Finalize DNA'
              }
            </p>
          </div>
          <div className="flex gap-1">
            {[1,2,3,4].map(s => (
              <div key={s} className={`h-1.5 w-8 rounded-full ${s <= step ? 'bg-amber-500' : 'bg-border'}`} />
            ))}
          </div>
        </div>

        <div className="p-8 pb-10 max-h-[60vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in-0 duration-300">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">What is the topic of your book?</label>
                  <div>
                    <input 
                      type="file" 
                      accept=".txt,.md" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload} 
                    />
                    <Button 
                       variant="outline" 
                       size="sm" 
                       className="h-8 text-xs" 
                       onClick={() => fileInputRef.current?.click()}
                       disabled={isProcessingFile}
                    >
                      {isProcessingFile ? (
                         <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                         <Sparkles className="w-3 h-3 mr-1" />
                      )}
                      {uploadedContext ? 'Add More Context' : 'Upload Context Files'}
                    </Button>
                  </div>
                </div>
                {uploadedContext && (
                   <p className="text-xs text-amber-600 font-medium">
                     Context ingested: ~{Math.round(uploadedContext.length / 5)} words
                   </p>
                )}
                <Textarea 
                  placeholder="e.g. A comprehensive guide on the evolution of AI infrastructure..."
                  className="bg-muted/50 border-border min-h-[100px] text-base p-4 rounded-xl resize-none focus-visible:ring-amber-500/50"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Optional: Working Title</label>
                <Input 
                  placeholder="Untitled Mastery"
                  className="bg-muted/50 border-border h-12 px-4 rounded-xl focus-visible:ring-amber-500/50"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Description / Synopsis</label>
                <Textarea 
                  placeholder="Provide a brief overview of what this book sets out to accomplish."
                  className="bg-muted/50 border-border min-h-[80px] p-4 rounded-xl resize-none focus-visible:ring-amber-500/50"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-xs font-medium text-green-600 dark:text-green-400">Positive Prompts (Amplified)</label>
                  <Textarea 
                    placeholder="Focus heavily on philosophical aspects..."
                    className="bg-green-500/5 border-green-500/20 min-h-[80px] p-4 rounded-xl resize-none focus-visible:ring-green-500/50 text-sm"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-medium text-destructive">Negative Prompts (Strictly Avoid)</label>
                  <Textarea 
                    placeholder="Do not use jargon. Do not be overly academic..."
                    className="bg-destructive/5 border-destructive/20 min-h-[80px] p-4 rounded-xl resize-none focus-visible:ring-destructive/50 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in-0 duration-300">
               <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-sm text-amber-700 dark:text-amber-400">
                <Wand2 className="h-5 w-5 shrink-0" />
                <p>Define the tone here. You can paste snippets of text, references, or styles you like. The AI will synthesize this into the book's DNA later.</p>
              </div>
              
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Grounded</span>
                    <span>Creativity</span>
                    <span>Wild</span>
                  </div>
                  <input type="range" min="1" max="100" defaultValue="50" className="w-full accent-amber-500" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Simple</span>
                    <span>Complexity</span>
                    <span>Academic</span>
                  </div>
                  <input type="range" min="1" max="100" defaultValue="50" className="w-full accent-amber-500" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Concise</span>
                    <span>Pacing & Detail</span>
                    <span>Descriptive</span>
                  </div>
                  <input type="range" min="1" max="100" defaultValue="50" className="w-full accent-amber-500" />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-sm font-medium text-foreground">Tone & Style Example</label>
                <Textarea 
                  placeholder="Conversational but authoritative. Like Malcolm Gladwell meets technical documentation."
                  className="bg-muted/50 border-border min-h-[80px] text-base p-4 rounded-xl resize-none focus-visible:ring-amber-500/50"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in-0 duration-300">
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Formatting Preferences</label>
                <Textarea 
                  placeholder="Use drop caps for starting chapters. Use footnotes instead of inline citations."
                  className="bg-muted/50 border-border min-h-[80px] p-4 rounded-xl resize-none focus-visible:ring-amber-500/50"
                  value={formatting}
                  onChange={(e) => setFormatting(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Base Page Color</label>
                  <div className="flex gap-2">
                    {['#ffffff', '#fdfbf7', '#f4f4f5', '#1e1e1e'].map(c => (
                      <button 
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-10 h-10 rounded-full border-2 ${color === c ? 'border-amber-500 shadow-md scale-110' : 'border-border/50'} transition-all`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Booklet Size</label>
                  <select 
                    value={size} 
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full h-10 bg-muted/50 border-border rounded-xl px-3 outline-none focus-visible:ring-2 ring-amber-500/50"
                  >
                    <option value="A4">A4 (Standard Document)</option>
                    <option value="A5">A5 (Novel Size)</option>
                    <option value="US Letter">US Letter</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in-0 duration-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-foreground">Initial Planning (Architect Agent)</h3>
                  {outline && (
                     <Button variant="outline" size="sm" onClick={() => setOutline(null)}>Reset Plan</Button>
                  )}
                </div>
                
                {!outline ? (
                   <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
                     <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <BookOpen className="h-6 w-6" />
                     </div>
                     <div>
                       <h4 className="font-medium text-amber-900 dark:text-amber-400 mb-1">Let the Architect construct your hierarchy</h4>
                       <p className="text-sm text-amber-700/80 dark:text-amber-500/80 max-w-md mx-auto">
                         Based on your {uploadedContext ? 'uploaded context files and ' : ''}topic, our specialized agent will devise the perfect structural blueprint (volumes, episodes, chapters, etc.). You can modify this later.
                       </p>
                     </div>
                     
                     <Button 
                       onClick={handleGeneratePlan} 
                       disabled={isGeneratingOutline}
                       className="bg-amber-600 hover:bg-amber-700 text-white mt-2"
                     >
                       {isGeneratingOutline ? (
                         <div className="flex items-center gap-2">
                           <Loader2 className="w-4 h-4 animate-spin" /> Abstracting Structure...
                         </div>
                       ) : (
                         <div className="flex items-center gap-2">
                           <Play className="w-4 h-4" /> Formulate Blueprint
                         </div>
                       )}
                     </Button>
                   </div>
                ) : (
                  <div className="bg-card border border-border p-5 rounded-xl h-64 overflow-y-auto">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Proposed Hierarchy</p>
                    {renderOutlineTree(outline)}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in-0 duration-300">
               <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Project DNA Preview</h3>
                <p className="text-sm text-muted-foreground">This is the informational context file that will be sent to the background agents when they interact with your book. It contains no conversational fluff.</p>
                
                <div className="bg-card border border-border p-5 rounded-xl text-sm font-mono whitespace-pre-wrap h-64 overflow-y-auto text-muted-foreground">
{`# Book DNA
Title: ${title || 'Untitled'}
Topic: ${topic || 'Not specified'}

## Synthesized Constraints
Tone:
${tone || 'Using standard AI tone.'}

Formatting:
${formatting || 'Standard conventions.'}
`}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-muted/20 border-t border-border flex justify-between items-center rounded-b-[2rem]">
          <Button 
            variant="ghost" 
            onClick={prevStep}
            disabled={step === 1 || loading}
            className="rounded-xl px-5 hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          
          {step < 5 ? (
            <Button 
              onClick={nextStep}
              disabled={(step === 1 && !topic.trim()) || loading || (step === 4 && !outline)}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-8 shadow-md disabled:opacity-50"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleCreate}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-8 shadow-md overflow-hidden relative"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  Initializing...
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                </div>
              ) : (
                <>Initialize Book Engine <Wand2 className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
