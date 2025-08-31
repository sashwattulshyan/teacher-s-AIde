import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MarkdownRenderer.css';

const MarkdownRenderer = ({ 
  content, 
  className = '', 
  maxLength = null,
  showFullContent = false,
  onToggleFullContent = null,
  onStudentView = null,
  showStudentViewButton = false
}) => {

  // Handle empty or null content
  if (!content || typeof content !== 'string') {
    return <div className={`markdown-renderer ${className}`}>No content available</div>;
  }

  // Truncate content if maxLength is specified and we're not showing full content
  let displayContent = content;
  if (maxLength && !showFullContent && content.length > maxLength) {
    displayContent = content.substring(0, maxLength) + '...';
  }

  return (
    <div className={`markdown-renderer ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize how different elements are rendered
          h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
          h4: ({ children }) => <h4 className="markdown-h4">{children}</h4>,
          h5: ({ children }) => <h5 className="markdown-h5">{children}</h5>,
          h6: ({ children }) => <h6 className="markdown-h6">{children}</h6>,
          ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
          ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
          li: ({ children }) => <li className="markdown-li">{children}</li>,
          strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
          em: ({ children }) => <em className="markdown-em">{children}</em>,
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <pre className="markdown-pre">
                <code className={`markdown-code ${className}`} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="markdown-inline-code" {...props}>
                {children}
              </code>
            );
          },
          // Override p component to handle nested code blocks properly
          p: ({ children, ...props }) => {
            // Check if any child is a pre element
            const hasPreChild = React.Children.toArray(children).some(child => 
              React.isValidElement(child) && child.type === 'pre'
            );
            
            // If there's a pre child, render as div instead of p
            if (hasPreChild) {
              return <div className="markdown-p" {...props}>{children}</div>;
            }
            
            return <p className="markdown-p" {...props}>{children}</p>;
          },
          blockquote: ({ children }) => (
            <blockquote className="markdown-blockquote">{children}</blockquote>
          ),
          table: ({ children }) => <table className="markdown-table">{children}</table>,
          thead: ({ children }) => <thead className="markdown-thead">{children}</thead>,
          tbody: ({ children }) => <tbody className="markdown-tbody">{children}</tbody>,
          tr: ({ children }) => <tr className="markdown-tr">{children}</tr>,
          th: ({ children }) => <th className="markdown-th">{children}</th>,
          td: ({ children }) => <td className="markdown-td">{children}</td>,
          a: ({ href, children }) => (
            <a href={href} className="markdown-link" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          hr: () => <hr className="markdown-hr" />,
        }}
      >
        {displayContent}
      </ReactMarkdown>
      
      {/* Show "Student View" button for teachers */}
      {showStudentViewButton && onStudentView && (
        <button 
          className="markdown-student-view"
          onClick={() => onStudentView()}
        >
          👁️ Student View
        </button>
      )}
      
      {/* Show "Read More" button if content is truncated and no student view */}
      {!showStudentViewButton && maxLength && !showFullContent && content.length > maxLength && (
        <button 
          className="markdown-read-more"
          onClick={() => onToggleFullContent && onToggleFullContent()}
        >
          Read More
        </button>
      )}
      
      {/* Show "Read Less" button if content is expanded */}
      {!showStudentViewButton && maxLength && showFullContent && content.length > maxLength && (
        <button 
          className="markdown-read-less"
          onClick={() => onToggleFullContent && onToggleFullContent()}
        >
          Read Less
        </button>
      )}
    </div>
  );
};

export default MarkdownRenderer;