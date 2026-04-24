import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { FilePdf, FileText, Note, Folder } from '@phosphor-icons/react';
import { db } from '../firebase';
import { Plus, Search, X, Loader2, Upload, FolderPlus, Globe, Book, MoreHorizontal, Download, ArrowRight, Eye, Trash2, BrainCircuit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface SteppingStonesTrayProps {
  projectId: string;
  userId: string;
  onClose?: () => void;
}

export default function SteppingStonesTray({ projectId, userId, onClose }: SteppingStonesTrayProps) {
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [universalFiles, setUniversalFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'project' | 'universal'>('project');
  
  const [folderPath, setFolderPath] = useState<{id: string, name: string}[]>([{id: 'root', name: 'Root'}]);
  const currentFolder = folderPath[folderPath.length - 1].id;

  const [uploadView, setUploadView] = useState<'list' | 'create_text' | 'create_folder'>('list');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [viewFile, setViewFile] = useState<any>(null); // For viewing text/images
  const [moveFileItem, setMoveFileItem] = useState<any>(null); // For moving file
  const [moveDestinationFolder, setMoveDestinationFolder] = useState<string>('root');

  useEffect(() => {
    const qProject = query(collection(db, 'projects', projectId, 'files'));
    const qUniversal = query(collection(db, 'users', userId, 'vault_files'));
    
    let projLoaded = false;
    let uniLoaded = false;

    const checkLoaded = () => {
      if (projLoaded && uniLoaded) setLoading(false);
    };

    const unsubProject = onSnapshot(qProject, (snapshot) => {
      setProjectFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      projLoaded = true;
      checkLoaded();
    });

    const unsubUniversal = onSnapshot(qUniversal, (snapshot) => {
      setUniversalFiles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      uniLoaded = true;
      checkLoaded();
    });

    return () => {
      unsubProject();
      unsubUniversal();
    };
  }, [projectId, userId]);

  const activeFiles = activeTab === 'project' ? projectFiles : universalFiles;
  
  const handleSaveTextFile = async () => {
    if (!newTitle.trim()) return;
    try {
      const collectionRef = activeTab === 'project' 
        ? collection(db, 'projects', projectId, 'files')
        : collection(db, 'users', userId, 'vault_files');

      await addDoc(collectionRef, {
        name: newTitle,
        type: 'text',
        content: newContent,
        folder: currentFolder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setUploadView('list');
      setNewTitle('');
      setNewContent('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateFolder = async () => {
    if (!newTitle.trim()) return;
    try {
      const collectionRef = activeTab === 'project' 
        ? collection(db, 'projects', projectId, 'files')
        : collection(db, 'users', userId, 'vault_files');

      await addDoc(collectionRef, {
        name: newTitle,
        type: 'folder',
        folder: currentFolder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setUploadView('list');
      setNewTitle('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      // Read as Data URL to support ANY file type
      reader.onload = async (event) => {
        const content = event.target?.result as string; 
        const collectionRef = activeTab === 'project' 
          ? collection(db, 'projects', projectId, 'files')
          : collection(db, 'users', userId, 'vault_files');

        let fileType = file.type || 'unknown';
        if (file.name.endsWith('.md')) fileType = 'markdown';
        else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) fileType = 'code';

        await addDoc(collectionRef, {
          name: file.name,
          type: fileType,
          content: content,
          folder: currentFolder,
          size: file.size,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      };
      // For any generic file, we can store it as DataURL. 
      // Firestore has 1MB limits. A real app might use Firebase Storage.
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (fileId: string) => {
    const collectionRef = activeTab === 'project' 
        ? collection(db, 'projects', projectId, 'files')
        : collection(db, 'users', userId, 'vault_files');
    await deleteDoc(doc(collectionRef, fileId));
  };

  const handleMoveFile = async () => {
    if (!moveFileItem) return;
    const collectionRef = activeTab === 'project' 
        ? collection(db, 'projects', projectId, 'files')
        : collection(db, 'users', userId, 'vault_files');
    
    await updateDoc(doc(collectionRef, moveFileItem.id), {
      folder: moveDestinationFolder
    });
    setMoveFileItem(null);
  };

  const getIcon = (type: string) => {
    if (type === 'folder') return <Folder className="h-5 w-5 text-amber-400" weight="fill" />;
    if (type.includes('image')) return <FilePdf className="h-5 w-5 text-purple-500" />;
    if (type.includes('audio')) return <FilePdf className="h-5 w-5 text-pink-500" />;
    if (type.includes('video')) return <FilePdf className="h-5 w-5 text-rose-500" />;
    if (type === 'markdown') return <Note className="h-5 w-5 text-emerald-500" />;
    if (type.includes('pdf')) return <FilePdf className="h-5 w-5 text-red-500" />;
    if (type === 'code' || type.includes('json')) return <FileText className="h-5 w-5 text-cyan-500" />;
    return <FileText className="h-5 w-5 text-blue-500" />;
  };

  // Convert size to human readable 
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const downloadFile = (fileItem: any) => {
    const link = document.createElement("a");
    link.download = fileItem.name;
    // content is a data URL usually if uploaded, otherwise plain text if created manually
    if (fileItem.content?.startsWith('data:')) {
      link.href = fileItem.content;
    } else {
      const blob = new Blob([fileItem.content || ''], { type: 'text/plain' });
      link.href = URL.createObjectURL(blob);
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Folders available for moving (in active tab)
  const availableMoveFolders = [{id: 'root', name: 'Root'}].concat(activeFiles.filter(f => f.type === 'folder').map(f => ({id: f.id, name: f.name})));

  const folders = activeFiles.filter(f => f.type === 'folder' && f.folder === currentFolder && f.name.toLowerCase().includes(filter.toLowerCase()));
  const files = activeFiles.filter(f => f.type !== 'folder' && f.folder === currentFolder && f.name.toLowerCase().includes(filter.toLowerCase()));
  
  const displayItems = [...folders, ...files];

  return (
    <div className="w-80 h-full bg-background border-l border-border flex flex-col shrink-0">
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <BrainCircuit className="h-4 w-4 text-primary" />
          Vault (Ideas/Files)
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
             <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="p-2 border-b border-border bg-muted/20">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setFolderPath([{id: 'root', name: 'Root'}]); }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="project" className="text-xs">
               <Book className="w-3 h-3 mr-1.5" /> Book-Specific
            </TabsTrigger>
            <TabsTrigger value="universal" className="text-xs">
               <Globe className="w-3 h-3 mr-1.5" /> Universal
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {uploadView === 'list' && (
        <>
          <div className="p-4 border-b border-border shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search resources..." 
                className="pl-8 bg-muted/50 border-none h-9 text-sm"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                multiple
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload} 
              />
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => fileInputRef.current?.click()} title="Upload File">
                <Upload className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => { setUploadView('create_folder'); setNewTitle(''); }} title="New Folder">
                <FolderPlus className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => { setUploadView('create_text'); setNewTitle(''); setNewContent(''); }}>
                <Plus className="h-3 w-3 mr-1" /> New Note
              </Button>
            </div>
            
            {folderPath.length > 1 && (
               <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 flex-wrap">
                 {folderPath.map((fp, idx) => (
                    <React.Fragment key={fp.id}>
                      <button 
                         className="hover:underline hover:text-foreground"
                         onClick={() => setFolderPath(prev => prev.slice(0, idx + 1))}
                      >
                        {fp.name}
                      </button>
                      {idx < folderPath.length - 1 && <span>/</span>}
                    </React.Fragment>
                 ))}
               </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : displayItems.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground text-sm">
                No files found in this location.
              </div>
            ) : (
              <div className="space-y-1">
                {displayItems.map(f => (
                  <div 
                    key={f.id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer group transition-colors"
                    onClick={() => {
                       if (f.type === 'folder') {
                           setFolderPath(prev => [...prev, {id: f.id, name: f.name}]);
                       } else {
                           setViewFile(f);
                       }
                    }}
                  >
                    <div className="shrink-0 p-1.5 bg-background rounded border border-border flex items-center justify-center h-8 w-8">
                      {getIcon(f.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{f.type === 'folder' ? 'Folder' : `${f.type} ${formatSize(f.size)}`}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                       <DropdownMenu>
                         <DropdownMenuTrigger render={
                           <Button variant="ghost" size="icon" className="h-6 w-6">
                             <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                           </Button>
                         } />
                         <DropdownMenuContent align="end" className="w-40">
                           {f.type !== 'folder' && (
                             <>
                               <DropdownMenuItem onClick={() => setViewFile(f)}>
                                 <Eye className="h-4 w-4 mr-2" /> View
                               </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => downloadFile(f)}>
                                 <Download className="h-4 w-4 mr-2" /> Download
                               </DropdownMenuItem>
                               <DropdownMenuSeparator />
                             </>
                           )}
                           <DropdownMenuItem onClick={() => setMoveFileItem(f)}>
                             <ArrowRight className="h-4 w-4 mr-2" /> Move to...
                           </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(f.id)}>
                             <Trash2 className="h-4 w-4 mr-2" /> Delete
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {uploadView === 'create_text' && (
        <div className="flex flex-col h-full bg-muted/20">
          <div className="p-4 border-b border-border space-y-3 flex-1 flex flex-col">
            <Input 
              placeholder="Note title..." 
              className="bg-background"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <Textarea 
              placeholder="Start typing..."
              className="flex-1 min-h-[200px] bg-background resize-none"
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
            />
          </div>
          <div className="p-4 border-t border-border flex justify-between shrink-0 bg-background">
            <Button variant="ghost" size="sm" onClick={() => { setUploadView('list'); setNewTitle(''); setNewContent(''); }}>Cancel</Button>
            <Button size="sm" onClick={handleSaveTextFile} disabled={!newTitle.trim()}>Save Note</Button>
          </div>
        </div>
      )}

      {uploadView === 'create_folder' && (
        <div className="flex flex-col h-full bg-muted/20">
          <div className="p-4 border-b border-border space-y-3 shrink-0">
            <h3 className="text-sm font-medium">Create Folder</h3>
            <Input 
              placeholder="Folder Name" 
              className="bg-background"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="p-4 border-t border-border flex justify-between shrink-0 bg-background">
            <Button variant="ghost" size="sm" onClick={() => { setUploadView('list'); setNewTitle(''); }}>Cancel</Button>
            <Button size="sm" onClick={handleCreateFolder} disabled={!newTitle.trim()}>Create Folder</Button>
          </div>
        </div>
      )}

      {/* View File Dialog */}
      <Dialog open={!!viewFile} onOpenChange={(open) => !open && setViewFile(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col pt-10">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{viewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/30 p-4 rounded-xl border border-border">
             {viewFile?.type?.includes('image') ? (
                <img src={viewFile.content} alt={viewFile.name} className="max-w-full h-auto mx-auto border" />
             ) : viewFile?.type?.includes('video') ? (
                <video src={viewFile.content} controls className="max-w-full h-auto mx-auto border" />
             ) : viewFile?.type?.includes('audio') ? (
                <audio src={viewFile.content} controls className="w-full mt-4" />
             ) : (
                <pre className="whitespace-pre-wrap text-sm font-mono text-muted-foreground">{viewFile?.content?.startsWith('data:') ? 'Cannot preview binary file content directly in browser. Please download.' : viewFile?.content}</pre>
             )}
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => downloadFile(viewFile)}>
               <Download className="h-4 w-4 mr-2" /> Download File
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move File Dialog */}
      <Dialog open={!!moveFileItem} onOpenChange={(open) => !open && setMoveFileItem(null)}>
        <DialogContent className="max-w-sm pt-8">
          <DialogHeader>
            <DialogTitle>Move '{moveFileItem?.name}'</DialogTitle>
            <DialogDescription>Select a destination folder in {activeTab === 'project' ? 'Book-Specific' : 'Universal'}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
             <select 
               className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
               value={moveDestinationFolder}
               onChange={e => setMoveDestinationFolder(e.target.value)}
             >
               {availableMoveFolders.map(folder => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
               ))}
             </select>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setMoveFileItem(null)}>Cancel</Button>
             <Button onClick={handleMoveFile}>Move Here</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
