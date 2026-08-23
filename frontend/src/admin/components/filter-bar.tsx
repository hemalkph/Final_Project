import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
}

/**
 * Consistent layout wrapper for a page's search/filter row — a thin
 * flex-wrap container, not a new state abstraction. Each page still owns
 * its own filter inputs/state; this just standardizes the spacing every
 * toolbar page should share.
 */
export function FilterBar({ children }: FilterBarProps) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}
