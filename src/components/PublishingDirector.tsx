import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAI } from '../lib/ai-context';
import { Editor } from '@tiptap/react';
import { ShieldCheck, BookOpenCheck, Wand2, FileText, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function PublishingDirector({ editor }: { editor: Editor }) {
  const { ai } = useAI();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // State for Intent
  const [intentPrompt, setIntentPrompt] = useState('');
  
  // State for Legality
  const [legalityReport, setLegalityReport] = useState<any>(null);
  
  // State for Validation
  const [validationReport, setValidationReport] = useState<any>(null);

  const handleTypeset = async () => {
    if (!editor) return;
    setLoading(true);
    try {
      const currentText = editor.getText();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Act as an expert book typesetter and formatter. Review the following manuscript and apply professional formatting.
        
1. Ensure consistent paragraph spacing.
2. Add appropriate chapter headings (<h1>, <h2>).
3. Fix any weird spacing or alignment issues.
4. Apply <em> for emphasis where appropriate.
5. Do not change the actual words or story, ONLY the formatting.

Text:
${currentText}

Return ONLY the HTML formatted text. Do not include markdown blocks like \`\`\`html.`,
        config: {
          systemInstruction: "You are a master typesetter. Return only raw HTML."
        }
      });

      if (response.text) {
        const cleanHtml = response.text.replace(/^```html\n?/, '').replace(/\n?```$/, '');
        editor.chain().focus().setContent(cleanHtml).run();
        setOpen(false);
      }
    } catch (error) {
      console.error("Failed to typeset:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDraft = async () => {
    if (!editor || !intentPrompt) return;
    setLoading(true);
    try {
      const currentText = editor.getText();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Act as an expert author. Based on the following intent, write the next section of the book.
        
Intent: ${intentPrompt}

Previous Context (if any):
${currentText.slice(-3000)}

Return ONLY the HTML formatted text (using <p>, <h2>, etc.). Do not include markdown blocks like \`\`\`html.`,
        config: {
          systemInstruction: "You are a master storyteller. Write compelling, well-paced prose that matches the requested intent. Return only raw HTML."
        }
      });

      if (response.text) {
        const cleanHtml = response.text.replace(/^```html\n?/, '').replace(/\n?```$/, '');
        editor.chain().focus().insertContent('<br/>' + cleanHtml).run();
        setOpen(false);
        setIntentPrompt('');
      }
    } catch (error) {
      console.error("Failed to auto-draft:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLegalityCheck = async () => {
    if (!editor) return;
    setLoading(true);
    try {
      const text = editor.getText();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Analyze the following book manuscript for potential legal risks. Check for:
1. Plagiarism/Copyright risks (mentioning copyrighted lyrics, heavily borrowing from known IP).
2. Defamation/Libel (using real people/brands in a negative light).
3. Sensitive content warnings.

Text:
${text}

Return the result STRICTLY as a JSON object with this structure:
{
  "issues": [
    { "type": "copyright|libel|sensitive", "severity": "high|medium|low", "textSnippet": "...", "explanation": "...", "suggestion": "..." }
  ]
}
Do not include markdown blocks, just the raw JSON.`,
        config: {
          responseMimeType: "application/json",
        }
      });

      if (response.text) {
        setLegalityReport(JSON.parse(response.text));
      }
    } catch (error) {
      console.error("Failed to check legality:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidationCheck = async () => {
    if (!editor) return;
    setLoading(true);
    try {
      const text = editor.getText();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Analyze the following book manuscript as a developmental editor. Check for:
1. Plot holes or unresolved threads.
2. Character consistency (actions matching established traits).
3. Pacing issues.

Text:
${text}

Return the result STRICTLY as a JSON object with this structure:
{
  "issues": [
    { "type": "plot_hole|character|pacing", "severity": "high|medium|low", "description": "...", "suggestion": "..." }
  ]
}
Do not include markdown blocks, just the raw JSON.`,
        config: {
          responseMimeType: "application/json",
        }
      });

      if (response.text) {
        setValidationReport(JSON.parse(response.text));
      }
    } catch (error) {
      console.error("Failed to validate story:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderSeverity = (severity: string) => {
    switch (severity) {
      case 'high': return <span className="text-red-500 font-bold uppercase text-xs">High Risk</span>;
      case 'medium': return <span className="text-amber-500 font-bold uppercase text-xs">Medium Risk</span>;
      case 'low': return <span className="text-blue-500 font-bold uppercase text-xs">Low Risk</span>;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-900/50" />}>
        <Wand2 className="h-4 w-4" />
        Director Mode
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Publishing Director</DialogTitle>
          <DialogDescription>
            Guide the AI to autonomously draft, validate, and check your manuscript.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="intent" className="flex-1 flex flex-col mt-4 min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="intent"><FileText className="w-4 h-4 mr-2"/> Auto-Draft</TabsTrigger>
            <TabsTrigger value="validation"><BookOpenCheck className="w-4 h-4 mr-2"/> Validation</TabsTrigger>
            <TabsTrigger value="legality"><ShieldCheck className="w-4 h-4 mr-2"/> Legality</TabsTrigger>
            <TabsTrigger value="formatting"><Wand2 className="w-4 h-4 mr-2"/> Typeset</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 mt-4 pr-4">
            <TabsContent value="intent" className="space-y-4 mt-0">
              <div className="space-y-2">
                <label className="text-sm font-medium">What should happen next?</label>
                <Textarea 
                  placeholder="e.g., Write a thrilling chase scene through the neon-lit streets of Neo-Tokyo. The protagonist should barely escape."
                  value={intentPrompt}
                  onChange={(e) => setIntentPrompt(e.target.value)}
                  className="min-h-[150px] resize-none"
                />
              </div>
              <Button 
                onClick={handleAutoDraft} 
                disabled={!intentPrompt || loading}
                className="w-full gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Execute Intent
              </Button>
            </TabsContent>

            <TabsContent value="validation" className="space-y-4 mt-0">
              <div className="flex justify-between items-center">
                <p className="text-sm text-zinc-500">Scan for plot holes, character inconsistencies, and pacing issues.</p>
                <Button onClick={handleValidationCheck} disabled={loading} size="sm" variant="secondary">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BookOpenCheck className="h-4 w-4 mr-2" />}
                  Run Validation
                </Button>
              </div>
              
              {validationReport && (
                <div className="space-y-4 mt-4">
                  {validationReport.issues.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-4 rounded-lg">
                      <CheckCircle2 className="h-5 w-5" />
                      <p className="font-medium">No major issues found! Your story is solid.</p>
                    </div>
                  ) : (
                    validationReport.issues.map((issue: any, i: number) => (
                      <div key={i} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold capitalize text-zinc-900 dark:text-zinc-100">{issue.type.replace('_', ' ')}</span>
                          {renderSeverity(issue.severity)}
                        </div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{issue.description}</p>
                        <div className="text-sm bg-white dark:bg-zinc-950 p-3 rounded border border-zinc-100 dark:border-zinc-800">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400 block mb-1">AI Suggestion:</span>
                          {issue.suggestion}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="legality" className="space-y-4 mt-0">
              <div className="flex justify-between items-center">
                <p className="text-sm text-zinc-500">Scan for copyright infringement, libel, and sensitive content.</p>
                <Button onClick={handleLegalityCheck} disabled={loading} size="sm" variant="secondary">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Run Legal Scan
                </Button>
              </div>

              {legalityReport && (
                <div className="space-y-4 mt-4">
                  {legalityReport.issues.length === 0 ? (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-4 rounded-lg">
                      <CheckCircle2 className="h-5 w-5" />
                      <p className="font-medium">No legal or compliance risks detected.</p>
                    </div>
                  ) : (
                    legalityReport.issues.map((issue: any, i: number) => (
                      <div key={i} className="p-4 rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="font-semibold capitalize text-zinc-900 dark:text-zinc-100">{issue.type}</span>
                          </div>
                          {renderSeverity(issue.severity)}
                        </div>
                        {issue.textSnippet && (
                          <blockquote className="text-xs italic border-l-2 border-red-200 dark:border-red-800 pl-2 text-zinc-600 dark:text-zinc-400">
                            "{issue.textSnippet}"
                          </blockquote>
                        )}
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{issue.explanation}</p>
                        <div className="text-sm bg-white dark:bg-zinc-950 p-3 rounded border border-red-100 dark:border-red-900/30">
                          <span className="font-semibold text-red-600 dark:text-red-400 block mb-1">Recommendation:</span>
                          {issue.suggestion}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="formatting" className="space-y-4 mt-0">
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-full">
                  <Wand2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Professional Typesetting</h3>
                  <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-2">
                    Let the AI review your entire manuscript to ensure consistent paragraph spacing, appropriate chapter headings, and professional formatting.
                  </p>
                </div>
                <Button onClick={handleTypeset} disabled={loading} className="gap-2 mt-4">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Format & Typeset Document
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
