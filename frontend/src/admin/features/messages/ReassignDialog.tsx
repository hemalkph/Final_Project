import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { queryKeys } from '@/lib/queryKeys';
import { agentsApi } from '@/features/agents/api';
import type { Inquiry } from '@/types/inquiry';
import { inquiriesApi } from './api';

interface ReassignDialogProps {
  inquiry: Inquiry | null;
  onOpenChange: (open: boolean) => void;
}

export function ReassignDialog({ inquiry, onOpenChange }: ReassignDialogProps) {
  const queryClient = useQueryClient();
  const [agentId, setAgentId] = useState<string>('');

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.publicList(),
    queryFn: agentsApi.getPublic,
    enabled: Boolean(inquiry),
  });

  const mutation = useMutation({
    mutationFn: (id: number) => inquiriesApi.reassign(inquiry!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inquiries.all() });
      onOpenChange(false);
      setAgentId('');
    },
  });

  return (
    <Dialog
      open={Boolean(inquiry)}
      onOpenChange={(open) => {
        if (!open) setAgentId('');
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign inquiry</DialogTitle>
          <DialogDescription>Choose an agent to hand "{inquiry?.propertyTitle || 'this inquiry'}" to.</DialogDescription>
        </DialogHeader>

        <Select value={agentId} onValueChange={setAgentId}>
          <SelectTrigger>
            <SelectValue placeholder="Select an agent" />
          </SelectTrigger>
          <SelectContent>
            {(agentsQuery.data ?? []).map((agent) => (
              <SelectItem key={agent.id} value={String(agent.id)}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!agentId || mutation.isPending}
            onClick={() => agentId && mutation.mutate(Number(agentId))}
          >
            {mutation.isPending ? 'Reassigning…' : 'Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
