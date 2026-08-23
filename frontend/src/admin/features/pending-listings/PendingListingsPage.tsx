import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/layout/page-header';
import { TableSkeleton } from '@/components/table-skeleton';
import { ErrorState } from '@/components/error-state';
import { queryKeys } from '@/lib/queryKeys';
import type { Property } from '@/types/property';
import { ViewPropertyDialog } from '@/features/properties/ViewPropertyDialog';
import { ImageLightbox } from '@/features/properties/ImageLightbox';
import { pendingListingsApi } from './api';
import { getPendingListingColumns } from './columns';
import { ApproveListingDialog } from './ApproveListingDialog';
import { RejectListingDialog } from './RejectListingDialog';

export function PendingListingsPage() {
  const pendingQuery = useQuery({
    queryKey: queryKeys.pendingListings.all(),
    queryFn: pendingListingsApi.getAll,
  });

  const [viewProperty, setViewProperty] = useState<Property | null>(null);
  const [approveProperty, setApproveProperty] = useState<Property | null>(null);
  const [rejectProperty, setRejectProperty] = useState<Property | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const columns = getPendingListingColumns({
    onView: setViewProperty,
    onApprove: setApproveProperty,
    onReject: setRejectProperty,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Listings"
        description="Review and approve or reject newly submitted properties."
        actions={
          pendingQuery.isSuccess ? (
            <Badge variant="secondary">{pendingQuery.data.length} pending</Badge>
          ) : undefined
        }
      />

      {pendingQuery.isLoading && <TableSkeleton rows={4} />}

      {pendingQuery.isError && (
        <ErrorState error={pendingQuery.error} onRetry={() => pendingQuery.refetch()} resourceName="pending listings" />
      )}

      {pendingQuery.isSuccess && (
        <DataTable columns={columns} data={pendingQuery.data} emptyMessage="No pending listings — all caught up." />
      )}

      <ViewPropertyDialog
        open={Boolean(viewProperty)}
        onOpenChange={(open) => !open && setViewProperty(null)}
        property={viewProperty}
        onImageClick={setLightboxSrc}
      />

      <ImageLightbox src={lightboxSrc} onOpenChange={(open) => !open && setLightboxSrc(null)} />

      <ApproveListingDialog property={approveProperty} onOpenChange={(open) => !open && setApproveProperty(null)} />

      <RejectListingDialog property={rejectProperty} onOpenChange={(open) => !open && setRejectProperty(null)} />
    </div>
  );
}
