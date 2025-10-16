import { notFound } from 'next/navigation';
import { readFile } from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { DocsNavigation } from '@/components/DocsNavigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const DOCS_DIR = path.join(process.cwd(), 'Project-docs');

export default async function DocPage({ params }: { params: { slug: string } }) {
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
  const file = slugToFile[params.slug];
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
      <div className="lg:pl-64">
        <main className="min-h-screen bg-white dark:bg-black">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            {/* Back Button */}
            <Link 
              href="/docs" 
              className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-8 group transition-colors"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back to Documentation Home</span>
            </Link>

            {/* Content */}
            <div className="bg-white dark:bg-black rounded-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden">
              <MarkdownRenderer 
                content={content} 
                title={data.title || params.slug.replace(/-/g, ' ')} 
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
