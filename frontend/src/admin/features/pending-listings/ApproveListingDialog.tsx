import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/lib/queryKeys';
import type { Property } from '@/types/property';
import { pendingListingsApi } from './api';

const DEFAULT_MESSAGE = 'Your listing has been approved by admin.';

interface ApproveListingDialogProps {
  property: Property | null;
  onOpenChange: (open: boolean) => void;
}

export function ApproveListingDialog({ property, onOpenChange }: ApproveListingDialogProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  useEffect(() => {
    if (property) setMessage(DEFAULT_MESSAGE);
  }, [property]);

  const mutation = useMutation({
    mutationFn: (id: number) => pendingListingsApi.approve(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingListings.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() });
      toast.success('Listing approved');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to approve listing', {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  return (
    <Dialog open={Boolean(property)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve "{property?.title || 'this listing'}"?</DialogTitle>
          <DialogDescription>This message is sent to the property owner.</DialogDescription>
        </DialogHeader>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => property && mutation.mutate(property.id)}
          >
            {mutation.isPending ? 'Approving…' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
