'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  language?: 'javascript' | 'typescript' | 'json' | 'html' | 'css' | 'sql' | 'python';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  lineNumbers?: boolean;
  theme?: 'light' | 'dark';
  minHeight?: number;
  maxHeight?: number;
}

/**
 * Basic Code Editor component
 * Provides syntax highlighting and code editing capabilities
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({
  value = '',
  onChange,
  language = 'javascript',
  placeholder = 'Enter code...',
  className,
  disabled = false,
  lineNumbers = true,
  theme = 'light',
  minHeight = 300,
  maxHeight = 600,
}): void => {
  const [code, setCode] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCode(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCode(newValue);
    onChange?.(newValue);
    updateLineNumbers();
  }, [onChange]);

  const updateLineNumbers = useCallback(() => {
    if (lineNumbers && lineNumbersRef.current && textareaRef.current) {
      const lines = textareaRef.current.value.split('\n').length;
      const lineNumbersHtml = Array.from({ length: lines }, (_, i) => 
        `<div class="line-number">${i + 1}</div>`
      ).join('');
      lineNumbersRef.current.innerHTML = lineNumbersHtml;
    }
  }, [lineNumbers]);

  useEffect(() => {
    updateLineNumbers();
  }, [code, updateLineNumbers]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newValue);
      onChange?.(newValue);
      
      // Set cursor position after tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }, [code, onChange]);

  const getLanguageClass = (): void => {
    const languageClasses: Record<string, string> = {
      javascript: 'language-js',
      typescript: 'language-ts',
      json: 'language-json',
      html: 'language-html',
      css: 'language-css',
      sql: 'language-sql',
      python: 'language-python',
    };
    return languageClasses[language] || 'language-text';
  };

  return (
    <div
      className={cn(
        'code-editor border rounded-lg overflow-hidden',
        theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900',
        className
      )}
    >
      {/* Header */}
      <div className={cn(
        'px-4 py-2 border-b flex items-center justify-between',
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
      )}>
        <span className="text-sm font-mono">{language}</span>
        <div className="flex gap-2">
          <span className={cn(
            'w-3 h-3 rounded-full',
            theme === 'dark' ? 'bg-red-500' : 'bg-red-400'
          )} />
          <span className={cn(
            'w-3 h-3 rounded-full',
            theme === 'dark' ? 'bg-yellow-500' : 'bg-yellow-400'
          )} />
          <span className={cn(
            'w-3 h-3 rounded-full',
            theme === 'dark' ? 'bg-green-500' : 'bg-green-400'
          )} />
        </div>
      </div>

      {/* Editor */}
      <div className="relative flex">
        {lineNumbers && (
          <div
            ref={lineNumbersRef}
            className={cn(
              'line-numbers px-3 py-4 font-mono text-sm select-none',
              theme === 'dark' ? 'bg-gray-800 text-gray-500' : 'bg-gray-50 text-gray-400'
            )}
            style={{ minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px` }}
          />
        )}
        
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex-1 p-4 font-mono text-sm outline-none resize-none overflow-auto',
            getLanguageClass(),
            theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: `${maxHeight}px`,
            tabSize: 2,
          }}
          spellCheck={false}
        />
      </div>

      <style jsx>{`
        .line-number {
          line-height: 1.5rem;
          text-align: right;
        }
        
        .code-editor textarea {
          line-height: 1.5rem;
        }

        /* Basic syntax highlighting classes */
        .language-js,
        .language-ts {
          color: ${theme === 'dark' ? '#e6db74' : '#0066cc'};
        }

        .language-json {
          color: ${theme === 'dark' ? '#66d9ef' : '#005cc5'};
        }

        .language-html {
          color: ${theme === 'dark' ? '#f92672' : '#d73a49'};
        }

        .language-css {
          color: ${theme === 'dark' ? '#a6e22e' : '#005cc5'};
        }

        .language-sql {
          color: ${theme === 'dark' ? '#66d9ef' : '#0066cc'};
        }

        .language-python {
          color: ${theme === 'dark' ? '#a6e22e' : '#005cc5'};
        }
      `}</style>
    </div>
  );
};

// Default export for dynamic imports
export default CodeEditor;