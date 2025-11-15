import { useRef, useEffect, useState } from "react";
import "./dsl-code-editor.css";

interface DSLCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}

// DSL Keywords mapping for syntax highlighting
const DSL_KEYWORDS: Record<string, string> = {
  // Keywords
  const: "keyword-const",
  events: "keyword-events",
  fn: "keyword-fn",
  main: "keyword-main",
  update: "keyword-update",
  insert: "keyword-insert",
  with: "keyword-with",
  delete: "keyword-delete",
  if: "keyword-if",
  else: "keyword-else",
};

/**
 * Tokenizes DSL code for syntax highlighting
 */
function tokenizeDSL(text: string): Array<{ type: string; value: string }> {
  const tokens: Array<{ type: string; value: string }> = [];
  let i = 0;

  while (i < text.length) {
    // Comments
    if (text.slice(i, i + 2) === "//") {
      const endLine = text.indexOf("\n", i);
      const commentEnd = endLine === -1 ? text.length : endLine;
      tokens.push({
        type: "comment",
        value: text.slice(i, commentEnd),
      });
      i = commentEnd;
      continue;
    }

    // Block comments
    if (text.slice(i, i + 2) === "/*") {
      const endComment = text.indexOf("*/", i);
      const commentEnd = endComment === -1 ? text.length : endComment + 2;
      tokens.push({
        type: "comment",
        value: text.slice(i, commentEnd),
      });
      i = commentEnd;
      continue;
    }

    // @ annotations (e.g., @coll:doc_id)
    if (text[i] === "@") {
      let j = i + 1;
      while (j < text.length && /[a-zA-Z0-9_:.]/.test(text[j])) {
        j++;
      }
      tokens.push({
        type: "annotation",
        value: text.slice(i, j),
      });
      i = j;
      continue;
    }

    // String literals
    if (text[i] === '"' || text[i] === "'") {
      const quote = text[i];
      let j = i + 1;
      while (j < text.length && text[j] !== quote) {
        if (text[j] === "\\") j++; // Handle escaped characters
        j++;
      }
      if (j < text.length) j++; // Include closing quote
      tokens.push({
        type: "string",
        value: text.slice(i, j),
      });
      i = j;
      continue;
    }

    // Numbers
    if (/\d/.test(text[i])) {
      let j = i;
      while (j < text.length && /[\d.]/.test(text[j])) {
        j++;
      }
      tokens.push({
        type: "number",
        value: text.slice(i, j),
      });
      i = j;
      continue;
    }

    // Keywords and identifiers
    if (/[a-zA-Z_]/.test(text[i])) {
      let j = i;
      while (j < text.length && /[a-zA-Z0-9_]/.test(text[j])) {
        j++;
      }
      const word = text.slice(i, j);
      const keywordType = DSL_KEYWORDS[word];

      if (keywordType) {
        tokens.push({
          type: keywordType,
          value: word,
        });
      } else {
        tokens.push({
          type: "identifier",
          value: word,
        });
      }
      i = j;
      continue;
    }

    // All brackets - special handling
    if (
      text[i] === "{" ||
      text[i] === "}" ||
      text[i] === "[" ||
      text[i] === "]" ||
      text[i] === "(" ||
      text[i] === ")"
    ) {
      tokens.push({
        type: "bracket",
        value: text[i],
      });
      i++;
      continue;
    }

    // Single character tokens
    tokens.push({
      type: "operator",
      value: text[i],
    });
    i++;
  }

  return tokens;
}

/**
 * Renders highlighted code based on tokens
 */
function renderHighlightedCode(text: string): React.ReactNode[] {
  const tokens = tokenizeDSL(text);

  return tokens.map((token, idx) => {
    let className = "";

    switch (token.type) {
      case "comment":
        className = "syntax-comment";
        break;
      case "keyword-const":
        className = "syntax-keyword-const";
        break;
      case "keyword-events":
        className = "syntax-keyword-events";
        break;
      case "keyword-fn":
        className = "syntax-keyword-fn";
        break;
      case "keyword-main":
        className = "syntax-keyword-main";
        break;
      case "keyword-update":
        className = "syntax-keyword-update";
        break;
      case "keyword-insert":
        className = "syntax-keyword-insert";
        break;
      case "keyword-with":
        className = "syntax-keyword-with";
        break;
      case "keyword-delete":
        className = "syntax-keyword-delete";
        break;
      case "keyword-if":
        className = "syntax-keyword-if";
        break;
      case "keyword-else":
        className = "syntax-keyword-else";
        break;
      case "annotation":
        className = "syntax-annotation";
        break;
      case "string":
        className = "syntax-string";
        break;
      case "number":
        className = "syntax-number";
        break;
      case "bracket":
        className = "syntax-bracket";
        break;
      case "operator":
        className = "syntax-operator";
        break;
      default:
        className = "syntax-text";
    }

    // Replace newlines with line breaks for proper display
    if (token.value.includes("\n")) {
      return token.value.split("\n").map((line, lineIdx) => (
        <span key={`${idx}-${lineIdx}`}>
          {lineIdx > 0 && <br />}
          <span className={className}>{line || ""}</span>
        </span>
      ));
    }

    return (
      <span key={idx} className={className}>
        {token.value}
      </span>
    );
  });
}

export function DSLCodeEditor({
  value,
  onChange,
  placeholder = "Write your trigger code here...",
  minHeight = 256,
}: DSLCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [scrollSync, setScrollSync] = useState(false);

  // Sync scroll between textarea and highlight
  useEffect(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;

    if (!textarea || !highlight) return;

    const handleScroll = () => {
      if (highlight) {
        highlight.scrollTop = textarea.scrollTop;
        highlight.scrollLeft = textarea.scrollLeft;
      }
    };

    textarea.addEventListener("scroll", handleScroll);
    return () => textarea.removeEventListener("scroll", handleScroll);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div
      className="dsl-code-editor !bg-card border !border-console-border"
      style={{ minHeight: `${minHeight}px` }}
    >
      {/* Syntax highlighted background */}
      <div className="dsl-highlight" ref={highlightRef}>
        <pre className="dsl-code-pre">{renderHighlightedCode(value)}</pre>
      </div>

      {/* Editable textarea */}
      <textarea
        ref={textareaRef}
        className="dsl-textarea"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        spellCheck="false"
        style={{ minHeight: `${minHeight}px` }}
      />
    </div>
  );
}
