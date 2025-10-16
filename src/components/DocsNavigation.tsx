'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, BookOpen, Code, Users, Wrench, Package, FileCode, GitBranch, Home, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { 
    slug: '01-Product-Requirements-Document', 
    title: 'Product Requirements',
    shortTitle: 'PRD',
    icon: FileText
  },
  { 
    slug: '02-Technical-Design-Document', 
    title: 'Technical Design',
    shortTitle: 'TDD',
    icon: Code
  },
  { 
    slug: '03-API-Documentation', 
    title: 'API Documentation',
    shortTitle: 'API',
    icon: FileCode
  },
  { 
    slug: '04-User-Manual', 
    title: 'User Manual',
    shortTitle: 'Manual',
    icon: BookOpen
  },
  { 
    slug: '05-Source-Code-Documentation', 
    title: 'Source Code Docs',
    shortTitle: 'Code',
    icon: GitBranch
  },
  { 
    slug: '06-Deployment-Maintenance-Guide', 
    title: 'Deployment Guide',
    shortTitle: 'Deploy',
    icon: Wrench
  },
  { 
    slug: '07-Release-Notes', 
    title: 'Release Notes',
    shortTitle: 'Releases',
    icon: Package
  },
  { 
    slug: '08-Process-Documentation', 
    title: 'Process Docs',
    shortTitle: 'Process',
    icon: Users
  },
];

export function DocsNavigation() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white dark:bg-black p-3 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="w-5 h-5 text-black dark:text-white" />
        ) : (
          <Menu className="w-5 h-5 text-black dark:text-white" />
        )}
      </button>

      {/* Sidebar Navigation */}
      <nav
        className={`
          fixed top-0 left-0 h-screen w-72 bg-white dark:bg-black border-r-2 border-gray-200 dark:border-gray-800
          transform transition-transform duration-300 ease-in-out z-40 overflow-y-auto
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="p-6">
          {/* Logo/Title */}
          <Link 
            href="/docs" 
            className="flex items-center space-x-3 mb-8 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors group"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg text-black dark:text-white block">Nest Docs</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">Documentation Portal</span>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3 px-3">
              Main Documentation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === `/docs/${item.slug}`;
              
              return (
                <Link
                  key={item.slug}
                  href={`/docs/${item.slug}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold shadow-sm border-2 border-blue-200 dark:border-blue-900' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-950 border-2 border-transparent'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-500'}`} />
                  <span className="text-sm">{item.title}</span>
                </Link>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-6 border-t-2 border-gray-200 dark:border-gray-800" />

          {/* Additional Links */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-3 px-3">
              Quick Access
            </div>
            <Link
              href="/docs/README"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-4 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-800"
            >
              <FileText className="w-4 h-4" />
              <span>Documentation Index</span>
            </Link>
            <Link
              href="/docs/DOCUMENTATION-SUMMARY"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center space-x-3 px-4 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors text-sm border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-800"
            >
              <BookOpen className="w-4 h-4" />
              <span>Summary</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
