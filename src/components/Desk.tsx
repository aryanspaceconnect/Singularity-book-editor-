import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, BookOpen, Settings, LayoutDashboard, Sun, Moon, LogOut, Download, Trash2, SlidersHorizontal, Search } from 'lucide-react';
import { Trash, Gear, SignOut, Palette, List, FilePdf, SidebarSimple, Robot } from '@phosphor-icons/react';
import Canvas from './Canvas';
import SidekickChat from './SidekickChat';
import SystemLogger from './SystemLogger';
import AgentCreatorDialog from './AgentCreatorDialog';
import ProjectSettingsDialog from './ProjectSettingsDialog';
import GlobalSettingsDialog from './GlobalSettingsDialog';
import VersionHistoryDialog from './VersionHistoryDialog';
import ExportMenu from './ExportMenu';
import { AIProvider } from '../lib/ai-context';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import BookWizardDialog from './BookWizardDialog';
import SteppingStonesTray from './SteppingStonesTray';
import { MagicWand01Icon } from 'hugeicons-react';

import BookOutlineTray from './BookOutlineTray';
import { ListTree } from 'lucide-react';

export default function Desk({ userId, user, handleLogout }: { userId: string, user: any, handleLogout: () => void }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [canvasContent, setCanvasContent] = useState<string>('');
  const [canvasHtml, setCanvasHtml] = useState<string>('');
  const [canvasText, setCanvasText] = useState<string>('');
  
  const [wizardOpen, setWizardOpen] = useState(false);
  const [steppingStonesOpen, setSteppingStonesOpen] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  
  // Navigation state
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [isSidekickOpen, setIsSidekickOpen] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Listen for Escape key to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  useEffect(() => {
    const q = query(collection(db, 'projects'), where('ownerId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      projData.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
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
        if (data.htmlContent) {
          setCanvasHtml(data.htmlContent);
        }
        if (data.textContent) {
          setCanvasText(data.textContent);
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

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete));
      if (projectId === projectToDelete) {
        setView('dashboard');
        setProjectId(null);
      }
    } catch (error) {
      console.error("Error deleting project", error);
    } finally {
      setProjectToDelete(null);
    }
  };

  const executeDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(id);
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
      <div className="flex flex-col h-full w-full bg-muted/30 transition-colors duration-200">
        {projectToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background border border-border rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
              <h3 className="text-xl font-semibold mb-2">Delete Book?</h3>
              <p className="text-muted-foreground mb-6">Are you sure you want to delete this book? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setProjectToDelete(null)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
              </div>
            </div>
          </div>
        )}
        {/* Unified Header for Dashboard */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4 shrink-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary" />
            <span className="font-semibold tracking-tight">Singularity</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full overflow-hidden p-0" />}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <GlobalSettingsDialog 
                  userId={user.uid} 
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Global Settings
                    </DropdownMenuItem>
                  } 
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-foreground tracking-tight">Your Library</h1>
                <p className="text-muted-foreground mt-1">Manage your books and agent engines.</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6" />}>
                  <Plus className="mr-2 h-4 w-4" /> New Project
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                  <DropdownMenuItem className="py-3 px-4 cursor-pointer" onClick={() => setWizardOpen(true)}>
                    <MagicWand01Icon className="mr-3 h-5 w-5 text-amber-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">Fast Way</span>
                      <span className="text-xs text-muted-foreground">Guided book writing</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="py-3 px-4 cursor-pointer" onClick={createProject}>
                    <Plus className="mr-3 h-5 w-5 text-primary" />
                    <div className="flex flex-col">
                      <span className="font-medium">Freedom Way</span>
                      <span className="text-xs text-muted-foreground">Blank canvas</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 border border-dashed border-border rounded-[2rem] bg-card shadow-sm">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <div className="text-foreground font-medium">No books found.</div>
                <p className="text-muted-foreground text-sm mt-1 mb-6">Start your first project to initialize the agent engine.</p>
                <Button onClick={() => setWizardOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">
                  <MagicWand01Icon className="mr-2 h-4 w-4" /> Use Fast Way
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((proj, index) => (
                  <div 
                    key={proj.id} 
                    onClick={() => openProject(proj.id)}
                    className="group relative flex flex-col justify-between p-6 h-64 bg-card border border-border rounded-[2rem] hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                  >
                    {index === 0 && (
                      <div className="absolute top-4 right-4 bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full z-10">
                        Recent
                      </div>
                    )}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="mt-2">
                      <h3 className="text-xl font-medium text-foreground">{proj.title}</h3>
                      {proj.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{proj.description}</p>
                      )}
                      {proj.contributors && proj.contributors.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">By: {Array.isArray(proj.contributors) ? proj.contributors.map((c: any) => c.id || c).join(', ') : proj.contributors}</p>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full" onClick={(e) => executeDeleteProject(proj.id, e)}>
                          <Trash className="h-4 w-4" />
                        </Button>
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
        
        <BookWizardDialog 
          open={wizardOpen} 
          onOpenChange={setWizardOpen} 
          userId={userId} 
          onProjectCreated={(id) => {
            setProjectId(id);
            setView('editor');
          }} 
        />
      </div>
    );
  }

  // --- EDITOR VIEW ---
  return (
    <AIProvider userId={userId} projectId={projectId}>
      <div className="flex flex-col h-full w-full overflow-hidden print:overflow-visible print:h-auto print:bg-white bg-muted/30 transition-colors duration-200">
        <div className="print:hidden">
          <SystemLogger projectId={projectId} />
        </div>
        
        {/* Unified Top Navigation Bar */}
        <header className="print:hidden h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-2">
              <div className="h-6 w-6 rounded bg-primary" />
              <span className="font-semibold tracking-tight hidden sm:inline-block">Singularity</span>
            </div>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="text-muted-foreground hover:text-foreground rounded-full">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
              {projects.find(p => p.id === projectId)?.title || 'Untitled Book'}
            </span>
            <ProjectSettingsDialog 
              projectId={projectId} 
              trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full">
                  <Settings className="h-4 w-4" />
                </Button>
              } 
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsOutlineOpen(!isOutlineOpen)}
              className={`rounded-full ${isOutlineOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ListTree className="h-4 w-4 mr-2" />
              Skeleton
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSteppingStonesOpen(!steppingStonesOpen)}
              className={`rounded-full ${steppingStonesOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Vault
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.dispatchEvent(new CustomEvent('open-search'))}
              className="text-muted-foreground hover:text-foreground rounded-full"
              title="Search (Cmd+K)"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <VersionHistoryDialog projectId={projectId} currentContent={canvasContent} />
            <ExportMenu 
              projectTitle={projects.find(p => p.id === projectId)?.title || 'Untitled Book'}
              projectSettings={projects.find(p => p.id === projectId) || {}}
              htmlContent={canvasContent} 
            />
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full overflow-hidden ml-1 p-0" />}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <ProjectSettingsDialog 
                    projectId={projectId} 
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Settings className="mr-2 h-4 w-4" />
                        Project Settings
                      </DropdownMenuItem>
                    } 
                  />
                  <GlobalSettingsDialog 
                    userId={user.uid} 
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        Global Settings
                      </DropdownMenuItem>
                    } 
                  />
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="h-4 w-px bg-border mx-1" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsSidekickOpen(!isSidekickOpen)}
              className={`rounded-full ${isSidekickOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sidekick
            </Button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden print:overflow-visible print:h-auto p-4 print:p-0 gap-4">
          
          {/* Book Outline Tray */}
          {isOutlineOpen && (
            <div className="print:hidden h-full rounded-[2rem] border border-border overflow-hidden shadow-xl transition-all duration-300 ease-in-out shrink-0">
               <BookOutlineTray projectId={projectId} onClose={() => setIsOutlineOpen(false)} />
            </div>
          )}

          {/* Stepping Stones Tray */}
          {steppingStonesOpen && (
            <div className="print:hidden h-full rounded-[2rem] border border-border overflow-hidden shadow-xl transition-all duration-300 ease-in-out shrink-0">
               <SteppingStonesTray projectId={projectId} userId={userId} onClose={() => setSteppingStonesOpen(false)} />
            </div>
          )}

          {/* Main Canvas */}
          <div className="flex-1 overflow-hidden print:overflow-visible print:h-auto bg-background rounded-[2rem] print:rounded-none border border-border print:border-none shadow-xl print:shadow-none relative">
            <Canvas projectId={projectId} userId={userId} />
          </div>

          {/* Sidebar / Chat (Collapsible) */}
          {isSidekickOpen && (
            <div className="print:hidden w-96 bg-background rounded-[2rem] border border-border shadow-xl flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out">
              <SidekickChat projectId={projectId} userId={userId} canvasText={canvasText || canvasContent} canvasHtml={canvasHtml} />
            </div>
          )}
        </div>
      </div>
    </AIProvider>
  );
}
