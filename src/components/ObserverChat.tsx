import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel, Type, FunctionDeclaration } from '@google/genai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

export default function ObserverChat({ projectId, userId, canvasContent }: { projectId: string, userId: string, canvasContent: string }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
          tools: [{ functionDeclarations: [updateCanvasFunctionDeclaration] }],
          systemInstruction: `You are the Observer Model in the Singularity Book Studio. 
You are the user's main point of contact. You observe the entire system (the book canvas, the worker agents, the cache writer).
Your job is to chat with the user, understand their intent for the book, and explain what the system is doing.
If the user asks to make a change to the book, you MUST use the 'updateCanvasContent' tool to make the changes. You act as the Cache Writer when you use this tool.

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
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-zinc-800 bg-zinc-950">
        <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
          <Bot className="h-5 w-5 text-emerald-500" />
          Observer
        </h2>
        <p className="text-xs text-zinc-500 mt-1">System monitor & orchestrator</p>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-zinc-500 text-sm mt-10">
              Hello! I am the Observer. I monitor the book's progress and coordinate the AI agents. What would you like to work on today?
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-zinc-800' : 'bg-emerald-950 border border-emerald-900'}`}>
                {msg.role === 'user' ? <User className="h-4 w-4 text-zinc-300" /> : <Bot className="h-4 w-4 text-emerald-500" />}
              </div>
              <div className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-950 border border-emerald-900">
                <Bot className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="rounded-lg px-3 py-2 text-sm bg-zinc-900 text-zinc-500 border border-zinc-800 flex items-center gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-zinc-800 bg-zinc-950">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Ask the Observer..." 
            className="bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isTyping} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
