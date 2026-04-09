import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2 } from 'lucide-react';
import GenerateImageDialog from './GenerateImageDialog';
import ResearchDialog from './ResearchDialog';
import QuickIdeasDialog from './QuickIdeasDialog';
import NvidiaAgentDialog from './NvidiaAgentDialog';

export default function Canvas({ projectId, userId }: { projectId: string, userId: string }) {
  const [loading, setLoading] = useState(true);
  const docRef = doc(db, 'projects', projectId, 'canvas', 'main');

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: `<h1>Chapter 1: The Beginning</h1><p>Start writing your book here, or ask the Observer to generate an outline...</p>`,
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-sm sm:prose-base lg:prose-lg m-5 focus:outline-none max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      // Save to firestore
      const json = editor.getJSON();
      setDoc(docRef, {
        content: JSON.stringify(json),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    },
  });

  useEffect(() => {
    if (!editor) return;

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.content) {
          if (data.content.trim().startsWith('<')) {
            // It's HTML
            if (editor.getHTML() !== data.content) {
              editor.commands.setContent(data.content, false);
            }
          } else {
            // It's JSON
            try {
              const parsed = JSON.parse(data.content);
              const currentContent = editor.getJSON();
              if (JSON.stringify(currentContent) !== JSON.stringify(parsed)) {
                editor.commands.setContent(parsed, false); 
              }
            } catch (e) {
              console.error("Error parsing canvas content", e);
            }
          }
        }
      } else {
        // Initialize if it doesn't exist
        setDoc(docRef, {
          content: JSON.stringify(editor.getJSON()),
          updatedAt: new Date().toISOString()
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [editor, projectId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-8 bg-zinc-900 flex justify-center">
      <div className="w-full max-w-4xl bg-zinc-950 rounded-lg shadow-2xl border border-zinc-800 min-h-[800px] flex flex-col">
        <div className="h-12 border-b border-zinc-800 flex items-center px-4 shrink-0 bg-zinc-900/50 rounded-t-lg justify-between">
          <div className="flex gap-2 w-24">
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
            <div className="w-3 h-3 rounded-full bg-zinc-700" />
          </div>
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
            Visual Canvas
          </div>
          <div className="flex justify-end gap-2">
            <NvidiaAgentDialog />
            <QuickIdeasDialog />
            <ResearchDialog />
            <GenerateImageDialog onImageGenerated={(url) => {
              editor?.chain().focus().setImage({ src: url }).run();
            }} />
          </div>
        </div>
        <div className="p-12 flex-1">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
