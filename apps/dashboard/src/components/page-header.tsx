import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  children?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumbs = [], children }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/5 pb-6 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/" className="hover:text-naty-green transition">
              Home
            </Link>
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                <ChevronRight size={10} className="text-gray-600" />
                {b.href ? (
                  <Link href={b.href} className="hover:text-naty-green transition">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-gray-400 font-medium">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Title and description */}
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-gray-400">
            {description}
          </p>
        )}
      </div>

      {/* Custom Actions */}
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
