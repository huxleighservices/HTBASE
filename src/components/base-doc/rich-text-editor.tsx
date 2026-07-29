'use client';

import { useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Pilcrow,
  Undo2,
  Redo2,
  RemoveFormatting,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type RichTextEditorHandle = {
  getHtml: () => string;
};

type RichTextEditorProps = {
  initialHtml?: string;
  editable: boolean;
};

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
    >
      {children}
    </button>
  );
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ initialHtml, editable }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const loadedRef = useRef(false);

    useEffect(() => {
      if (loadedRef.current || !editorRef.current) return;
      loadedRef.current = true;
      editorRef.current.innerHTML = initialHtml ?? '';
    }, [initialHtml]);

    useImperativeHandle(ref, () => ({
      getHtml: () => editorRef.current?.innerHTML ?? '',
    }));

    const exec = (command: string, value?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
    };

    return (
      <div className="flex flex-col h-full">
        {editable && (
          <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border/30 flex-wrap">
            <ToolbarButton title="Bold" onClick={() => exec('bold')}>
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Italic" onClick={() => exec('italic')}>
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Underline" onClick={() => exec('underline')}>
              <Underline className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Strikethrough" onClick={() => exec('strikeThrough')}>
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border/40 mx-1" />

            <ToolbarButton title="Heading 1" onClick={() => exec('formatBlock', '<h1>')}>
              <Heading1 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Heading 2" onClick={() => exec('formatBlock', '<h2>')}>
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Paragraph" onClick={() => exec('formatBlock', '<p>')}>
              <Pilcrow className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border/40 mx-1" />

            <ToolbarButton title="Bullet list" onClick={() => exec('insertUnorderedList')}>
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Numbered list" onClick={() => exec('insertOrderedList')}>
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border/40 mx-1" />

            <ToolbarButton title="Align left" onClick={() => exec('justifyLeft')}>
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Align center" onClick={() => exec('justifyCenter')}>
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Align right" onClick={() => exec('justifyRight')}>
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="w-px h-5 bg-border/40 mx-1" />

            <ToolbarButton title="Undo" onClick={() => exec('undo')}>
              <Undo2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Redo" onClick={() => exec('redo')}>
              <Redo2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton title="Clear formatting" onClick={() => exec('removeFormat')}>
              <RemoveFormatting className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={editable}
          suppressContentEditableWarning
          className={cn(
            'flex-1 min-h-0 overflow-y-auto px-4 py-3 text-sm focus:outline-none',
            '[&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:mt-3',
            '[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-3',
            '[&_p]:mb-2 [&_p]:leading-relaxed',
            '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2',
            '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2',
            !editable && 'cursor-default select-text'
          )}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';
