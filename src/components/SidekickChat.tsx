import { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, ThinkingLevel, Type, FunctionDeclaration } from '@google/genai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Settings2, Key, Plus } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Markdown from 'react-markdown';
import { useAI } from '../lib/ai-context';

const updateCanvasFunctionDeclaration: FunctionDeclaration = {
  name: "updateCanvasContent",
  description: "Update the content of the book canvas. Use this to make edits, add chapters, or rewrite sections as requested by the user. Provide the full HTML content.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      newHtmlContent: {
        type: Type.STRING,
        description: "The new HTML content for the canvas. Use standard HTML tags like <h1>, <p>, <strong>. Advanced formatting: <span style=\"color: #hex\">, <mark data-color=\"#hex\">, <span style=\"font-size: 24px\">, <span style=\"font-family: 'Inter'\">. For scene breaks: <div class=\"scene-break\"></div>. For callouts: <div class=\"callout\" data-type=\"info|warning|success|error\">content</div>. For tables: standard <table> tags."
      }
    },
    required: ["newHtmlContent"]
  }
};

const appendToCanvasFunctionDeclaration: FunctionDeclaration = {
  name: "appendToCanvas",
  description: "Append new HTML content to the very end of the book canvas. Use this when continuing a story or adding new sections to preserve tokens and avoid rewriting the entire document.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appendedHtmlContent: {
        type: Type.STRING,
        description: "The HTML content to seamlessly append to the existing content.",
      }
    },
    required: ["appendedHtmlContent"]
  }
};

const updateBookMetadataFunctionDeclaration: FunctionDeclaration = {
  name: "updateBookMetadata",
  description: "Update the title and description of the book based on the user's request or the current context of the story.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "The new title for the book."
      },
      description: {
        type: Type.STRING,
        description: "The new description or synopsis for the book."
      }
    },
    required: ["title", "description"]
  }
};

