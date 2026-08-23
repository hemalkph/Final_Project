import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import type { Inquiry } from '@/types/inquiry';
import { inquiriesApi } from './api';

interface CloseInquiryAlertProps {
  inquiry: Inquiry | null;
  onOpenChange: (open: boolean) => void;
}

export function CloseInquiryAlert({ inquiry, onOpenChange }: CloseInquiryAlertProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: number) => inquiriesApi.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inquiries.all() });
      onOpenChange(false);
    },
  });

  return (
    <AlertDialog open={Boolean(inquiry)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close this inquiry?</AlertDialogTitle>
          <AlertDialogDescription>
            Marks it resolved. The conversation stays visible but no further replies can be sent.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={mutation.isPending} onClick={() => inquiry && mutation.mutate(inquiry.id)}>
            {mutation.isPending ? 'Closing…' : 'Close inquiry'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
