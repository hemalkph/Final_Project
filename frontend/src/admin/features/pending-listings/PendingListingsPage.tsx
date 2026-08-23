import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { isAxiosError } from 'axios';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/data-table';
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

  const isForbidden = isAxiosError(pendingQuery.error) && pendingQuery.error.response?.status === 403;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pending Listings</h1>
        <p className="text-sm text-muted-foreground">Review and approve or reject newly submitted properties.</p>
      </div>

      {pendingQuery.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {pendingQuery.isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{isForbidden ? 'Permission denied' : 'Failed to load pending listings'}</AlertTitle>
          <AlertDescription>
            {isForbidden
              ? "Your account doesn't have permission to view this. Log in as an admin and try again."
              : 'Something went wrong reaching the server.'}
            <Button variant="link" className="h-auto p-0 pl-2" onClick={() => pendingQuery.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
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
