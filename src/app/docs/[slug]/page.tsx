import { notFound } from 'next/navigation';
import { readFile } from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { DocsNavigation } from '@/components/DocsNavigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const DOCS_DIR = path.join(process.cwd(), 'Project-docs');

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Map slug to filename
  const slugToFile: Record<string, string> = {
    '01-Product-Requirements-Document': '01-Product-Requirements-Document.md',
    '02-Technical-Design-Document': '02-Technical-Design-Document.md',
    '03-API-Documentation': '03-API-Documentation.md',
    '04-User-Manual': '04-User-Manual.md',
    '05-Source-Code-Documentation': '05-Source-Code-Documentation.md',
    '06-Deployment-Maintenance-Guide': '06-Deployment-Maintenance-Guide.md',
    '07-Release-Notes': '07-Release-Notes.md',
    '08-Process-Documentation': '08-Process-Documentation.md',
    'README': 'README.md',
    'DOCUMENTATION-SUMMARY': 'DOCUMENTATION-SUMMARY.txt',
  };
  const file = slugToFile[slug];
  if (!file) return notFound();
  const filePath = path.join(DOCS_DIR, file);
  let source: string;
  try {
    source = await readFile(filePath, 'utf8');
  } catch {
    return notFound();
  }
  // Parse frontmatter if present
  const { content, data } = matter(source);
  
  return (
    <>
      <DocsNavigation />
      <div className="lg:pl-80">
        <main className="min-h-screen bg-background pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto min-w-0 py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <Link 
              href="/docs" 
              className="inline-flex items-center space-x-2 text-primary hover:underline group transition-colors"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back to Documentation Home</span>
            </Link>
            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Internal use only
            </span>
            </div>

            {/* Content */}
            <div className="min-w-0 rounded-2xl border-2 border-border bg-background">
              <MarkdownRenderer 
                content={content} 
                title={data.title || slug.replace(/-/g, ' ')} 
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
