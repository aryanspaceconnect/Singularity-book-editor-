import { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, ThinkingLevel, Type, FunctionDeclaration } from '@google/genai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Settings2, Key, Plus, ListTodo, ChevronDown, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Markdown from 'react-markdown';
import { useAI } from '../lib/ai-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup } from '@/components/ui/dropdown-menu';

const updateCanvasFunctionDeclaration: FunctionDeclaration = {
  name: "updateCanvasContent",
  description: "Update the content of the book canvas. Use this to make edits, add chapters, replace sections, or delete parts. Provide the full HTML content.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      actionSummary: {
        type: Type.STRING,
        description: "A short, 3-5 word summary of the action (e.g., 'Rewrite Chapter 1', 'Delete The Intro', 'Start New Book')."
      },
      newHtmlContent: {
        type: Type.STRING,
        description: "The new HTML content for the canvas. Use standard HTML tags like <h1>, <p>, <strong>. Advanced formatting: <span style=\"color: #hex\">, <mark data-color=\"#hex\">, <span style=\"font-size: 24px\">, <span style=\"font-family: 'Inter'\">. For scene breaks: <div class=\"scene-break\"></div>. For callouts: <div class=\"callout\" data-type=\"info|warning|success|error\">content</div>. For tables: standard <table> tags."
      }
    },
    required: ["actionSummary", "newHtmlContent"]
  }
};

const appendToCanvasFunctionDeclaration: FunctionDeclaration = {
  name: "appendToCanvas",
  description: "Append new HTML content to the very end of the book canvas. Use this when continuing a story or adding new sections to preserve tokens and avoid rewriting the entire document.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      actionSummary: {
        type: Type.STRING,
        description: "A short, 3-5 word summary of the action (e.g., 'Draft next chapter', 'Add conclusion', 'Expand backstory')."
      },
      appendedHtmlContent: {
        type: Type.STRING,
        description: "The HTML content to seamlessly append to the existing content.",
      }
    },
    required: ["actionSummary", "appendedHtmlContent"]
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

const proposeBookPlanFunctionDeclaration: FunctionDeclaration = {
  name: "proposeBookPlan",
  description: "Propose a structured book skeleton/plan when the user asks to start a new book or plan out the chapters. This will show a preview to the user. Ask follow-up clarifying questions BEFORE using this tool if the idea is vague.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      actionSummary: {
        type: Type.STRING,
        description: "A short, 3-5 word summary of the action (e.g., 'Draft a thriller skeleton', 'Plan out the course')."
      },
      planTextRepresentation: {
        type: Type.STRING,
        description: "A beautifully formatted HTML representation of the skeleton. This will be placed in the canvas explicitly."
      },
      plan: {
        type: Type.ARRAY,
        description: "Array of top-level book parts/chapters.",
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            type: { type: Type.STRING, description: "e.g., 'frontmatter', 'chapter', 'backmatter'" },
            title: { type: Type.STRING },
            description: { type: Type.STRING, description: "Brief summary or instructions for this specific node" },
            children: {
              type: Type.ARRAY,
              description: "Optional subtopics",
              items: {
                 type: Type.OBJECT,
                 properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, description: { type: Type.STRING } }
              }
            }
          },
          required: ["id", "type", "title"]
        }
      }
    },
    required: ["planTextRepresentation", "plan"]
  }
};

const writeNodeContentFunctionDeclaration: FunctionDeclaration = {
  name: "writeNodeContent",
  description: "Generate and append the content for a specific node in the book plan (e.g., Chapter 1). This will advance the progress to the next step.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      actionSummary: {
        type: Type.STRING,
        description: "A short, 3-5 word summary of what is being written."
      },
      nodeId: { type: Type.STRING, description: "The ID of the node you are writing." },
      htmlContent: { type: Type.STRING, description: "The content to seamlessly append to the canvas." }
    },
    required: ["actionSummary", "nodeId", "htmlContent"]
  }
};

