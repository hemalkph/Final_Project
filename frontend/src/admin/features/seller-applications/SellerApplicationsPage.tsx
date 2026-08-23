import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { isAxiosError } from 'axios';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/data-table';
import { queryKeys } from '@/lib/queryKeys';
import type { SellerApplication } from '@/types/seller';
import { sellerApplicationsApi } from './api';
import { getApplicationColumns } from './columns';
import { ApproveApplicationAlert } from './ApproveApplicationAlert';
import { RejectApplicationDialog } from './RejectApplicationDialog';
import { AccountsTab } from './AccountsTab';

export function SellerApplicationsPage() {
  const applicationsQuery = useQuery({
    queryKey: queryKeys.sellerApplications.all(),
    queryFn: sellerApplicationsApi.getAll,
  });

  const [approveApplication, setApproveApplication] = useState<SellerApplication | null>(null);
  const [rejectApplication, setRejectApplication] = useState<SellerApplication | null>(null);

  const columns = getApplicationColumns({
    onApprove: setApproveApplication,
    onReject: setRejectApplication,
  });

  const isForbidden = isAxiosError(applicationsQuery.error) && applicationsQuery.error.response?.status === 403;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Seller Applications</h1>
        <p className="text-sm text-muted-foreground">Review new seller sign-ups and manage seller accounts.</p>
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          {applicationsQuery.isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {applicationsQuery.isError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>{isForbidden ? 'Permission denied' : 'Failed to load applications'}</AlertTitle>
              <AlertDescription>
                {isForbidden
                  ? "Your account doesn't have permission to view this. Log in as an admin and try again."
                  : 'Something went wrong reaching the server.'}
                <Button variant="link" className="h-auto p-0 pl-2" onClick={() => applicationsQuery.refetch()}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {applicationsQuery.isSuccess && (
            <DataTable
              columns={columns}
              data={applicationsQuery.data}
              emptyMessage="No pending applications — all caught up."
            />
          )}
        </TabsContent>

        <TabsContent value="accounts">
          <AccountsTab />
        </TabsContent>
      </Tabs>

      <ApproveApplicationAlert
        application={approveApplication}
        onOpenChange={(open) => !open && setApproveApplication(null)}
      />

      <RejectApplicationDialog
        application={rejectApplication}
        onOpenChange={(open) => !open && setRejectApplication(null)}
      />
    </div>
  );
}
