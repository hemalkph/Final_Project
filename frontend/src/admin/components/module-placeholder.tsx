interface ModulePlaceholderProps {
  title: string;
}

/**
 * Phase 0 renders this for every enabled ('functional'/'partial') nav item —
 * no API calls or business logic ship yet (see migration plan Phase 0
 * scope). 'absent' modules don't get a route at all; see AppSidebar.
 */
export function ModulePlaceholder({ title }: ModulePlaceholderProps) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-12 text-center">
      <h2 className="text-lg font-medium text-foreground">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page ships in a later migration phase. The sidebar structure and
        routing are in place now; the real data and actions come next.
      </p>
    </div>
  );
}
