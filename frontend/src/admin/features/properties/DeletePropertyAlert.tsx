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
import type { Property } from '@/types/property';
import { propertiesApi } from './api';

interface DeletePropertyAlertProps {
  property: Property | null;
  onOpenChange: (open: boolean) => void;
}

export function DeletePropertyAlert({ property, onOpenChange }: DeletePropertyAlertProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: number) => propertiesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() });
      toast.success('Property deleted');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to delete property', {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  return (
    <AlertDialog open={Boolean(property)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{property?.title || 'this property'}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the property and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={() => property && mutation.mutate(property.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
