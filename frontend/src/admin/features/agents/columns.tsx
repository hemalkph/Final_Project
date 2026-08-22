import type { ColumnDef } from '@tanstack/react-table';
import { Eye, MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Agent, AgentStatus } from '@/types/agent';

const STATUS_VARIANT: Record<AgentStatus, 'default' | 'secondary'> = {
  ACTIVE: 'default',
  INACTIVE: 'secondary',
};

interface GetColumnsArgs {
  onView: (agent: Agent) => void;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
}

export function getAgentColumns({ onView, onEdit, onDelete }: GetColumnsArgs): ColumnDef<Agent>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Agent',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="size-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
            {row.original.profileImageUrl && (
              <img src={row.original.profileImageUrl} alt="" className="size-full object-cover" />
            )}
          </div>
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.email || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => row.original.title || '—',
    },
    {
      accessorKey: 'specialization',
      header: 'Specialization',
      cell: ({ row }) => row.original.specialization || '—',
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => row.original.location || '—',
    },
    {
      id: 'experienceSold',
      header: 'Exp/Sold',
      enableSorting: false,
      cell: ({ row }) => `${row.original.experience ?? '—'} yrs / ${row.original.propertiesSold} sold`,
    },
    {
      accessorKey: 'rating',
      header: 'Rating',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Star className="size-3.5 fill-current text-primary" />
          {row.original.rating.toFixed(1)}
        </div>
      ),
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
