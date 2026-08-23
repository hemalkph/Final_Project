import { AlertCircle } from 'lucide-react';
import { isAxiosError } from 'axios';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  error: unknown;
  onRetry: () => void;
  /** e.g. "properties", "agents" — used in "Failed to load {resourceName}" */
  resourceName: string;
}

/**
 * Shared error block for every table-driven page — replaces the identical
 * Alert + 403-branch + Retry markup that was copy-pasted per module.
 */
export function ErrorState({ error, onRetry, resourceName }: ErrorStateProps) {
  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>{isForbidden ? 'Permission denied' : `Failed to load ${resourceName}`}</AlertTitle>
      <AlertDescription>
        {isForbidden
          ? "Your account doesn't have permission to view this. Log in as an admin and try again."
          : 'Something went wrong reaching the server.'}
        <Button variant="link" className="h-auto p-0 pl-2" onClick={onRetry}>
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
