'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Basic Rich Text Editor component
 * Provides simple formatting capabilities for text content
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Enter text...',
  className,
  disabled = false,
  minHeight = 200,
  maxHeight = 500,
}): void => {
  const [content, setContent] = useState(value);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== content) {
      setContent(value);
      if (editorRef.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  const handleChange = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      onChange?.(newContent);
    }
  }, [onChange]);

  const execCommand = useCallback((command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleChange();
  }, [handleChange]);

  const handleFormat = useCallback((format: string) => {
    execCommand(format);
  }, [execCommand]);

  return (
    <div className={cn('rich-text-editor border rounded-lg', className)}>
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1 bg-gray-50">
        <button
          type="button"
          onClick={(): void => handleFormat('bold')}
          className="px-3 py-1 rounded hover:bg-gray-200 font-bold"
          disabled={disabled}
        >
          B
        </button>
        <button
          type="button"
          onClick={(): void => handleFormat('italic')}
          className="px-3 py-1 rounded hover:bg-gray-200 italic"
          disabled={disabled}
        >
          I
        </button>
        <button
          type="button"
          onClick={(): void => handleFormat('underline')}
          className="px-3 py-1 rounded hover:bg-gray-200 underline"
          disabled={disabled}
        >
          U
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={(): void => handleFormat('insertUnorderedList')}
          className="px-3 py-1 rounded hover:bg-gray-200"
          disabled={disabled}
        >
          • List
        </button>
        <button
          type="button"
          onClick={(): void => handleFormat('insertOrderedList')}
          className="px-3 py-1 rounded hover:bg-gray-200"
          disabled={disabled}
        >
          1. List
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={(): void => handleFormat('justifyLeft')}
          className="px-3 py-1 rounded hover:bg-gray-200"
          disabled={disabled}
        >
          ←
        </button>
        <button
          type="button"
          onClick={(): void => handleFormat('justifyCenter')}
          className="px-3 py-1 rounded hover:bg-gray-200"
          disabled={disabled}
        >
          ↔
        </button>
        <button
          type="button"
          onClick={(): void => handleFormat('justifyRight')}
          className="px-3 py-1 rounded hover:bg-gray-200"
          disabled={disabled}
        >
          →
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleChange}
        className={cn(
          'p-4 outline-none overflow-auto',
          disabled && 'bg-gray-50 cursor-not-allowed'
        )}
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: `${maxHeight}px`,
        }}
        dangerouslySetInnerHTML={{ __html: content }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      <style jsx>{`
        .rich-text-editor [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
};

// Default export for dynamic imports
export default RichTextEditor;