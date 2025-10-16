import Link from 'next/link';
import { FileText, BookOpen, Code, Users, Wrench, Package, FileCode, GitBranch } from 'lucide-react';

export default function DocsHome() {
  // List of documentation files with icons and descriptions
  const docs = [
    { 
      file: '01-Product-Requirements-Document', 
      title: 'Product Requirements Document (PRD)',
      description: 'Complete product vision, features, and business requirements',
      icon: FileText,
      colorClass: 'doc-card-blue',
      category: 'Product'
    },
    { 
      file: '02-Technical-Design-Document', 
      title: 'Technical Design Document (TDD)',
      description: 'System architecture, tech stack, and design decisions',
      icon: Code,
      colorClass: 'doc-card-purple',
      category: 'Technical'
    },
    { 
      file: '03-API-Documentation', 
      title: 'API Documentation',
      description: 'REST API endpoints, authentication, and integration guides',
      icon: FileCode,
      colorClass: 'doc-card-green',
      category: 'Development'
    },
    { 
      file: '04-User-Manual', 
      title: 'User Manual',
      description: 'End-user guide for all system features and workflows',
      icon: BookOpen,
      colorClass: 'doc-card-orange',
      category: 'User Guide'
    },
    { 
      file: '05-Source-Code-Documentation', 
      title: 'Source Code Documentation',
      description: 'Code structure, patterns, and developer guidelines',
      icon: GitBranch,
      colorClass: 'doc-card-pink',
      category: 'Development'
    },
    { 
      file: '06-Deployment-Maintenance-Guide', 
      title: 'Deployment & Maintenance Guide',
      description: 'Setup, deployment, monitoring, and troubleshooting',
      icon: Wrench,
      colorClass: 'doc-card-red',
      category: 'Operations'
    },
    { 
      file: '07-Release-Notes', 
      title: 'Release Notes',
      description: 'Version history, features, and bug fixes',
      icon: Package,
      colorClass: 'doc-card-teal',
      category: 'Product'
    },
    { 
      file: '08-Process-Documentation', 
      title: 'Process Documentation',
      description: 'Development workflows, best practices, and procedures',
      icon: Users,
      colorClass: 'doc-card-indigo',
      category: 'Process'
    },
  ];

  return (
    <main className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-block px-4 py-2 bg-blue-50 dark:bg-blue-950 rounded-full mb-4">
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Documentation Portal</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-black dark:text-white">
            Nest Documentation
          </h1>
          <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Comprehensive documentation for the Nest Asset Management System. 
            Browse through guides, API references, and technical specifications.
          </p>
        </div>

        {/* Documentation Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {docs.map((doc) => {
            const Icon = doc.icon;
            return (
              <Link 
                key={doc.file} 
                href={`/docs/${doc.file}`}
                className={`doc-card ${doc.colorClass} group`}
              >
                <div className="doc-card-category">{doc.category}</div>
                
                <div className="doc-card-icon-wrapper">
                  <Icon className="doc-card-icon" />
                </div>
                
                <h3 className="doc-card-title">
                  {doc.title}
                </h3>
                
                <p className="doc-card-description">
                  {doc.description}
                </p>
                
                <div className="doc-card-arrow">
                  <span>Read documentation</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Links Section */}
        <div className="bg-gray-50 dark:bg-gray-950 rounded-2xl p-8 border border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold mb-6 text-black dark:text-white">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              href="/docs/README" 
              className="flex items-center p-4 rounded-xl bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border border-gray-200 dark:border-gray-800 group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center mr-4">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-black dark:text-white block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Documentation Index</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Full documentation overview</span>
              </div>
            </Link>
            <Link 
              href="/docs/DOCUMENTATION-SUMMARY" 
              className="flex items-center p-4 rounded-xl bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors border border-gray-200 dark:border-gray-800 group"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center mr-4">
                <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-black dark:text-white block group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Documentation Summary</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">Quick overview of all docs</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
