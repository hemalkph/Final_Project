import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/layout/page-header';
import { FilterBar } from '@/components/filter-bar';
import { TableSkeleton } from '@/components/table-skeleton';
import { ErrorState } from '@/components/error-state';
import { queryKeys } from '@/lib/queryKeys';
import { ROLES, type UserRole } from '@/types/user';
import { usersApi } from './api';
import { getUserColumns } from './columns';

const ALL_VALUE = 'all';

const columns = getUserColumns();

export function UsersPage() {
  const usersQuery = useQuery({
    queryKey: queryKeys.users.all(),
    queryFn: usersApi.getAll,
  });

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | typeof ALL_VALUE>(ALL_VALUE);

  const hasActiveFilters = search.trim() !== '' || roleFilter !== ALL_VALUE;

  const filtered = useMemo(() => {
    const data = usersQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return data.filter((u) => {
      if (roleFilter !== ALL_VALUE && u.role !== roleFilter) return false;
      if (!q) return true;
      return [u.name, u.email].filter(Boolean).some((field) => field!.toLowerCase().includes(q));
    });
  }, [usersQuery.data, search, roleFilter]);

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="All registered accounts across every role. Read-only for now." />

      <FilterBar>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | typeof ALL_VALUE)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Roles</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {usersQuery.isLoading && <TableSkeleton />}

      {usersQuery.isError && (
        <ErrorState error={usersQuery.error} onRetry={() => usersQuery.refetch()} resourceName="users" />
      )}

      {usersQuery.isSuccess && (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage={hasActiveFilters ? 'No users match these filters.' : 'No users yet.'}
        />
      )}
    </div>
  );
}
