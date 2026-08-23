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
import type { SellerApplication } from '@/types/seller';
import { sellerApplicationsApi } from './api';

interface RejectApplicationDialogProps {
  application: SellerApplication | null;
  onOpenChange: (open: boolean) => void;
}

export function RejectApplicationDialog({ application, onOpenChange }: RejectApplicationDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (application) setReason('');
  }, [application]);

  const mutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => sellerApplicationsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sellerApplications.all() });
      toast.success('Application rejected');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to reject application', {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  const trimmedReason = reason.trim();

  return (
    <Dialog open={Boolean(application)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject "{application?.fullName || 'this applicant'}"?</DialogTitle>
          <DialogDescription>A reason is required.</DialogDescription>
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
            onClick={() => application && mutation.mutate({ id: application.id, reason: trimmedReason })}
          >
            {mutation.isPending ? 'Rejecting…' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
