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

interface RejectListingDialogProps {
  property: Property | null;
  onOpenChange: (open: boolean) => void;
}

export function RejectListingDialog({ property, onOpenChange }: RejectListingDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (property) setReason('');
  }, [property]);

  const mutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => pendingListingsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingListings.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() });
      toast.success('Listing rejected');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to reject listing', {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  const trimmedReason = reason.trim();

  return (
    <Dialog open={Boolean(property)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject "{property?.title || 'this listing'}"?</DialogTitle>
          <DialogDescription>A reason is required and is sent to the property owner.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection…"
          rows={3}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending || !trimmedReason}
            onClick={() => property && mutation.mutate({ id: property.id, reason: trimmedReason })}
          >
            {mutation.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
