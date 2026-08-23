import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { queryKeys } from '@/lib/queryKeys';
import { pendingListingsApi } from '@/features/pending-listings/api';
import { sellerApplicationsApi } from '@/features/seller-applications/api';

export function VerificationFraudPage() {
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
      <PageHeader
        title="Verification & Fraud"
        description="Approval queues that need review. There's no separate verification workflow beyond these two yet — this page just brings them together."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to="/pending-listings">
          <Card className="transition-colors hover:bg-accent/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="size-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">Pending Listings</p>
                <p className="text-sm text-muted-foreground">
                  {pendingListingsQuery.isLoading
                    ? 'Loading…'
                    : pendingListingsQuery.isSuccess
                      ? `${pendingListingsQuery.data.length} awaiting review`
                      : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/seller-applications">
          <Card className="transition-colors hover:bg-accent/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserCheck className="size-4" />
              </div>
              <div>
                <p className="font-medium text-foreground">Seller Applications</p>
                <p className="text-sm text-muted-foreground">
                  {sellerApplicationsQuery.isLoading
                    ? 'Loading…'
                    : sellerApplicationsQuery.isSuccess
                      ? `${sellerApplicationsQuery.data.length} awaiting review`
                      : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
