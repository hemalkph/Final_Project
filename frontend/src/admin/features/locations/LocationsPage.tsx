import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { TableSkeleton } from '@/components/table-skeleton';
import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { queryKeys } from '@/lib/queryKeys';
import { agentsApi } from '@/features/agents/api';

export function LocationsPage() {
  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.all(),
    queryFn: agentsApi.getAll,
  });

  const breakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const agent of agentsQuery.data ?? []) {
      if (!agent.location) continue;
      counts.set(agent.location, (counts.get(agent.location) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [agentsQuery.data]);

  const maxCount = breakdown[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locations"
        description="Agent coverage by location. Properties don't have a structured location field yet, so this covers agents only."
      />

      {agentsQuery.isLoading && <TableSkeleton rows={6} />}

      {agentsQuery.isError && (
        <ErrorState error={agentsQuery.error} onRetry={() => agentsQuery.refetch()} resourceName="agents" />
      )}

      {agentsQuery.isSuccess && breakdown.length === 0 && (
        <EmptyState icon={MapPin} title="No location data yet" description="No agents have a location set." />
      )}

      {agentsQuery.isSuccess && breakdown.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {breakdown.map(([location, count]) => (
            <Link key={location} to={`/agents?location=${encodeURIComponent(location)}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium text-foreground">{location}</p>
                    <span className="text-sm text-muted-foreground">
                      {count} agent{count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(8, (count / maxCount) * 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
