import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UploadProgressProps {
  /** 0-100. */
  value: number;
  className?: string;
}

/**
 * Thin presentational wrapper over the shadcn Progress bar, used as the
 * overlay on a thumbnail while its file is uploading.
 */
export function UploadProgress({ value, className }: UploadProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      <Progress
        value={clamped}
        aria-label={`Upload ${clamped}% complete`}
        className="h-1.5 bg-white/25"
      />
      <span className="text-center text-[10px] font-medium tabular-nums text-white">
        {clamped}%
      </span>
    </div>
  );
}
