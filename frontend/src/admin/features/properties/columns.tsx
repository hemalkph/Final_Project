import type { ColumnDef } from '@tanstack/react-table';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Property, PropertyStatus } from '@/types/property';

const STATUS_VARIANT: Record<PropertyStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  AVAILABLE: 'default',
  PENDING: 'secondary',
  SOLD: 'outline',
  RENTED: 'secondary',
  REJECTED: 'destructive',
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(
    price,
  );
}

interface GetColumnsArgs {
  onView: (property: Property) => void;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
}

export function getPropertyColumns({ onView, onEdit, onDelete }: GetColumnsArgs): ColumnDef<Property>[] {
  return [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <span className="font-medium">{row.original.title || 'Untitled'}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.type}</div>
          {row.original.houseType && (
            <div className="text-xs text-muted-foreground">{row.original.houseType}</div>
          )}
        </div>
      ),
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
      id: 'bedsBaths',
      header: 'Beds/Baths',
      enableSorting: false,
      cell: ({ row }) => `${row.original.bedrooms ?? '—'} / ${row.original.bathrooms ?? '—'}`,
    },
    {
      id: 'assignedAgent',
      header: 'Agent',
      enableSorting: false,
      cell: ({ row }) => row.original.assignedAgent?.name ?? 'Unassigned',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge>
      ),
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
            <DropdownMenuItem onSelect={() => onEdit(row.original)}>
              <Pencil className="mr-2 size-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(row.original)}
            >
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
