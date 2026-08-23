import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, UserCog, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TableSkeleton } from '@/components/table-skeleton';
import { ErrorState } from '@/components/error-state';
import { queryKeys } from '@/lib/queryKeys';
import type { Inquiry, InquiryStatus } from '@/types/inquiry';
import { inquiriesApi } from './api';
import { ReassignDialog } from './ReassignDialog';
import { CloseInquiryAlert } from './CloseInquiryAlert';

const STATUS_VARIANT: Record<InquiryStatus, 'default' | 'secondary' | 'outline'> = {
  PENDING: 'secondary',
  REPLIED: 'default',
  CLOSED: 'outline',
};

function initials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface ConversationThreadProps {
  inquiry: Inquiry;
}

export function ConversationThread({ inquiry }: ConversationThreadProps) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState('');
  const [reassignOpen, setReassignOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useQuery({
    queryKey: queryKeys.inquiries.messages(inquiry.id),
    queryFn: () => inquiriesApi.getMessages(inquiry.id),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messagesQuery.data]);

  const replyMutation = useMutation({
    mutationFn: (text: string) => inquiriesApi.reply(inquiry.id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inquiries.messages(inquiry.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inquiries.all() });
      setReply('');
    },
  });

  const trimmedReply = reply.trim();
  const isClosed = inquiry.status === 'CLOSED';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border border-border">
            <AvatarFallback>{initials(inquiry.userName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{inquiry.userName || 'Unknown user'}</p>
            <p className="text-sm text-muted-foreground">{inquiry.propertyTitle || 'Untitled property'}</p>
          </div>
          <Badge variant={STATUS_VARIANT[inquiry.status]}>{inquiry.status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={isClosed} onClick={() => setReassignOpen(true)}>
            <UserCog className="mr-1.5 size-4" /> Reassign
          </Button>
          <Button variant="outline" size="sm" disabled={isClosed} onClick={() => setCloseOpen(true)}>
            <X className="mr-1.5 size-4" /> Close
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messagesQuery.isLoading && <TableSkeleton rows={4} />}

        {messagesQuery.isError && (
          <ErrorState error={messagesQuery.error} onRetry={() => messagesQuery.refetch()} resourceName="messages" />
        )}

        {messagesQuery.isSuccess &&
          messagesQuery.data.map((message) => {
            const fromUser = message.senderRole === 'USER';
            return (
              <div key={message.id} className={`flex ${fromUser ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                    fromUser ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'
                  }`}
                >
                  <p>{message.text}</p>
                  <p className={`mt-1 text-[11px] ${fromUser ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
                    {message.senderName || message.senderRole} · {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
      </div>

      <div className="border-t border-border p-4">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmedReply && !isClosed) replyMutation.mutate(trimmedReply);
          }}
        >
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={isClosed ? 'This inquiry is closed.' : 'Type a reply…'}
            disabled={isClosed || replyMutation.isPending}
            rows={2}
            className="flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (trimmedReply && !isClosed) replyMutation.mutate(trimmedReply);
              }
            }}
          />
          <Button type="submit" disabled={!trimmedReply || isClosed || replyMutation.isPending}>
            <Send className="size-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>

      <ReassignDialog inquiry={reassignOpen ? inquiry : null} onOpenChange={(open) => !open && setReassignOpen(false)} />

      <CloseInquiryAlert inquiry={closeOpen ? inquiry : null} onOpenChange={(open) => !open && setCloseOpen(false)} />
    </div>
  );
}
