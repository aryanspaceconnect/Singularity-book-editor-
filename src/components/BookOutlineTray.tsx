import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Circle, ListOrdered, PanelLeftClose } from 'lucide-react';
import { Book01Icon as BookOpen } from 'hugeicons-react';

export default function BookOutlineTray({ projectId, onClose }: { projectId: string, onClose: () => void }) {
  const [projectData, setProjectData] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'projects', projectId), (docItem) => {
      setProjectData(docItem.data() || {});
    });
    return () => unsub();
  }, [projectId]);

  const bookPlan = projectData?.bookPlan || null;
  const activeNodeId = projectData?.activeNodeId || null;

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

  return (
    <div className="flex flex-col h-full w-80 bg-background/50 backdrop-blur-sm border-r border-border">
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <ListOrdered className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground text-sm tracking-tight">Book Skeleton</h2>
            <p className="text-[10px] text-muted-foreground">The master structural plan</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-3">
        {!bookPlan || flatNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-muted-foreground opacity-50" />
            </div>
            <p className="text-sm text-muted-foreground">No book plan established yet.</p>
            <p className="text-xs text-muted-foreground opacity-80">Ask your Sidekick to propose a book skeleton.</p>
          </div>
        ) : (
          <div className="space-y-1 mt-2 pb-10">
            {flatNodes.map(node => (
              <div 
                key={node.id} 
                className={`flex items-start gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors border ${node.id === activeNodeId ? 'bg-primary/5 border-primary/30 shadow-[0_2px_10px_-4px_rgba(var(--primary),0.2)]' : 'border-transparent hover:bg-muted/50 cursor-pointer'}`}
                style={{ marginLeft: `${node.level * 12}px` }}
              >
                <div className="mt-0.5 shrink-0">
                  {node.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : node.id === activeNodeId ? (
                    <div className="relative flex items-center justify-center h-4 w-4">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-20 animate-ping"></span>
                      <Circle className="relative h-2 w-2 text-amber-500 fill-amber-500" />
                    </div>
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground opacity-30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                   <div className={`font-medium truncate ${node.status === 'completed' ? 'text-muted-foreground line-through opacity-70' : node.id === activeNodeId ? 'text-foreground' : 'text-foreground/80'}`}>
                     {node.title}
                   </div>
                   {node.description && (
                     <div className="text-[10px] text-muted-foreground mt-1 leading-relaxed opacity-80 line-clamp-2">
                       {node.description}
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
