import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import Canvas from './Canvas';
import ObserverChat from './ObserverChat';
import SystemLogger from './SystemLogger';

export default function Desk({ userId }: { userId: string }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [canvasContent, setCanvasContent] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'projects'), where('ownerId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projData);
      if (projData.length > 0 && !projectId) {
        setProjectId(projData[0].id);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId, projectId]);

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

  const createProject = async () => {
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        title: 'Untitled Book',
        ownerId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setProjectId(docRef.id);
    } catch (error) {
      console.error("Error creating project", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <div className="text-zinc-400">No projects found.</div>
        <Button onClick={createProject} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Create New Book
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <SystemLogger projectId={projectId} />
      {/* Sidebar / Chat */}
      <div className="w-80 border-r border-zinc-800 bg-zinc-950/50 flex flex-col shrink-0">
        <ObserverChat projectId={projectId} userId={userId} canvasContent={canvasContent} />
      </div>
      
      {/* Main Canvas */}
      <div className="flex-1 overflow-hidden bg-zinc-900">
        <Canvas projectId={projectId} userId={userId} />
      </div>
    </div>
  );
}
