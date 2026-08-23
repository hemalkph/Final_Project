import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { queryKeys } from '@/lib/queryKeys';
import type { SellerApplication } from '@/types/seller';
import { sellerApplicationsApi } from './api';

interface ApproveApplicationAlertProps {
  application: SellerApplication | null;
  onOpenChange: (open: boolean) => void;
}

export function ApproveApplicationAlert({ application, onOpenChange }: ApproveApplicationAlertProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: number) => sellerApplicationsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sellerApplications.all() });
      toast.success('Seller approved');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to approve seller', {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  return (
    <AlertDialog open={Boolean(application)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve "{application?.fullName || 'this applicant'}"?</AlertDialogTitle>
          <AlertDialogDescription>They will receive an email to set their password.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={mutation.isPending} onClick={() => application && mutation.mutate(application.id)}>
            {mutation.isPending ? 'Approving…' : 'Approve'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
