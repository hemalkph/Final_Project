import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2,
  CircleDollarSign,
  Clock,
  Handshake,
  Home,
  KeyRound,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/stat-card';
import { ErrorState } from '@/components/error-state';
import { queryKeys } from '@/lib/queryKeys';
import { statsApi } from './api';
import { pendingListingsApi } from '@/features/pending-listings/api';
import { sellerApplicationsApi } from '@/features/seller-applications/api';

export function DashboardPage() {
  const statsQuery = useQuery({
    queryKey: queryKeys.stats.all(),
    queryFn: statsApi.getStats,
  });

  // Reuses the already-built Pending Listings / Seller Applications queries
  // purely for their real counts — no new backend calls, no fabricated data.
  const pendingListingsQuery = useQuery({
    queryKey: queryKeys.pendingListings.all(),
    queryFn: pendingListingsApi.getAll,
  });

  const sellerApplicationsQuery = useQuery({
    queryKey: queryKeys.sellerApplications.all(),
    queryFn: sellerApplicationsApi.getAll,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Overview of your real estate platform." />

      {statsQuery.isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px] w-full" />
          ))}
        </div>
      )}

      {statsQuery.isError && (
        <ErrorState error={statsQuery.error} onRetry={() => statsQuery.refetch()} resourceName="dashboard stats" />
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
        <h2 className="mb-3 text-sm font-medium text-foreground">Needs Attention</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link to="/pending-listings">
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Pending Listings</p>
                    <p className="text-sm text-muted-foreground">
                      {pendingListingsQuery.isLoading
                        ? 'Loading…'
                        : pendingListingsQuery.isSuccess
                          ? `${pendingListingsQuery.data.length} awaiting review`
                          : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/seller-applications">
            <Card className="transition-colors hover:bg-accent/50">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UserCheck className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Seller Applications</p>
                    <p className="text-sm text-muted-foreground">
                      {sellerApplicationsQuery.isLoading
                        ? 'Loading…'
                        : sellerApplicationsQuery.isSuccess
                          ? `${sellerApplicationsQuery.data.length} awaiting review`
                          : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
