import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Sparkles, Wand2, Search, ArrowRight, ArrowLeft } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
// Optional: we can integrate AI context later to format the tone via summarize.

interface BookWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onProjectCreated: (projectId: string) => void;
}

export default function BookWizardDialog({ open, onOpenChange, userId, onProjectCreated }: BookWizardDialogProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Wizards state
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('');
  const [formatting, setFormatting] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [size, setSize] = useState('A4');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

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

      onProjectCreated(projectId);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
                <label className="text-sm font-medium text-foreground">What is the topic of your book?</label>
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
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in-0 duration-300">
               <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-sm text-amber-700 dark:text-amber-400">
                <Wand2 className="h-5 w-5 shrink-0" />
                <p>Define the tone here. You can paste snippets of text, references, or styles you like. The AI will synthesize this into the book's DNA later.</p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Tone & Style of Writing</label>
                <Textarea 
                  placeholder="Conversational but authoritative. Like Malcolm Gladwell meets technical documentation."
                  className="bg-muted/50 border-border min-h-[120px] text-base p-4 rounded-xl resize-none focus-visible:ring-amber-500/50"
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
          
          {step < 4 ? (
            <Button 
              onClick={nextStep}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-8 shadow-md"
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleCreate}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-8 shadow-md"
            >
              Initialize Book Engine <Wand2 className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
