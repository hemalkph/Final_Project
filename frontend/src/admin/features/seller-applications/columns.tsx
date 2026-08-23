import type { ColumnDef } from '@tanstack/react-table';
import { Check, MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SellerApplication } from '@/types/seller';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface GetColumnsArgs {
  onApprove: (application: SellerApplication) => void;
  onReject: (application: SellerApplication) => void;
}

export function getApplicationColumns({ onApprove, onReject }: GetColumnsArgs): ColumnDef<SellerApplication>[] {
  return [
    {
      id: 'applicant',
      header: 'Applicant',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.fullName || 'Unnamed'}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || '—',
    },
    {
      id: 'location',
      header: 'Location',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.cityOrDistrict || '—'}</div>
          <div className="text-xs text-muted-foreground">{row.original.address || ''}</div>
        </div>
      ),
    },
    {
      accessorKey: 'nicOrCompanyRegNo',
      header: 'NIC / Reg No',
      cell: ({ row }) => row.original.nicOrCompanyRegNo || '—',
    },
    {
      accessorKey: 'createdAt',
      header: 'Submitted',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onApprove(row.original)}>
              <Check className="mr-2 size-4" /> Approve
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onReject(row.original)}
            >
              <X className="mr-2 size-4" /> Reject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
