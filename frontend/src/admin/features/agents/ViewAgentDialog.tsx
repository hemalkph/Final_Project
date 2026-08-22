import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Agent } from '@/types/agent';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface ViewAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
}

export function ViewAgentDialog({ open, onOpenChange, agent }: ViewAgentDialogProps) {
  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{agent.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
              {agent.profileImageUrl && (
                <img src={agent.profileImageUrl} alt="" className="size-full object-cover" />
              )}
            </div>
            <div>
              <p className="font-medium">{agent.title || 'Agent'}</p>
              <p className="text-sm text-muted-foreground">{agent.email}</p>
              {agent.phone && <p className="text-sm text-muted-foreground">{agent.phone}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={agent.status === 'ACTIVE' ? 'default' : 'secondary'}>{agent.status}</Badge>
            {agent.specialization && <Badge variant="outline">{agent.specialization}</Badge>}
            {agent.location && <Badge variant="outline">{agent.location}</Badge>}
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Experience</span>
              <p>{agent.experience !== null ? `${agent.experience} yrs` : '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Properties Sold</span>
              <p>{agent.propertiesSold}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Rating</span>
              <p className="flex items-center gap-1">
                <Star className="size-3.5 fill-current text-primary" />
                {agent.rating.toFixed(1)}
              </p>
            </div>
          </div>

          {(agent.degree || agent.qualifications) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {agent.degree && (
                <div>
                  <span className="text-muted-foreground">Degree</span>
                  <p>{agent.degree}</p>
                </div>
              )}
              {agent.qualifications && (
                <div>
                  <span className="text-muted-foreground">Qualifications</span>
                  <p>{agent.qualifications}</p>
                </div>
              )}
            </div>
          )}

          {agent.bio && (
            <div>
              <h4 className="mb-1 text-sm font-medium">Bio</h4>
              <p className="text-sm text-muted-foreground">{agent.bio}</p>
            </div>
          )}

          <p className="border-t border-border pt-4 text-xs text-muted-foreground">
            Profile created {formatDate(agent.createdAt)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
