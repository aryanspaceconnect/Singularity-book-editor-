import { NodeViewWrapper } from '@tiptap/react';
import { useState, useRef, useEffect } from 'react';

export default function DraggableImageComponent(props: any) {
  const { node, updateAttributes, selected, editor } = props;
  const { src, x, y, width, height, positionType } = node.attrs;
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPos, setInitialPos] = useState({ x: 0, y: 0 });
  const [localPos, setLocalPos] = useState({ x: x || 0, y: y || 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) {
      setLocalPos({ x: x || 0, y: y || 0 });
    }
  }, [x, y, isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (positionType !== 'absolute') return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPos({ x: localPos.x, y: localPos.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || positionType !== 'absolute') return;
    e.preventDefault();
    e.stopPropagation();
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    let newX = initialPos.x + dx;
    let newY = initialPos.y + dy;
    
    // Constrain to editor bounds
    const editorDom = editor.view.dom as HTMLElement;
    const editorRect = editorDom.getBoundingClientRect();
    const imgWidth = width || wrapperRef.current?.offsetWidth || 200;
    
    if (newX < 0) newX = 0;
    if (newX + imgWidth > editorRect.width) newX = editorRect.width - imgWidth;
    if (newY < 0) newY = 0;
    
    setLocalPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
    updateAttributes({ x: localPos.x, y: localPos.y });
  };

  return (
    <NodeViewWrapper 
      ref={wrapperRef}
      className={`draggable-image-wrapper ${selected ? 'ring-2 ring-primary' : ''}`}
      style={{
        position: positionType === 'absolute' ? 'absolute' : 'relative',
        left: positionType === 'absolute' ? `${localPos.x}px` : 'auto',
        top: positionType === 'absolute' ? `${localPos.y}px` : 'auto',
        display: positionType === 'absolute' ? 'block' : 'inline-block',
        zIndex: positionType === 'absolute' ? 10 : 1,
        cursor: positionType === 'absolute' ? (isDragging ? 'grabbing' : 'grab') : 'default',
        width: width ? `${width}px` : 'auto',
        height: height ? `${height}px` : 'auto',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-drag-handle
    >
      <img 
        src={src} 
        alt="Canvas Image" 
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        className="rounded-lg shadow-sm pointer-events-none"
      />
    </NodeViewWrapper>
  );
}
