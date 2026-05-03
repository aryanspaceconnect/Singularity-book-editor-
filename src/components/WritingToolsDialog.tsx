import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book, Users, Loader2, Feather, Plus, Send, User, Bot, Trash2 } from "lucide-react";
import { db } from '../firebase';
import { collection, addDoc, getDocs, orderBy, query, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { useAI } from '../lib/ai-context';
import Markdown from 'react-markdown';

export default function WritingToolsDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("books");
  const { ai } = useAI();

  // Open Library (Books)
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState<any[]>([]);
  const [bookLoading, setBookLoading] = useState(false);

  const searchBooks = async () => {
    if (!bookQuery) return;
    setBookLoading(true);
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(bookQuery)}&limit=10`);
      const data = await res.json();
      setBookResults(data.docs || []);
    } catch (error) {
      console.error(error);
    } finally {
      setBookLoading(false);
    }
  };

  // AI Character Builder
  const [savedCharacters, setSavedCharacters] = useState<any[]>([]);
  const [charMessages, setCharMessages] = useState<{role: string, content: string}[]>([]);
  const [charInput, setCharInput] = useState('');
  const [charLoading, setCharLoading] = useState(false);
  const charScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (charScrollRef.current) {
      charScrollRef.current.scrollTop = charScrollRef.current.scrollHeight;
    }
  }, [charMessages, charLoading]);

  useEffect(() => {
    if (open && projectId && activeTab === 'characters') {
      loadSavedCharacters();
    }
  }, [open, projectId, activeTab]);

  const loadSavedCharacters = async () => {
    if (!projectId) return;
    try {
      const q = query(collection(db, 'projects', projectId, 'characters'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      setSavedCharacters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error loading characters", error);
    }
  };

  const removeCharacter = async (charId: string) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId, 'characters', charId));
      loadSavedCharacters();
    } catch(e) {
      console.error("Error removing character", e);
    }
  };

  const handleSendCharChat = async () => {
    if (!charInput.trim()) return;
    
    const userMsg = charInput.trim();
    setCharInput('');
    setCharMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setCharLoading(true);

    try {
      const history = charMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const charContextStr = savedCharacters.map(c => `- ${c.name} (${c.age}, ${c.gender}, ${c.location}): ${c.description || ''}`).join('\n');

      const chatWithHistory = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction: `You are a Character Development Agent. 
Your job is to brainstorm and refine character concepts with the user.

CURRENT CHARACTERS IN THE PROJECT:
${charContextStr || 'None yet.'}

RULES:
1. Brainstorm characters based on user requests. Ask follow-up questions to flesh them out.
2. Ask the user if they want to finalize and insert the character when the concept feels solid.
3. Once the user says "Yes" or confirms to insert the character, YOU MUST USE THE 'add_to_character_list' TOOL to save it. After calling the tool, tell the user it was added.
4. Ensure characters fit well with existing ones if applicable.`,
          tools: [{
            functionDeclarations: [
              {
                name: "add_to_character_list",
                description: "Once the character is finalized and the user confirms they want to insert it, call this tool to add the character to the project's character database.",
                parameters: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    age: { type: "string", description: "Age or age range (e.g. '25' or 'Unknown')" },
                    location: { type: "string" },
                    gender: { type: "string" },
                    description: { type: "string", description: "Detailed personality, physical traits, and role." }
                  },
                  required: ["name", "age", "location", "gender", "description"]
                }
              }
            ]
          }]
        },
        history: history
      });

      let response = await chatWithHistory.sendMessage({ message: userMsg });
      
      while (response.functionCalls && response.functionCalls.length > 0) {
        const fc = response.functionCalls[0];
        if (fc.name === 'add_to_character_list') {
          try {
             const charData = {
                name: fc.args?.name,
                age: fc.args?.age,
                location: fc.args?.location,
                gender: fc.args?.gender,
                description: fc.args?.description,
                createdAt: serverTimestamp()
             };
             await addDoc(collection(db, 'projects', projectId, 'characters'), charData);
             await loadSavedCharacters();
             
             response = await chatWithHistory.sendMessage({
                message: [{ functionResponse: { name: fc.name, response: { success: true } } }] as any
             });
          } catch(e) {
             console.error("Tool execution failed", e);
             response = await chatWithHistory.sendMessage({
                message: [{ functionResponse: { name: fc.name, response: { error: "Failed to add character." } } }] as any
             });
          }
        } else {
           break;
        }
      }

      const extractedText = response.candidates?.[0]?.content?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join('').trim() || '';
      setCharMessages(prev => [...prev, { role: 'assistant', content: extractedText || "Character process finalized." }]);
    } catch (error: any) {
      console.error("Error researching:", error);
      const msg = error?.message || "An unknown error occurred.";
      setCharMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setCharLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground rounded-full" />}>
        <Feather className="h-4 w-4 mr-2" />
        Writer Tools
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col pt-6 bg-card border-border overflow-hidden p-0">
        <DialogHeader className="px-6 shrink-0 pt-6">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Feather className="h-6 w-6 text-primary" />
            Writer Tools
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 mt-4">
          <TabsList className="grid grid-cols-2 w-full mb-4 bg-muted border-b border-border px-6 shrink-0 h-12">
            <TabsTrigger value="books" className="h-full">Research</TabsTrigger>
            <TabsTrigger value="characters" className="h-full">Characters</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 pb-6 mt-2">
            {/* Open Library Tab */}
            <TabsContent value="books" className="m-0 flex flex-col h-full space-y-4">
               <div className="flex gap-2 shrink-0">
                <Input 
                  placeholder="Search books, authors..." 
                  value={bookQuery} 
                  onChange={(e) => setBookQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchBooks()}
                  className="flex-1 border-border"
                />
                <Button onClick={searchBooks} disabled={bookLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 w-24 shrink-0">
                  {bookLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                </Button>
              </div>
              <div className="flex-1 border rounded-md border-border p-4 bg-background">
                 {bookResults.length === 0 && !bookLoading ? (
                   <div className="text-center text-muted-foreground pt-12">Search Open Library repository</div>
                 ) : (
                   <div className="space-y-4">
                      {bookResults.map((book, i) => (
                        <div key={i} className="bg-card text-card-foreground border rounded-lg border-border shadow-sm">
                          <div className="p-4 flex gap-4">
                             {book.cover_i ? (
                               <img src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`} alt="cover" className="w-12 h-16 object-cover rounded shadow" />
                             ) : (
                               <div className="w-12 h-16 bg-muted rounded shadow flex items-center justify-center shrink-0">
                                 <Book className="w-6 h-6 text-muted-foreground opacity-50" />
                               </div>
                             )}
                             <div>
                               <h4 className="font-bold text-foreground">{book.title}</h4>
                               {book.author_name && <p className="text-sm text-muted-foreground">{book.author_name.join(', ')}</p>}
                               {book.first_publish_year && <p className="text-xs text-muted-foreground mt-1">First published: {book.first_publish_year}</p>}
                             </div>
                          </div>
                        </div>
                      ))}
                   </div>
                 )}
              </div>
              <p className="text-xs text-muted-foreground shrink-0 text-right mt-2">Powered by Open Library API</p>
            </TabsContent>

            {/* Characters Tab */}
            <TabsContent value="characters" className="m-0 flex flex-col h-full space-y-4">
              <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
                {/* AI Chat Area */}
                <div className="flex-1 flex flex-col border border-border rounded-md bg-muted/30 overflow-hidden min-h-0 h-full">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={charScrollRef}>
                    {charMessages.length === 0 && (
                      <div className="text-center text-muted-foreground text-sm mt-10">
                        Chat with AI to brainstorm and flesh out your characters. When ready, the AI will add them to your Character List.
                      </div>
                    )}
                    {charMessages.map((msg, idx) => (
                      <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === 'user' ? 'bg-muted' : 'bg-primary/20'}`}>
                          {msg.role === 'user' ? <User className="h-4 w-4 text-muted-foreground" /> : <Bot className="h-4 w-4 text-primary" />}
                        </div>
                        <div className={`rounded-xl px-4 py-2 text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-muted text-foreground' : 'bg-card border border-border'}`}>
                          {msg.role === 'user' ? msg.content : (
                            <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                              <Markdown>{msg.content}</Markdown>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {charLoading && (
                      <div className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="rounded-xl px-4 py-2 text-sm bg-card border border-border flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-background border-t border-border shrink-0">
                    <div className="flex items-center gap-2">
                       <Input 
                        placeholder="Describe a character..." 
                        value={charInput}
                        onChange={e => setCharInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendCharChat()}
                        className="flex-1 border-border bg-background"
                      />
                      <Button onClick={handleSendCharChat} disabled={charLoading || !charInput.trim()} size="icon" className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground min-w-10">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Saved Characters Area */}
                <div className="w-full md:w-64 shrink-0 flex flex-col border border-border rounded-md bg-background overflow-hidden min-h-0 h-full">
                   <div className="p-3 border-b border-border bg-muted/30 shrink-0">
                     <h3 className="font-semibold text-sm flex items-center gap-2"><Users className="h-4 w-4"/> Character List</h3>
                   </div>
                   <div className="flex-1 overflow-y-auto p-3 space-y-3">
                     {savedCharacters.length === 0 ? (
                       <div className="text-center text-muted-foreground text-xs mt-4">No characters yet. Ask AI to add one!</div>
                     ) : (
                       savedCharacters.map(char => (
                         <div key={char.id} className="text-sm bg-muted text-card-foreground border rounded-lg border-border p-3 relative group">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => removeCharacter(char.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <h4 className="font-bold text-foreground pr-6">{char.name}</h4>
                            <p className="text-xs text-muted-foreground">{char.age} • {char.gender}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{char.description || char.location}</p>
                         </div>
                       ))
                     )}
                   </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
