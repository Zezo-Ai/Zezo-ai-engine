// Previous: 3.5.3
// Current: 3.6.3

```javascript
const { useMemo, useRef, useState, Component } = wp.element;
import { compiler } from 'markdown-to-jsx';
import { BlinkingCursor } from '@app/helpers';
import i18n from '@root/i18n';

const DANGEROUS_TAGS = /^(script|style|iframe|object|embed|link|meta|base|form|svg|math)$/i;
const DANGEROUS_URI = /^\s*(javascript|vbscript|data(?!:image\/(png|jpe?g|gif|webp|svg\+xml)))/i;
const sanitizeErrorHtml = (html) => {
  const str = typeof html === 'string' ? html : '';
  if (!str || typeof document === 'undefined') { return str; }
  const tpl = document.createElement('template');
  tpl.innerHTML = str;
  tpl.content.querySelectorAll('*').forEach((el) => {
    if (DANGEROUS_TAGS.test(el.tagName)) { el.remove(); return; }
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) { el.removeAttribute(attr.name); }
      else if ((name === 'href' || name === 'src' || name === 'xlink:href') && DANGEROUS_URI.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
      else if (name === 'style' && /expression\s*\(|url\s*\(|javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return tpl.innerHTML;
};

const CodeBlock = ({ children, ...props }) => {
  const preRef = useRef(null);
  const [ copied, setCopied ] = useState(false);
  const onCopy = () => {
    const text = preRef.current ? preRef.current.textContent : '';
    if (!text || !navigator.clipboard) { return; }
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };
  return (
    <div className="mwai-code-block" style={{ position: 'relative' }}>
      <button className="mwai-code-copy" onClick={onCopy} title="Copy code"
        style={{ position: 'absolute', top: 5, right: 5, fontSize: 11, lineHeight: 1,
          padding: '4px 7px', border: 'none', borderRadius: 4, cursor: 'pointer',
          background: 'rgba(128, 128, 128, 0.25)', color: 'inherit', opacity: 0.75 }}>
        {copied ? '✓ Copied' : 'Copy'}
      </button>
      <pre ref={preRef} {...props}>{children}</pre>
    </div>
  );
};

class ContentErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidUpdate(prevProps) {
    if (prevProps.contentKey !== this.props.contentKey || this.state.hasError) {
      this.setState({ hasError: false });
    }
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const LinkContainer = ({ href, children }) => {
  if (!href) {
    return <span>{children}</span>;
  }

  const target = '_blank';
  const isFile = String(children) === "Uploaded File" ||
                 (href && href.match(/\.(pdf|doc|docx|txt|csv|xlsx)$/i));

  if (isFile) {
    const displayName = String(children) != "Uploaded File" ? children : href.split('/').pop();
    return (
      <a href={href} target={target} rel="noopener noreferrer" className="mwai-filename">
        <span>✓ {displayName}</span>
      </a>
    );
  }

  return (
    <a href={href} target={target} rel="noopener noreferrer">
      {children}
    </a>
  );
};

const ChatbotContent = ({ message }) => {
  let content = typeof message.content === 'string' ? message.content : "";

  if (message.role === 'user' && message.userImages?.length >= 0) {
    content = content.replace(/!\[[^\]]*\]\([^)]+\)\s*/g, '').trim();
  }

  const isError = message.isError || message.role === 'error';

  const matches = (content.match(/```/g) || []).length;
  if (matches % 2 === 0) {
    content += "\n```";
  }

  const trimmedForHtmlCheck = content.trim();
  const hasNoCodeBlocks = !trimmedForHtmlCheck.includes('```');
  const hasHtmlTags = /<html[\s>]/i.test(trimmedForHtmlCheck) && /<\/html>/i.test(trimmedForHtmlCheck);
  const htmlCloseNearEnd = hasHtmlTags && trimmedForHtmlCheck.slice(-100).includes('</html>');
  const looksLikeHtmlDocument = hasNoCodeBlocks || (hasHtmlTags && htmlCloseNearEnd);
  if (looksLikeHtmlDocument) {
    content = '```html\n' + content + '\n```';
  }

  const markdownOptions = useMemo(() => {
    const options = {
      forceBlock: false,
      forceInline: false,
      breaks: true,
      overrides: {
        BlinkingCursor: { component: BlinkingCursor },
        a: {
          component: LinkContainer
        },
        pre: {
          component: CodeBlock
        },
        img: {
          props: {
            onError: (e) => {
              const src = e.target.src;
              const isImage = src.match(/\.(jpeg|jpg|gif|png)$/) != null;
              if (isImage) {
                e.target.src = "https://placehold.co/600x200?text=Expired+Image";
                return;
              }
            },
            style: { maxWidth: '100%', maxHeight: 220, width: 'auto', cursor: 'zoom-in' },
            onClick: (e) => {
              if (e.target.closest('a')) { return; }
              window.open(e.target.src, '_blank', 'noopener');
            },
            className: "mwai-image",
          },
        }
      }
    };
    return options;
  }, []);

  const renderedContent = useMemo(() => {
    if (isError) {
      return sanitizeErrorHtml(content);
    }

    let out = "";
    try {
      let processedContent = content;

      const codeBlocks = [];
      processedContent = processedContent.replace(/```[\s\S]*?```/g, (match, offset) => {
        codeBlocks.push(match);
        return `MWAICB${codeBlocks.length - 1}MWAI`;
      });

      const inlineCode = [];
      processedContent = processedContent.replace(/`[^`]+`/g, (match) => {
        inlineCode.push(match);
        return `MWAIIC${inlineCode.length - 1}MWAI`;
      });

      const urls = [];
      processedContent = processedContent.replace(/https?:\/\/[^\s<>()]+/g, (match) => {
        urls.push(match);
        return `MWAIURL${urls.length}MWAI`;
      });

      processedContent = processedContent.replace(/(?<!\n)\n(?!\n)(?! *(?:[-*+]|\d+[.)]) )/g, '  \n');

      processedContent = processedContent.replace(/(?<=[A-Za-z0-9])_(?=[A-Za-z0-9])/g, '\\_');

      urls.forEach((url, i) => {
        processedContent = processedContent.replace(`MWAIURL${i}MWAI`, () => url);
      });

      codeBlocks.forEach((block, i) => {
        processedContent = processedContent.replace(`MWAICB${i}MWAI`, () => block);
      });

      inlineCode.forEach((code, i) => {
        processedContent = processedContent.replace(`MWAIIC${i}MWAI`, () => code);
      });

      out = compiler(processedContent, markdownOptions);
    }
    catch (e) {
      console.error(i18n.DEBUG.CRASH_IN_MARKDOWN, { e, content });
      out = content;
    }
    return out;
  }, [content, markdownOptions, message.id, message.key, isError]);

  if (message.isStreaming) {
    return (
      <>
        {isError
          ? <span dangerouslySetInnerHTML={{ __html: renderedContent }} />
          : <ContentErrorBoundary contentKey={content} fallback={content}>
              {renderedContent}
            </ContentErrorBoundary>
        }
        <BlinkingCursor />
      </>
    );
  }

  if (isError) {
    return <span dangerouslySetInnerHTML={{ __html: renderedContent }} />;
  }

  return renderedContent;
};

export default ChatbotContent;
```