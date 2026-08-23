import { EmptyState } from '@/components/empty-state';

interface ModulePlaceholderProps {
  title: string;
}

/**
 * Rendered for every enabled ('functional'/'partial') nav item whose real
 * page hasn't shipped yet — see migration plan phase status. 'absent'
 * modules don't get a route at all; see AppSidebar.
 */
export function ModulePlaceholder({ title }: ModulePlaceholderProps) {
  return (
    <EmptyState
      title={title}
      description="This page ships in a later migration phase. The sidebar structure and routing are in place now; the real data and actions come next."
    />
  );
}
