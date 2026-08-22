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
import type { Agent } from '@/types/agent';
import { agentsApi } from './api';

interface DeleteAgentAlertProps {
  agent: Agent | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAgentAlert({ agent, onOpenChange }: DeleteAgentAlertProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: number) => agentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all() });
      toast.success('Agent deleted');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to delete agent', {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  return (
    <AlertDialog open={Boolean(agent)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{agent?.name || 'this agent'}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the agent profile and cannot be undone. It does not affect any linked
            login account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={() => agent && mutation.mutate(agent.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
