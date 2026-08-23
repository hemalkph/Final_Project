import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-table';
import { TableSkeleton } from '@/components/table-skeleton';
import { ErrorState } from '@/components/error-state';
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Pre-generated demo accounts and manually created seller logins.</p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 size-4" /> Add Account
        </Button>
      </div>

      {accountsQuery.isLoading && <TableSkeleton rows={3} />}

      {accountsQuery.isError && (
        <ErrorState error={accountsQuery.error} onRetry={() => accountsQuery.refetch()} resourceName="accounts" />
      )}

      {accountsQuery.isSuccess && (
        <DataTable columns={columns} data={accountsQuery.data} emptyMessage="No accounts yet." />
      )}

      <AddAccountDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
