import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, BookOpen, Settings, LayoutDashboard, Sun, Moon } from 'lucide-react';
import Canvas from './Canvas';
import ObserverChat from './ObserverChat';
import SystemLogger from './SystemLogger';
import AgentCreatorDialog from './AgentCreatorDialog';
import ProjectSettingsDialog from './ProjectSettingsDialog';
import { AIProvider } from '../lib/ai-context';

export default function Desk({ userId }: { userId: string }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [canvasContent, setCanvasContent] = useState<string>('');
  
  // Navigation state
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [isObserverOpen, setIsObserverOpen] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const q = query(collection(db, 'projects'), where('ownerId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!projectId) return;
    const docRef = doc(db, 'projects', projectId, 'canvas', 'main');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.content) {
          setCanvasContent(data.content);
        }
      }
    });
    return () => unsubscribe();
  }, [projectId]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const createProject = async () => {
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        title: 'Untitled Book',
        ownerId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setProjectId(docRef.id);
      setView('editor');
    } catch (error) {
      console.error("Error creating project", error);
    }
  };

  const openProject = (id: string) => {
    setProjectId(id);
    setView('editor');
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- MAIN DASHBOARD VIEW ---
  if (view === 'dashboard' || !projectId) {
    return (
      <div className="flex h-full w-full bg-muted/30 p-8 overflow-y-auto transition-colors duration-200">
        <div className="max-w-6xl mx-auto w-full space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground tracking-tight">Your Library</h1>
              <p className="text-muted-foreground mt-1">Manage your books and agent engines.</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button onClick={createProject} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">
                <Plus className="mr-2 h-4 w-4" /> New Book
              </Button>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 border border-dashed border-border rounded-[2rem] bg-card shadow-sm">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <div className="text-foreground font-medium">No books found.</div>
              <p className="text-muted-foreground text-sm mt-1 mb-6">Start your first project to initialize the agent engine.</p>
              <Button onClick={createProject} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">
                Create New Book
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((proj) => (
                <div 
                  key={proj.id} 
                  onClick={() => openProject(proj.id)}
                  className="group relative flex flex-col justify-between p-6 h-64 bg-card border border-border rounded-[2rem] hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div>
                    <h3 className="text-xl font-medium text-foreground">{proj.title}</h3>
                    {proj.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{proj.description}</p>
                    )}
                    {proj.contributors && (
                      <p className="text-xs text-muted-foreground mt-2">By: {proj.contributors}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">Last updated: {new Date(proj.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] text-muted-foreground">AI</div>
                      <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] text-muted-foreground">AI</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div onClick={(e) => e.stopPropagation()}>
                        <ProjectSettingsDialog 
                          projectId={proj.id} 
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full">
                              <Settings className="h-4 w-4" />
                            </Button>
                          } 
                        />
                      </div>
                      <div className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                        Engine Active
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- EDITOR VIEW ---
  return (
    <AIProvider userId={userId} projectId={projectId}>
      <div className="flex flex-col h-full w-full overflow-hidden bg-muted/30 transition-colors duration-200">
        <SystemLogger projectId={projectId} />
        
        {/* Top Navigation Bar */}
        <div className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="text-muted-foreground hover:text-foreground rounded-full">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm font-medium text-foreground">
              {projects.find(p => p.id === projectId)?.title || 'Untitled Book'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground mr-2">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <ProjectSettingsDialog projectId={projectId} />
            <AgentCreatorDialog userId={userId} projectId={projectId} />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsObserverOpen(!isObserverOpen)}
              className={`rounded-full ${isObserverOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Settings className="h-4 w-4 mr-2" />
              Observer
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden p-4 gap-4">
          {/* Main Canvas */}
          <div className="flex-1 overflow-hidden bg-background rounded-[2rem] border border-border shadow-xl relative">
            <Canvas projectId={projectId} userId={userId} />
          </div>

          {/* Sidebar / Chat (Collapsible) */}
          {isObserverOpen && (
            <div className="w-96 bg-background rounded-[2rem] border border-border shadow-xl flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out">
              <ObserverChat projectId={projectId} userId={userId} canvasContent={canvasContent} />
            </div>
          )}
        </div>
      </div>
    </AIProvider>
  );
}
