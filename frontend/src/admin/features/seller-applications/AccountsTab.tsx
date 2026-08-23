import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Plus } from 'lucide-react';
import { isAxiosError } from 'axios';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/data-table';
import { queryKeys } from '@/lib/queryKeys';
import { accountsApi } from './api';
import { getAccountColumns } from './accounts-columns';
import { AddAccountDialog } from './AddAccountDialog';

const columns = getAccountColumns();

export function AccountsTab() {
  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts.all(),
    queryFn: accountsApi.getPreGenerated,
  });

  const [addOpen, setAddOpen] = useState(false);

  const isForbidden = isAxiosError(accountsQuery.error) && accountsQuery.error.response?.status === 403;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Pre-generated demo accounts and manually created seller logins.</p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 size-4" /> Add Account
        </Button>
      </div>

      {accountsQuery.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {accountsQuery.isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{isForbidden ? 'Permission denied' : 'Failed to load accounts'}</AlertTitle>
          <AlertDescription>
            {isForbidden
              ? "Your account doesn't have permission to view this. Log in as an admin and try again."
              : 'Something went wrong reaching the server.'}
            <Button variant="link" className="h-auto p-0 pl-2" onClick={() => accountsQuery.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {accountsQuery.isSuccess && (
        <DataTable columns={columns} data={accountsQuery.data} emptyMessage="No accounts yet." />
      )}

      <AddAccountDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
