import { AlertCircle, RotateCw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { UploadProgress } from './UploadProgress';

export type UploadStatus = 'uploading' | 'done' | 'error';

interface ImagePreviewProps {
  /** Object URL for a local file, or the public URL once uploaded. */
  src: string;
  status: UploadStatus;
  /** 0-100. Only read while status is 'uploading'. */
  progress?: number;
  /** Shown when status is 'error'. */
  error?: string;
  /** Used for the alt text / tooltip. */
  label?: string;
  onRemove: () => void;
  /** Omitted for items that cannot be retried (i.e. already uploaded). */
  onRetry?: () => void;
}

/**
 * One thumbnail tile. Purely presentational — it knows nothing about what
 * the image depicts or which record it will end up attached to.
 */
export function ImagePreview({
  src,
  status,
  progress = 0,
  error,
  label,
  onRemove,
  onRetry,
}: ImagePreviewProps) {
  const isError = status === 'error';

  return (
    <div
      className={cn(
        'group relative aspect-square overflow-hidden rounded-md border bg-muted',
        isError && 'border-destructive',
      )}
    >
      <img
        src={src}
        alt={label ?? 'Uploaded image'}
        className={cn(
          'h-full w-full object-cover transition-opacity',
          status !== 'done' && 'opacity-50',
        )}
        // A broken/expired remote URL shouldn't leave a broken-image icon.
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden';
        }}
      />

      {status === 'uploading' && (
        <div className="absolute inset-0 flex items-end bg-black/50 p-2">
          <UploadProgress value={progress} />
        </div>
      )}

      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-destructive/15 p-2 text-center">
          <AlertCircle className="size-4 text-destructive" aria-hidden />
          <p className="line-clamp-3 text-[10px] leading-tight text-destructive">{error}</p>
          {onRetry && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-6 gap-1 px-2 text-[10px]"
              onClick={onRetry}
            >
              <RotateCw className="size-3" aria-hidden />
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Always reachable: removing is how you cancel an in-flight upload
          and how you discard a failed one, not just how you delete a
          finished image. Visible on hover/focus so the grid stays clean. */}
      <Button
        type="button"
        size="icon"
        variant="destructive"
        aria-label={label ? `Remove ${label}` : 'Remove image'}
        onClick={onRemove}
        className={cn(
          'absolute right-1 top-1 size-6 opacity-0 shadow transition-opacity',
          'group-hover:opacity-100 focus-visible:opacity-100',
          isError && 'opacity-100',
        )}
      >
        <X className="size-3" aria-hidden />
      </Button>
    </div>
  );
}
