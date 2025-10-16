'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useEffect, useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  title?: string;
}

export function MarkdownRenderer({ content, title }: MarkdownRendererProps) {
  const [headings, setHeadings] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const [activeHeading, setActiveHeading] = useState<string>('');

  useEffect(() => {
    // Extract headings for table of contents
    const headingMatches = content.matchAll(/^#{1,3}\s+(.+)$/gm);
    const extractedHeadings = Array.from(headingMatches).map((match) => {
      const level = match[0].split(' ')[0].length;
      const text = match[1];
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return { id, text, level };
    });
    setHeadings(extractedHeadings);
  }, [content]);

  useEffect(() => {
    // Track active heading on scroll
    const handleScroll = () => {
      const headingElements = headings.map(h => document.getElementById(h.id)).filter(Boolean);
      const scrollPosition = window.scrollY + 150;
      
      for (let i = headingElements.length - 1; i >= 0; i--) {
        const element = headingElements[i];
        if (element && element.offsetTop <= scrollPosition) {
          setActiveHeading(element.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8">
      {/* Main Content */}
      <div className="flex-1 min-w-0 p-8 lg:p-12">
        {title && (
          <div className="mb-10 pb-6 border-b-4 border-blue-600 dark:border-blue-500">
            <h1 className="text-4xl lg:text-5xl font-bold text-black dark:text-white">
              {title}
            </h1>
          </div>
        )}
        <article className="prose prose-lg dark:prose-invert max-w-none
          prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-black dark:prose-headings:text-white
          prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-10
          prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-10 prose-h2:border-b-2 prose-h2:border-gray-300 dark:prose-h2:border-gray-700 prose-h2:pb-3
          prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-8
          prose-h4:text-xl prose-h4:mb-2 prose-h4:mt-6
          prose-p:leading-relaxed prose-p:mb-4 prose-p:text-gray-800 dark:prose-p:text-gray-200
          prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-a:font-medium prose-a:decoration-2 prose-a:underline-offset-2
          prose-strong:text-black dark:prose-strong:text-white prose-strong:font-bold
          prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-900 prose-code:px-2 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-[''] prose-code:after:content-[''] prose-code:font-mono prose-code:text-sm
          prose-pre:bg-gray-900 dark:prose-pre:bg-black prose-pre:border-2 prose-pre:border-gray-700 dark:prose-pre:border-gray-800 prose-pre:rounded-xl prose-pre:shadow-lg
          prose-blockquote:border-l-4 prose-blockquote:border-blue-600 dark:prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-950 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:my-6 prose-blockquote:not-italic
          prose-ul:list-disc prose-ul:ml-6 prose-ul:my-4
          prose-ol:list-decimal prose-ol:ml-6 prose-ol:my-4
          prose-li:mb-2 prose-li:text-gray-800 dark:prose-li:text-gray-200
          prose-table:border-collapse prose-table:w-full prose-table:my-6 prose-table:border-2 prose-table:border-gray-300 dark:prose-table:border-gray-700 prose-table:rounded-lg prose-table:overflow-hidden
          prose-thead:bg-gray-100 dark:prose-thead:bg-gray-900
          prose-th:bg-gray-100 dark:prose-th:bg-gray-900 prose-th:p-4 prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-700 prose-th:font-bold prose-th:text-left prose-th:text-black dark:prose-th:text-white
          prose-td:p-4 prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-700 prose-td:text-gray-800 dark:prose-td:text-gray-200
          prose-img:rounded-xl prose-img:shadow-xl prose-img:my-8 prose-img:border-2 prose-img:border-gray-200 dark:prose-img:border-gray-800
          prose-hr:border-gray-300 dark:prose-hr:border-gray-700 prose-hr:my-10
        ">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({node, ...props}) => {
                const text = props.children?.toString() || '';
                const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                return <h1 id={id} {...props} />;
              },
              h2: ({node, ...props}) => {
                const text = props.children?.toString() || '';
                const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                return <h2 id={id} {...props} />;
              },
              h3: ({node, ...props}) => {
                const text = props.children?.toString() || '';
                const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
                return <h3 id={id} {...props} />;
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>

      {/* Table of Contents - Desktop Only */}
      {headings.length > 0 && (
        <aside className="hidden xl:block w-80 flex-shrink-0">
          <div className="sticky top-8 bg-gray-50 dark:bg-gray-950 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-800">
            <h3 className="font-bold text-sm uppercase tracking-wide text-black dark:text-white mb-6 flex items-center">
              <span className="w-1 h-4 bg-blue-600 dark:bg-blue-500 rounded-full mr-2"></span>
              On This Page
            </h3>
            <nav className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
              {headings.map((heading, index) => (
                <button
                  key={index}
                  onClick={() => scrollToHeading(heading.id)}
                  className={`
                    block text-left w-full text-sm transition-all duration-200 py-2 px-3 rounded-lg
                    ${activeHeading === heading.id 
                      ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-semibold border-l-4 border-blue-600 dark:border-blue-500' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-900 border-l-4 border-transparent'
                    }
                    ${heading.level === 1 ? 'font-semibold text-black dark:text-white' : ''}
                    ${heading.level === 2 ? 'font-medium text-gray-700 dark:text-gray-300 pl-6' : ''}
                    ${heading.level === 3 ? 'text-gray-600 dark:text-gray-400 pl-10' : ''}
                  `}
                >
                  {heading.text}
                </button>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </div>
  );
}
