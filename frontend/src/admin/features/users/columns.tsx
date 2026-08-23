import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AdminUser, UserRole } from '@/types/user';

const ROLE_VARIANT: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  ADMIN: 'default',
  AGENT: 'secondary',
  SELLER: 'secondary',
  USER: 'outline',
};

export function getUserColumns(): ColumnDef<AdminUser>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-medium">{row.original.name || 'Unnamed'}</span>,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email || '—',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => <Badge variant={ROLE_VARIANT[row.original.role]}>{row.original.role}</Badge>,
    },
    {
      accessorKey: 'enabled',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? 'default' : 'outline'}>
          {row.original.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button variant="ghost" size="icon" className="size-8" disabled>
                <Pencil className="size-4" />
                <span className="sr-only">Edit</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>No write endpoint exists yet — read-only for now</TooltipContent>
        </Tooltip>
      ),
    },
  ];
}