export default function SidekickChat({ projectId, userId, canvasText, canvasHtml }: { projectId: string, userId: string, canvasText: string, canvasHtml: string }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localApiKey, setLocalApiKey] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { ai, observerApiKey, universalApiKey } = useAI();

  useEffect(() => {
    setLocalApiKey(observerApiKey || '');
  }, [observerApiKey]);

  const handleSaveApiKey = async (newKey: string) => {
    setLocalApiKey(newKey);
    try {
      await setDoc(doc(db, 'projects', projectId), { observerApiKey: newKey }, { merge: true });
    } catch (error) {
      console.error("Error saving observer API key:", error);
    }
  };

  const messagesRef = collection(db, 'projects', projectId, 'messages');

  useEffect(() => {
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });
    return () => unsubscribe();
  }, [projectId]);

  const sidekickFileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const snippet = text.substring(0, 500) + (text.length > 500 ? '...' : '');
      await addDoc(messagesRef, {
        role: 'user',
        content: `Attached file: ${file.name}\n\nContents:\n${text}`,
        displayContent: `[Attached Document: ${file.name}]\n\n*${snippet}*`,
        createdAt: serverTimestamp()
      });
    };
    reader.readAsText(file);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    
    await addDoc(messagesRef, {
      role: 'user',
      content: userMsg,
      createdAt: serverTimestamp()
    });

    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const chat = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        history: history,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          tools: [{ functionDeclarations: [updateCanvasFunctionDeclaration, appendToCanvasFunctionDeclaration, updateBookMetadataFunctionDeclaration] }],
          systemInstruction: `You are the Sidekick Model in the Singularity Book Studio. 
You are the user's main point of contact. You observe the entire system (the book canvas, the worker agents, the cache writer).
Your job is to chat with the user, understand their intent for the book, and explain what the system is doing.
If the user asks to modify the existing book, you MUST use the 'updateCanvasContent' tool to make the changes. 
If the user asks to add new content, continue the story, or append new sections, you MUST use the 'appendToCanvas' tool to preserve tokens and avoid rewriting the entire document.
If the user asks to change the book's title or description (or if it makes sense based on the story's evolution), use the 'updateBookMetadata' tool.

CRITICAL WRITING CONSTRAINTS:
- NEVER use common AI filler phrases like "In conclusion", "As we delve into", "It's important to note", or summarize outputs needlessly.
- Be extremely direct and let the writing speak for itself.
- When generating chapters, ensure they are substantial and long (minimum 8-10 paragraphs), do not just write 2 short paragraphs and stop unless explicitly asked.
- Avoid flowery, cliché language. Follow the user's Tone & Style preferences strictly.

NOTE REGARDING MODIFICATIONS: You do not have permission to change the canvas directly. Using 'updateCanvasContent' or 'appendToCanvas' will propose the change to the user, creating a pending action that they must confirm. When the tool returns "pending", tell the user you have prepared the change and ask them to approve it using the buttons in the chat.

Here is the current text of the book's canvas:
${canvasText}`,
        }
      });

      let response = await chat.sendMessage({ message: userMsg });
      
      let functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const functionResponses = [];
        for (const call of functionCalls) {
          if (call.name === 'updateCanvasContent') {
            const args = call.args as any;
            if (args.newHtmlContent) {
              let cleanHtml = args.newHtmlContent.trim();
              if (cleanHtml.startsWith('```html')) {
                cleanHtml = cleanHtml.replace(/^```html\n?/, '').replace(/```$/, '').trim();
              } else if (cleanHtml.startsWith('```')) {
                cleanHtml = cleanHtml.replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
              }
              await addDoc(messagesRef, {
                role: 'assistant',
                content: 'I have prepared a complete rewrite of the document. Please review and confirm to overwrite the current canvas using the buttons below.',
                proposal: {
                  type: 'update',
                  html: cleanHtml
                },
                createdAt: serverTimestamp()
              });
              
              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: { status: "pending", message: "Proposed to user. Waiting for confirmation. Stop writing and await their response." }
                }
              });
            } else {
              functionResponses.push({
                 functionResponse: {
                   name: call.name,
                   response: { status: "error", message: "Missing newHtmlContent" }
                 }
              });
            }
          } else if (call.name === 'appendToCanvas') {
            const args = call.args as any;
            if (args.appendedHtmlContent) {
              let cleanHtml = args.appendedHtmlContent.trim();
              if (cleanHtml.startsWith('```html')) {
                cleanHtml = cleanHtml.replace(/^```html\n?/, '').replace(/```$/, '').trim();
              } else if (cleanHtml.startsWith('```')) {
                cleanHtml = cleanHtml.replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
              }
              
              const updatedHtml = (canvasHtml || '') + "\n" + cleanHtml;
              
              await addDoc(messagesRef, {
                role: 'assistant',
                content: 'I have generated additional content to append. Please review and confirm using the buttons below.',
                proposal: {
                  type: 'append',
                  html: updatedHtml
                },
                createdAt: serverTimestamp()
              });
              
              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: { status: "pending", message: "Proposed to user. Waiting for confirmation. Stop writing and await their response." }
                }
              });
            } else {
              functionResponses.push({
                 functionResponse: {
                   name: call.name,
                   response: { status: "error", message: "Missing appendedHtmlContent" }
                 }
              });
            }
          } else if (call.name === 'updateBookMetadata') {
            const args = call.args as any;
            if (args.title || args.description) {
              const projectRef = doc(db, 'projects', projectId);
              const updateData: any = { updatedAt: new Date().toISOString() };
              if (args.title) updateData.title = args.title;
              if (args.description) updateData.description = args.description;
              await setDoc(projectRef, updateData, { merge: true });
              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: { status: "success", message: "Metadata updated successfully." }
                }
              });
            } else {
               functionResponses.push({
                 functionResponse: {
                   name: call.name,
                   response: { status: "error", message: "Missing title or description" }
                 }
               });
            }
          }
        }
        
        // Send function responses back to Gemini to get a final natural language answer
        response = await chat.sendMessage({ message: functionResponses });
      }

      await addDoc(messagesRef, {
        role: 'assistant',
        content: response.text || "I have executed your request.",
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      await addDoc(messagesRef, {
        role: 'assistant',
        content: "Error: Could not connect to the Sidekick AI. Please check your API key in settings.",
        createdAt: serverTimestamp()
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleApproveProposal = async (msgId: string, proposal: any) => {
    try {
      if (proposal.type === 'update') {
        await addDoc(collection(db, 'projects', projectId, 'versions'), {
          name: 'Backup before AI rewrite',
          content: canvasHtml,
          type: 'auto',
          createdAt: serverTimestamp()
        });
      }

      const docRef = doc(db, 'projects', projectId, 'canvas', 'main');
      await setDoc(docRef, {
        content: proposal.html,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await setDoc(doc(db, 'projects', projectId, 'messages', msgId), {
        proposalStatus: 'approved'
      }, { merge: true });
    } catch (err) {
      console.error("Error approving proposal:", err);
    }
  };

  const handleRejectProposal = async (msgId: string) => {
    try {
      await setDoc(doc(db, 'projects', projectId, 'messages', msgId), {
        proposalStatus: 'rejected'
      }, { merge: true });
    } catch (err) {
      console.error("Error rejecting proposal:", err);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="p-5 border-b border-border bg-muted/50 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Sidekick
          </h2>
          <p className="text-xs text-muted-foreground mt-1">System monitor & orchestrator</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className="text-muted-foreground hover:text-foreground rounded-full">
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>
      
      {showSettings && (
        <div className="p-4 bg-muted border-b border-border">
          <label className="text-xs font-medium text-foreground flex items-center gap-2 mb-2">
            <Key className="h-3 w-3" /> Sidekick API Key (Gemini)
          </label>
          <Input 
            type="password"
            value={localApiKey}
            onChange={(e) => handleSaveApiKey(e.target.value)}
            placeholder={universalApiKey ? "Using Universal API Key" : "Enter Gemini API Key"}
            className="bg-background border-border text-sm h-8"
          />
          <p className="text-[10px] text-muted-foreground mt-2">Overrides the Universal API Key for this project's Sidekick.</p>
        </div>
      )}

      <div className="flex-1 p-5 overflow-y-auto" ref={scrollRef}>
        <div className="space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm mt-10">
              Hello! I am your Sidekick. I monitor the book's progress and coordinate the AI agents. What would you like to work on today?
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-muted' : 'bg-primary/20 border border-primary/30'}`}>
                {msg.role === 'user' ? <User className="h-4 w-4 text-muted-foreground" /> : <Bot className="h-4 w-4 text-primary" />}
              </div>
              <div className={`rounded-2xl px-4 py-2.5 text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-muted text-foreground rounded-tr-sm' : 'bg-card text-card-foreground border border-border rounded-tl-sm shadow-sm'}`}>
                {msg.role === 'user' ? msg.content : (
                  <div className="flex flex-col gap-3">
                    <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                    {msg.proposal && !msg.proposalStatus && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border flex flex-col gap-2">
                        <p className="text-xs font-medium">Pending Action: {msg.proposal.type === 'update' ? 'Overwrite Canvas' : 'Append to Canvas'}</p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApproveProposal(msg.id, msg.proposal)} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8">Approve</Button>
                          <Button size="sm" onClick={() => handleRejectProposal(msg.id)} variant="outline" className="flex-1 text-xs h-8">Reject</Button>
                        </div>
                      </div>
                    )}
                    {msg.proposalStatus && (
                      <div className={`mt-2 p-2 rounded-md text-xs font-medium border ${msg.proposalStatus === 'approved' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                        {msg.proposalStatus === 'approved' ? '✓ Approved and applied' : '✕ Rejected'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-card text-muted-foreground border border-border flex items-center gap-1 shadow-sm">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border bg-muted/50">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <input 
            type="file" 
            accept=".txt,.md" 
            ref={sidekickFileInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="shrink-0 text-muted-foreground hover:text-foreground rounded-full" 
            onClick={() => sidekickFileInputRef.current?.click()}
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Ask your Sidekick..." 
            className="bg-background border-border focus-visible:ring-primary rounded-full px-4"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isTyping} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shrink-0 shadow-sm">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
