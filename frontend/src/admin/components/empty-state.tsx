import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

/**
 * Shared "nothing here" block — used for whole-route placeholders
 * (see ModulePlaceholder) and available for any future full-page empty
 * state. Table-row empty messages stay on DataTable's own `emptyMessage`
 * prop (a single table cell can't host this block layout).
 */
export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[60vh] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-12 text-center',
        className,
      )}
    >
      {Icon && <Icon className="mb-2 size-8 text-muted-foreground" />}
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