export default function SidekickChat({ projectId, userId, canvasText, canvasHtml }: { projectId: string, userId: string, canvasText: string, canvasHtml: string }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [localApiKey, setLocalApiKey] = useState('');
  const [projectData, setProjectData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { ai, observerApiKey, universalApiKey } = useAI();

  useEffect(() => {
    setLocalApiKey(observerApiKey || '');
  }, [observerApiKey]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'projects', projectId), (docItem) => {
      setProjectData(docItem.data() || {});
    });
    return () => unsub();
  }, [projectId]);

  const bookPlan = projectData?.bookPlan || null;
  const activeNodeId = projectData?.activeNodeId || null;

  // Flatten the tree to easily find nodes and their status
  const flatNodes = useMemo(() => {
    if (!bookPlan) return [];
    const flat: any[] = [];
    const flatten = (nodes: any[], level = 0) => {
       for (let n of nodes) {
         flat.push({ ...n, level });
         if (n.children && n.children.length > 0) flatten(n.children, level + 1);
       }
    };
    flatten(bookPlan);
    return flat;
  }, [bookPlan]);

  const activeNode = useMemo(() => flatNodes.find(n => n.id === activeNodeId), [flatNodes, activeNodeId]);

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
      setMessages(snapshot.docs.map(docItem => ({ id: docItem.id, ...docItem.data() })));
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

      // Inject the current plan state into the system prompt
      let planStateContext = "";
      if (bookPlan) {
        planStateContext = `
THE CURRENT BOOK PLAN SKELETON:
${JSON.stringify(bookPlan, null, 2)}
`;
        if (activeNode) {
          planStateContext += `
CURRENT ACTIVE NODE (To be written next) ID: ${activeNode.id}
Title: ${activeNode.title}
Instructions: ${activeNode.description || 'None'}

You must linearly and strictly follow the active node. Use the writeNodeContent tool to write the content for this active node. When you use that tool, the system will automatically advance to the next node in the skeleton. Do NOT attempt to write out of order.`;
        } else {
          planStateContext += "\nThe book plan is completed or currently inactive.";
        }
      } else {
        planStateContext = "No book plan has been established yet. Ask follow-up questions to understand the concept, then use proposeBookPlan to generate a skeleton.";
      }

      const chat = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        history: history,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          tools: [{ functionDeclarations: [updateCanvasFunctionDeclaration, appendToCanvasFunctionDeclaration, updateBookMetadataFunctionDeclaration, proposeBookPlanFunctionDeclaration, writeNodeContentFunctionDeclaration] }],
          systemInstruction: `You are the Sidekick Model in the Singularity Book Studio. 
You are the user's main orchestrator and AI agent for writing a book.
Your process:
1. Ask several follow-up questions to understand the book. You cannot write well without these details.
2. Formulate a skeleton of the book (preface, chapters, subtopics, microtopics) using the 'proposeBookPlan' tool.
3. Once the skeleton is approved, you will systematically proceed step-by-step through the plan to expand each piece.

${planStateContext}

If the user asks to modify the existing book beyond the progression path, use the 'updateCanvasContent' or 'appendToCanvas' tools.
If the user asks to change the book's metadata, use the 'updateBookMetadata' tool.

CRITICAL WRITING CONSTRAINTS:
- Write substantial content. Chapters must be fully fleshed out, avoid summaries.
- Follow the exact tone & style implicitly requested or defined in the plan.
- Use explicit visual cues when formatting data (headings, line breaks).

NOTE REGARDING MODIFICATIONS: tools like 'updateCanvasContent', 'appendToCanvas', 'proposeBookPlan', and 'writeNodeContent' will propose the change. The user must confirm manually. Stop talking and await their response when returning a proposed state.`,
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
               let cleanHtml = args.newHtmlContent.trim().replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
               const actionSummary = args.actionSummary || "Update Canvas";
               await addDoc(messagesRef, { role: 'assistant', content: `I have prepared a proposed change: **${actionSummary}**. Please review the preview in the canvas and confirm.`, proposal: { type: 'update', html: cleanHtml, summary: actionSummary }, createdAt: serverTimestamp() });
               await setDoc(doc(db, 'projects', projectId, 'canvas', 'main'), { previewContent: cleanHtml }, { merge: true });
               functionResponses.push({ functionResponse: { name: call.name, response: { status: "pending", message: "Proposed to user." } } });
             }
          } else if (call.name === 'appendToCanvas') {
            const args = call.args as any;
             if (args.appendedHtmlContent) {
               let cleanHtml = args.appendedHtmlContent.trim().replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
               const updatedHtml = (canvasHtml || '') + "\n" + cleanHtml;
               const actionSummary = args.actionSummary || "Append content";
               await addDoc(messagesRef, { role: 'assistant', content: `I generated additional content to append: **${actionSummary}**. Please review the preview in the canvas and confirm.`, proposal: { type: 'append', html: updatedHtml, summary: actionSummary }, createdAt: serverTimestamp() });
               await setDoc(doc(db, 'projects', projectId, 'canvas', 'main'), { previewContent: updatedHtml }, { merge: true });
               functionResponses.push({ functionResponse: { name: call.name, response: { status: "pending", message: "Proposed to user." } } });
             }
          } else if (call.name === 'updateBookMetadata') {
             const args = call.args as any;
             if (args.title || args.description) {
               const updateData: any = { updatedAt: new Date().toISOString() };
               if (args.title) updateData.title = args.title;
               if (args.description) updateData.description = args.description;
               await setDoc(doc(db, 'projects', projectId), updateData, { merge: true });
               functionResponses.push({ functionResponse: { name: call.name, response: { status: "success", message: "Metadata updated successfully." } } });
             }
          } else if (call.name === 'proposeBookPlan') {
            const args = call.args as any;
            if (args.plan && args.planTextRepresentation) {
               const actionSummary = args.actionSummary || "Draft book skeleton";
               const previewHtml = `<div class="skeleton-plan" style="background-color: rgba(var(--primary), 0.1); padding: 1rem; border-radius: 8px;"><h2>Proposed Book Skeleton</h2>${args.planTextRepresentation}</div>`;
               const updatedHtml = ((canvasHtml || '') + "\n" + previewHtml);
               await addDoc(messagesRef, {
                 role: 'assistant',
                 content: `I have prepared a book skeleton based on our discussion: **${actionSummary}**. If you approve, it will be added to the canvas and stored as our active writing plan.`,
                 proposal: {
                   type: 'book_plan',
                   plan: args.plan,
                   html: previewHtml,
                   summary: actionSummary
                 },
                 createdAt: serverTimestamp()
               });
               await setDoc(doc(db, 'projects', projectId, 'canvas', 'main'), { previewContent: updatedHtml }, { merge: true });
               functionResponses.push({ functionResponse: { name: call.name, response: { status: "pending", message: "Proposed skeleton to user." } } });
            }
          } else if (call.name === 'writeNodeContent') {
            const args = call.args as any;
            if (args.nodeId && args.htmlContent) {
               let cleanHtml = args.htmlContent.trim().replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
               const updatedHtml = (canvasHtml || '') + "\n" + cleanHtml;
               const actionSummary = args.actionSummary || `Write section ${args.nodeId}`;
               
               await addDoc(messagesRef, {
                 role: 'assistant',
                 content: `Here is the content for section: ${args.nodeId} (**${actionSummary}**). Please review the preview and approve to progress the plan.`,
                 proposal: {
                   type: 'write_node',
                   nodeId: args.nodeId,
                   html: updatedHtml,
                   summary: actionSummary
                 },
                 createdAt: serverTimestamp()
               });
               await setDoc(doc(db, 'projects', projectId, 'canvas', 'main'), { previewContent: updatedHtml }, { merge: true });
               functionResponses.push({ functionResponse: { name: call.name, response: { status: "pending", message: "Proposed section content to user." } } });
            }
          }
        }
        
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
      if (proposal.type === 'update' || proposal.type === 'append' || proposal.type === 'write_node' || proposal.type === 'book_plan') {
        const updatedHtml = proposal.type === 'book_plan' ? ((canvasHtml || '') + "\n" + proposal.html) : proposal.html;

        const docRef = doc(db, 'projects', projectId, 'canvas', 'main');
        await setDoc(docRef, {
          content: updatedHtml,
          previewContent: null, // Clear preview
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      if (proposal.type === 'book_plan') {
         // Recursively set initial status to pending
         const initStatus = (nodes: any[]) => {
           return nodes.map(n => {
             const copy = { ...n, status: 'pending' };
             if (copy.children) copy.children = initStatus(copy.children);
             return copy;
           });
         };
         const structuredPlan = initStatus(proposal.plan);
         const firstNodeId = structuredPlan[0]?.id || null;
         
         await setDoc(doc(db, 'projects', projectId), {
            bookPlan: structuredPlan,
            activeNodeId: firstNodeId
         }, { merge: true });
      }

      if (proposal.type === 'write_node') {
        // Mark node as completed in plan and advance
        if (bookPlan) {
          const newPlan = JSON.parse(JSON.stringify(bookPlan));
          let nextId = null;
          
          // Better flatten traversal for 'nextId'
          const flat: any[] = [];
          const flatten = (nodes: any[]) => {
             for (let n of nodes) { flat.push(n); if(n.children) flatten(n.children); }
          };
          flatten(newPlan);
          const idx = flat.findIndex(n => n.id === proposal.nodeId);
          if (idx !== -1) {
            flat[idx].status = 'completed';
            for (let j = idx + 1; j < flat.length; j++) {
              if (flat[j].status === 'pending') {
                 nextId = flat[j].id;
                 break;
              }
            }
          }
          
          // Reflect status changes back to tree structure
          const reflectStatus = (nodes: any[]) => {
             for (let n of nodes) {
                const fNode = flat.find(f => f.id === n.id);
                if (fNode) n.status = fNode.status;
                if (n.children) reflectStatus(n.children);
             }
          };
          reflectStatus(newPlan);

          await setDoc(doc(db, 'projects', projectId), {
            bookPlan: newPlan,
            activeNodeId: nextId
          }, { merge: true });
        }
      }

      await setDoc(doc(db, 'projects', projectId, 'messages', msgId), {
        proposalStatus: 'approved'
      }, { merge: true });
    } catch (err) {
      console.error("Error approving proposal:", err);
    }
  };

  const handleRejectProposal = async (msgId: string) => {
    try {
      await setDoc(doc(db, 'projects', projectId, 'canvas', 'main'), { previewContent: null }, { merge: true });
      await setDoc(doc(db, 'projects', projectId, 'messages', msgId), {
        proposalStatus: 'rejected'
      }, { merge: true });
    } catch (err) {
      console.error("Error rejecting proposal:", err);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background relative">
      <div className="p-5 border-b border-border bg-muted/50 flex items-center justify-between z-10 shrink-0">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Sidekick
          </h2>
          <p className="text-xs text-muted-foreground mt-1">System monitor & orchestrator</p>
        </div>
        <div className="flex items-center gap-2">
          {bookPlan && (
            <DropdownMenu>
              <DropdownMenuTrigger className="h-8 text-xs flex items-center gap-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors shadow-sm rounded-full px-3">
                  <ListTodo className="h-3.5 w-3.5" /> 
                  <span className="hidden sm:inline">Book Plan</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-[60vh] overflow-y-auto rounded-xl border border-primary/20 shadow-lg p-2">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-bold text-sm mb-2 flex items-center gap-2">
                    <span className="bg-primary/10 flex h-6 w-6 items-center justify-center rounded-md">
                      <ListTodo className="h-4 w-4 text-primary" />
                    </span>
                    Master Book Plan
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/10" />
                  <div className="space-y-1 mt-2">
                    {flatNodes.map(node => (
                      <div 
                        key={node.id} 
                        className={`flex items-start gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors border ${node.id === activeNodeId ? 'bg-primary/5 border-primary/30 shadow-sm' : 'border-transparent hover:bg-muted'}`}
                        style={{ paddingLeft: `${Math.max(12, node.level * 16 + 12)}px` }}
                      >
                        <div className="mt-0.5 shrink-0">
                          {node.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : node.id === activeNodeId ? (
                            <div className="relative">
                              <Circle className="h-4 w-4 text-primary animate-pulse" />
                              <ArrowRight className="h-2.5 w-2.5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground opacity-40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className={`font-medium truncate ${node.status === 'completed' ? 'text-muted-foreground line-through' : node.id === activeNodeId ? 'text-primary' : 'text-foreground'}`}>
                             {node.title}
                           </div>
                           {node.description && (
                             <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight opacity-80">
                               {node.description}
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className="text-muted-foreground hover:text-foreground rounded-full h-8 w-8">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {showSettings && (
        <div className="p-4 bg-muted/80 backdrop-blur-sm border-b border-border z-10 shrink-0 shadow-inner">
          <label className="text-xs font-semibold text-foreground flex items-center gap-2 mb-2 uppercase tracking-wide opacity-80">
            <Key className="h-3 w-3" /> API Key Override
          </label>
          <Input 
            type="password"
            value={localApiKey}
            onChange={(e) => handleSaveApiKey(e.target.value)}
            placeholder={universalApiKey ? "Using Universal API Key" : "Enter Gemini API Key"}
            className="bg-background shadow-inner border-border text-sm h-9 rounded-lg"
          />
          <p className="text-[10px] text-muted-foreground mt-2">Will override the global key for this specific project.</p>
        </div>
      )}

      <div className="flex-1 p-5 overflow-y-auto z-0" ref={scrollRef}>
        <div className="space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm mt-10 p-6 bg-muted/30 rounded-2xl border border-border">
              Hello! I am your Sidekick. I monitor the book's progress and orchestrate our planning. Let's build a masterpiece! What are we writing today?
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-muted' : 'bg-primary/20 border border-primary/30'}`}>
                {msg.role === 'user' ? <User className="h-4 w-4 text-muted-foreground" /> : <Bot className="h-4 w-4 text-primary" />}
              </div>
              <div className={`rounded-2xl px-4 py-2.5 text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-muted text-foreground rounded-tr-sm' : 'bg-card text-card-foreground border border-border rounded-tl-sm shadow-sm'}`}>
                {msg.role === 'user' ? msg.content : (
                  <div className="flex flex-col gap-3">
                    <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                    {msg.proposal && !msg.proposalStatus && (
                      <div className="mt-3 p-4 bg-background/50 rounded-xl border border-border flex flex-col gap-3 shadow-inner">
                        <div className="flex items-center gap-2">
                           <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0"></div>
                           <p className="text-sm font-semibold truncate">
                             Pending: {msg.proposal.summary || "Approve action"}
                           </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Previewing directly in the canvas. Review the changes before confirming.
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Button size="sm" onClick={() => handleApproveProposal(msg.id, msg.proposal)} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium h-9 shadow-sm">
                            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                          </Button>
                          <Button size="sm" onClick={() => handleRejectProposal(msg.id)} variant="outline" className="flex-1 h-9 bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">Decline</Button>
                        </div>
                      </div>
                    )}
                    {msg.proposalStatus && (
                      <div className={`mt-2 p-2.5 rounded-lg text-xs font-semibold tracking-wide border flex items-center gap-2 ${msg.proposalStatus === 'approved' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                        {msg.proposalStatus === 'approved' ? <CheckCircle2 className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 opacity-50" />}
                        {msg.proposalStatus === 'approved' ? 'Approved & Applied ✓' : 'Rejected Action ✕'}
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
      
      {/* Chapter Indicator Bar */}
      {activeNode && (
         <div className="px-5 py-2.5 bg-primary/5 text-primary border-t border-primary/10 flex items-center gap-3 z-10 shrink-0">
           <div className="relative flex items-center justify-center w-5 h-5 bg-background rounded-full border border-primary/30 shadow-sm shrink-0">
             <ArrowRight className="h-3 w-3 text-primary animate-pulse" />
           </div>
           <p className="text-xs font-medium uppercase tracking-wider truncate">
             <span className="opacity-70 mr-2">In Progress:</span> {activeNode.title}
           </p>
         </div>
      )}

      <div className="p-4 border-t border-border bg-background z-10 shrink-0">
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
            className="shrink-0 text-muted-foreground hover:bg-muted rounded-xl h-11 w-11 transition-colors" 
            onClick={() => sidekickFileInputRef.current?.click()}
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Ask your Sidekick... let's tackle the next chapter." 
            className="bg-muted border-transparent focus-visible:ring-primary focus-visible:bg-background transition-colors rounded-xl px-4 h-11 shadow-inner text-sm font-medium"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isTyping} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 w-11 shrink-0 shadow-sm transition-transform active:scale-95">
            <Send className="h-4 w-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
