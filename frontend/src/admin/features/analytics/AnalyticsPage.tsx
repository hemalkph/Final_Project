import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, CircleDollarSign, Clock, Handshake, Home, KeyRound, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/stat-card';
import { TableSkeleton } from '@/components/table-skeleton';
import { ErrorState } from '@/components/error-state';
import { queryKeys } from '@/lib/queryKeys';
import { statsApi } from '@/features/dashboard/api';
import { propertiesApi } from '@/features/properties/api';
import { PROPERTY_STATUS_VARIANT } from '@/features/properties/columns';
import { PROPERTY_STATUSES } from '@/types/property';

export function AnalyticsPage() {
  const statsQuery = useQuery({
    queryKey: queryKeys.stats.all(),
    queryFn: statsApi.getStats,
  });

  // StatsDTO has no REJECTED count — fetching the full list and counting
  // client-side is the only way to show a complete, honest status
  // breakdown (all 5 statuses, not just the 4 the flat-count endpoint has).
  const propertiesQuery = useQuery({
    queryKey: queryKeys.properties.list({}),
    queryFn: () => propertiesApi.getAll({}),
  });

  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const status of PROPERTY_STATUSES) counts.set(status, 0);
    for (const property of propertiesQuery.data ?? []) {
      counts.set(property.status, (counts.get(property.status) ?? 0) + 1);
    }
    return PROPERTY_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 }));
  }, [propertiesQuery.data]);

  const totalProperties = propertiesQuery.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Platform-wide counts and breakdowns from live data." />

      {statsQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full" />
          ))}
        </div>
      )}

      {statsQuery.isError && (
        <ErrorState error={statsQuery.error} onRetry={() => statsQuery.refetch()} resourceName="analytics" />
      )}

      {statsQuery.isSuccess && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard icon={Building2} label="Total Properties" value={statsQuery.data.totalProperties} />
          <StatCard icon={Home} label="Active Listings" value={statsQuery.data.activeListings} />
          <StatCard icon={Clock} label="Pending Review" value={statsQuery.data.pendingProperties} />
          <StatCard icon={CircleDollarSign} label="Sold" value={statsQuery.data.soldProperties} />
          <StatCard icon={KeyRound} label="Rented" value={statsQuery.data.rentedProperties} />
          <StatCard icon={Handshake} label="Total Agents" value={statsQuery.data.totalAgents} />
          <StatCard icon={UsersRound} label="Total Users" value={statsQuery.data.totalUsers} />
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Property Status Breakdown</h2>

        {propertiesQuery.isLoading && <TableSkeleton rows={5} />}

        {propertiesQuery.isError && (
          <ErrorState error={propertiesQuery.error} onRetry={() => propertiesQuery.refetch()} resourceName="properties" />
        )}

        {propertiesQuery.isSuccess && (
          <Card>
            <CardContent className="space-y-3 p-4">
              {statusBreakdown.map(({ status, count }) => (
                <div key={status} className="flex items-center gap-3">
                  <Badge variant={PROPERTY_STATUS_VARIANT[status]} className="w-24 justify-center">
                    {status}
                  </Badge>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${totalProperties ? Math.max(2, (count / totalProperties) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-sm text-muted-foreground">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Trends</h2>
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Historical trend data (e.g. properties listed per month) requires backend time-series support that
            doesn't exist yet — not shown here rather than faked.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
