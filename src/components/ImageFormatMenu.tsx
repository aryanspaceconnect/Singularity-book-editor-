import { BubbleMenu } from '@tiptap/react/menus';
import { Button } from '@/components/ui/button';
import { AlignLeft, AlignCenter, AlignRight, Maximize, Minimize, Scaling, Move, Trash2 } from 'lucide-react';
import ImageConversionDialog from './ImageConversionDialog';

export default function ImageFormatMenu({ editor }: { editor: any }) {
  if (!editor) return null;

  return (
    <BubbleMenu 
      editor={editor} 
      shouldShow={({ editor }) => editor.isActive('image')}
      options={{ placement: 'bottom' }}
      className="flex items-center gap-1 p-1 bg-background border border-border shadow-lg rounded-lg overflow-x-auto max-w-[95vw]"
    >
      <ImageConversionDialog editor={editor} />
      
      <div className="w-px h-4 bg-border mx-1 shrink-0" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => {
          const isAbsolute = editor.isActive('image', { positionType: 'absolute' });
          editor.chain().focus().updateAttributes('image', { 
            positionType: isAbsolute ? 'inline' : 'absolute',
            x: isAbsolute ? 0 : 50,
            y: isAbsolute ? 0 : 50
          }).run();
        }}
        className={editor.isActive('image', { positionType: 'absolute' }) ? 'bg-primary/10 text-primary shrink-0' : 'text-muted-foreground hover:text-foreground shrink-0'}
        title="Free Position (Drag anywhere)"
      >
        <Move className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-border mx-1 shrink-0" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().updateAttributes('image', { align: 'left' }).run()}
        className={editor.isActive('image', { align: 'left' }) ? 'bg-muted text-foreground shrink-0' : 'text-muted-foreground hover:text-foreground shrink-0'}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().updateAttributes('image', { align: 'center' }).run()}
        className={editor.isActive('image', { align: 'center' }) ? 'bg-muted text-foreground shrink-0' : 'text-muted-foreground hover:text-foreground shrink-0'}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().updateAttributes('image', { align: 'right' }).run()}
        className={editor.isActive('image', { align: 'right' }) ? 'bg-muted text-foreground shrink-0' : 'text-muted-foreground hover:text-foreground shrink-0'}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-border mx-1 shrink-0" />
      
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().updateAttributes('image', { size: 'small' }).run()}
        className={editor.isActive('image', { size: 'small' }) ? 'bg-muted text-foreground shrink-0' : 'text-muted-foreground hover:text-foreground shrink-0'}
        title="Small (25%)"
      >
        <Minimize className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().updateAttributes('image', { size: 'medium' }).run()}
        className={editor.isActive('image', { size: 'medium' }) ? 'bg-muted text-foreground shrink-0' : 'text-muted-foreground hover:text-foreground shrink-0'}
        title="Medium (50%)"
      >
        <Scaling className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().updateAttributes('image', { size: 'large' }).run()}
        className={editor.isActive('image', { size: 'large' }) ? 'bg-muted text-foreground shrink-0' : 'text-muted-foreground hover:text-foreground shrink-0'}
        title="Large (75%)"
      >
        <Scaling className="h-4 w-4 rotate-90" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().updateAttributes('image', { size: 'full' }).run()}
        className={editor.isActive('image', { size: 'full' }) ? 'bg-muted text-foreground shrink-0' : 'text-muted-foreground hover:text-foreground shrink-0'}
        title="Full Width (100%)"
      >
        <Maximize className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-border mx-1 shrink-0" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => editor.chain().focus().deleteSelection().run()}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
        title="Delete Image"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </BubbleMenu>
  );
}
