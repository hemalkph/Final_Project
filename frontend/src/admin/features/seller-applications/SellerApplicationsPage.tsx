import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/layout/page-header';
import { TableSkeleton } from '@/components/table-skeleton';
import { ErrorState } from '@/components/error-state';
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seller Applications"
        description="Review new seller sign-ups and manage seller accounts."
        actions={
          applicationsQuery.isSuccess ? (
            <Badge variant="secondary">{applicationsQuery.data.length} pending</Badge>
          ) : undefined
        }
      />

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="accounts">Seller Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          {applicationsQuery.isLoading && <TableSkeleton rows={4} />}

          {applicationsQuery.isError && (
            <ErrorState
              error={applicationsQuery.error}
              onRetry={() => applicationsQuery.refetch()}
              resourceName="applications"
            />
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
