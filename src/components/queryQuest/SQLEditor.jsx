import React, { useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import PixelButton from '../PixelButton';

const SQLEditor = ({
    value,
    onChange,
    onRun,
    onReset,
    schemaDefinition,
    executing,
}) => {
    const [copied, setCopied] = useState(false);

    const schemaMap = useMemo(() => {
        const map = {};
        for (const tbl of schemaDefinition?.tables || []) {
            map[tbl.name] = (tbl.columns || []).map((c) => c.name);
        }
        return map;
    }, [schemaDefinition]);

    const extensions = useMemo(
        () => [sql({ dialect: PostgreSQL, schema: schemaMap })],
        [schemaMap]
    );

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard access may be blocked in non-HTTPS contexts
        }
    };

    const handleKeyDownCapture = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (!executing) {
                onRun();
            }
        }
    };

    const isDark = typeof document !== 'undefined' && document.body.classList.contains('dark');

    return (
        <div className="qq-editor-card pixel-border">
            <div className="qq-editor-toolbar">
                <div className="qq-editor-title">
                    <span>⌨️ POSTGRESQL WORKBENCH</span>
                    <span className="qq-shortcut-hint">CTRL + ENTER TO RUN</span>
                </div>
                <div className="qq-editor-actions">
                    <button
                        type="button"
                        className="qq-tool-btn cursor-target"
                        onClick={handleCopy}
                        aria-label="Copy SQL query"
                    >
                        {copied ? 'COPIED ✓' : 'COPY'}
                    </button>
                    <button
                        type="button"
                        className="qq-tool-btn cursor-target"
                        onClick={onReset}
                        aria-label="Reset SQL query to starter template"
                    >
                        RESET
                    </button>
                    <button
                        type="button"
                        className="qq-tool-btn cursor-target"
                        onClick={() => onChange('')}
                        aria-label="Clear SQL editor"
                    >
                        CLEAR
                    </button>
                </div>
            </div>

            <div className="qq-codemirror-wrap" onKeyDownCapture={handleKeyDownCapture}>
                <CodeMirror
                    value={value}
                    height="220px"
                    theme={isDark ? oneDark : 'light'}
                    extensions={extensions}
                    onChange={(val) => onChange(val)}
                    basicSetup={{
                        lineNumbers: true,
                        highlightActiveLineGutter: true,
                        highlightActiveLine: true,
                        autocompletion: true,
                        indentOnInput: true,
                        bracketMatching: true,
                        closeBrackets: true,
                    }}
                />
            </div>

            <div className="qq-editor-footer">
                <span className="qq-editor-note">Read-only sandbox • 3s timeout • 100 row limit</span>
                <PixelButton
                    type="button"
                    onClick={onRun}
                    disabled={executing}
                    className="qq-run-btn cursor-target"
                    aria-label="Execute SQL Query"
                >
                    {executing ? 'EXECUTING...' : '▶ EXECUTE QUERY'}
                </PixelButton>
            </div>
        </div>
    );
};

export default SQLEditor;
