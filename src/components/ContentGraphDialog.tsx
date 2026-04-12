import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Network, Loader2 } from "lucide-react";
import { useAI } from '../lib/ai-context';
import { Editor } from '@tiptap/react';

interface Node {
  id: string;
  label: string;
  type: 'concept' | 'character' | 'location' | 'event';
}

interface Edge {
  source: string;
  target: string;
  relationship: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export default function ContentGraphDialog({ editor }: { editor: Editor }) {
  const { ai } = useAI();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);

  const generateGraph = async () => {
    if (!editor) return;
    
    setLoading(true);
    try {
      const text = editor.getText();
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Analyze the following text and extract a knowledge graph of the core ideas, characters, locations, and events.
        
Text:
${text}

Return the result STRICTLY as a JSON object with this structure:
{
  "nodes": [
    { "id": "unique_id", "label": "Name or Concept", "type": "concept|character|location|event" }
  ],
  "edges": [
    { "source": "id_1", "target": "id_2", "relationship": "description of relationship" }
  ]
}
Do not include markdown blocks, just the raw JSON.`,
        config: {
          responseMimeType: "application/json",
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text) as GraphData;
        setGraphData(data);
      }
    } catch (error) {
      console.error("Failed to generate content graph:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen && !graphData) {
        generateGraph();
      }
    }}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <Network className="h-4 w-4" />
        Content Graph
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Content Graph Engine</DialogTitle>
          <DialogDescription>
            AI-extracted relationships and core concepts from your document.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-500" />
              <p>Analyzing document semantics and extracting relationships...</p>
            </div>
          ) : graphData ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wider">Key Entities & Concepts</h3>
                <div className="flex flex-wrap gap-2">
                  {graphData.nodes.map(node => (
                    <span 
                      key={node.id} 
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border
                        ${node.type === 'character' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 
                          node.type === 'location' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' :
                          node.type === 'event' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' :
                          'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                        }`}
                    >
                      {node.label}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wider">Relationships</h3>
                <div className="space-y-2">
                  {graphData.edges.map((edge, i) => {
                    const sourceNode = graphData.nodes.find(n => n.id === edge.source);
                    const targetNode = graphData.nodes.find(n => n.id === edge.target);
                    if (!sourceNode || !targetNode) return null;

                    return (
                      <div key={i} className="flex items-center gap-3 text-sm p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{sourceNode.label}</span>
                        <span className="text-zinc-400 text-xs uppercase tracking-wider flex-1 text-center border-b border-dashed border-zinc-300 dark:border-zinc-700 relative top-[-6px]">
                          <span className="absolute bg-zinc-50 dark:bg-zinc-900/50 px-2 -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            {edge.relationship}
                          </span>
                        </span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{targetNode.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500">
              No data available.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
