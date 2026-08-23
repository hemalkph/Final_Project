import type { ColumnDef } from '@tanstack/react-table';
import { Check, Eye, ExternalLink, MoreHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Thumbnail } from '@/components/thumbnail';
import type { Property } from '@/types/property';

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(
    price,
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface GetColumnsArgs {
  onView: (property: Property) => void;
  onApprove: (property: Property) => void;
  onReject: (property: Property) => void;
}

export function getPendingListingColumns({ onView, onApprove, onReject }: GetColumnsArgs): ColumnDef<Property>[] {
  return [
    {
      id: 'thumbnail',
      header: '',
      enableSorting: false,
      cell: ({ row }) => <Thumbnail src={row.original.imageUrl} />,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <span className="font-medium">{row.original.title || 'Untitled'}</span>,
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => formatPrice(row.original.price),
    },
    {
      accessorKey: 'address',
      header: 'Location',
      cell: ({ row }) => row.original.address || '—',
    },
    {
      id: 'owner',
      header: 'Owner',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.ownerName || '—'}</div>
          <div className="text-xs text-muted-foreground">{row.original.ownerEmail || ''}</div>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Submitted',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'driveLink',
      header: '',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.driveLink ? (
          <a
            href={row.original.driveLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
            title="Open submitted drive resource"
          >
            <ExternalLink className="size-4" />
          </a>
        ) : null,
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
            <DropdownMenuItem onSelect={() => onView(row.original)}>
              <Eye className="mr-2 size-4" /> View
            </DropdownMenuItem>
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
