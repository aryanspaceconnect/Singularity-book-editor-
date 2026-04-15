import { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI, ThinkingLevel, Type, FunctionDeclaration } from '@google/genai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Settings2, Key } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAI } from '../lib/ai-context';

const updateCanvasFunctionDeclaration: FunctionDeclaration = {
  name: "updateCanvasContent",
  description: "Update the content of the book canvas. Use this to make edits, add chapters, or rewrite sections as requested by the user. Provide the full HTML content.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      newHtmlContent: {
        type: Type.STRING,
        description: "The new HTML content for the canvas. This will replace the current content or append to it based on your logic. Use standard HTML tags like <h1>, <p>, <strong>, etc."
      }
    },
    required: ["newHtmlContent"]
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

export default function SidekickChat({ projectId, userId, canvasContent }: { projectId: string, userId: string, canvasContent: string }) {
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
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          tools: [{ functionDeclarations: [updateCanvasFunctionDeclaration, updateBookMetadataFunctionDeclaration] }],
          systemInstruction: `You are the Sidekick Model in the Singularity Book Studio. 
You are the user's main point of contact. You observe the entire system (the book canvas, the worker agents, the cache writer).
Your job is to chat with the user, understand their intent for the book, and explain what the system is doing.
If the user asks to make a change to the book, you MUST use the 'updateCanvasContent' tool to make the changes. You act as the Cache Writer when you use this tool.
If the user asks to change the book's title or description (or if it makes sense based on the story's evolution), use the 'updateBookMetadata' tool.

Here is the current state of the book's canvas (in JSON format):
${canvasContent}`,
        }
      });

      const response = await chat.sendMessage({ message: userMsg });
      
      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === 'updateCanvasContent') {
            const args = call.args as any;
            if (args.newHtmlContent) {
              const docRef = doc(db, 'projects', projectId, 'canvas', 'main');
              await setDoc(docRef, {
                content: args.newHtmlContent,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          } else if (call.name === 'updateBookMetadata') {
            const args = call.args as any;
            if (args.title || args.description) {
              const projectRef = doc(db, 'projects', projectId);
              const updateData: any = { updatedAt: new Date().toISOString() };
              if (args.title) updateData.title = args.title;
              if (args.description) updateData.description = args.description;
              await setDoc(projectRef, updateData, { merge: true });
            }
          }
        }
      }

      await addDoc(messagesRef, {
        role: 'assistant',
        content: response.text || "I have updated the canvas.",
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
                {msg.content}
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
