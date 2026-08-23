import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/layout/page-header';
import { TableSkeleton } from '@/components/table-skeleton';
import { ErrorState } from '@/components/error-state';
import { EmptyState } from '@/components/empty-state';
import { queryKeys } from '@/lib/queryKeys';
import { INQUIRY_STATUSES, type Inquiry, type InquiryStatus } from '@/types/inquiry';
import { inquiriesApi } from './api';
import { useInquirySocket } from './useInquirySocket';
import { ConversationThread } from './ConversationThread';

const ALL_VALUE = 'all';

const STATUS_DOT: Record<InquiryStatus, string> = {
  PENDING: 'bg-amber-500',
  REPLIED: 'bg-primary',
  CLOSED: 'bg-muted-foreground',
};

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function MessagesPage() {
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | typeof ALL_VALUE>(ALL_VALUE);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const status = statusFilter === ALL_VALUE ? undefined : statusFilter;
  const inquiriesQuery = useQuery({
    queryKey: queryKeys.inquiries.list(status),
    queryFn: () => inquiriesApi.getAll(status),
  });

  useInquirySocket(selectedId);

  const selected: Inquiry | undefined = inquiriesQuery.data?.find((i) => i.id === selectedId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Live customer inquiries across all property listings."
        actions={
          inquiriesQuery.isSuccess ? (
            <Badge variant="secondary">{inquiriesQuery.data.length} total</Badge>
          ) : undefined
        }
      />

      <div className="flex h-[calc(100vh-14rem)] gap-4 overflow-hidden rounded-lg border border-border">
        <div className="flex w-80 shrink-0 flex-col border-r border-border">
          <div className="border-b border-border p-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InquiryStatus | typeof ALL_VALUE)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
                {INQUIRY_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {inquiriesQuery.isLoading && (
              <div className="p-3">
                <TableSkeleton rows={5} />
              </div>
            )}

            {inquiriesQuery.isError && (
              <div className="p-3">
                <ErrorState error={inquiriesQuery.error} onRetry={() => inquiriesQuery.refetch()} resourceName="inquiries" />
              </div>
            )}

            {inquiriesQuery.isSuccess && inquiriesQuery.data.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">No inquiries yet.</p>
            )}

            {inquiriesQuery.isSuccess &&
              inquiriesQuery.data.map((inquiry) => (
                <button
                  key={inquiry.id}
                  type="button"
                  onClick={() => setSelectedId(inquiry.id)}
                  className={`flex w-full flex-col gap-1 border-b border-border p-3 text-left transition-colors hover:bg-accent/50 ${
                    selectedId === inquiry.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-foreground">{inquiry.userName || 'Unknown user'}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(inquiry.lastMessageAt ?? inquiry.createdAt)}</span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{inquiry.propertyTitle || 'Untitled property'}</p>
                  <div className="flex items-center gap-2">
                    {inquiry.hasUnread && <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[inquiry.status]}`} />}
                    <p className={`truncate text-xs ${inquiry.hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                      {inquiry.lastMessagePreview || 'No messages yet'}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {selected ? (
            <ConversationThread inquiry={selected} />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="No conversation selected"
              description="Pick an inquiry from the list to view and reply."
              className="h-full min-h-0 border-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}
