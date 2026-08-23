import { cn } from '@/lib/utils';

interface ThumbnailProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

/**
 * Square image thumbnail (property/listing rows) — the square counterpart
 * to the circular shadcn `Avatar` (used for people: agents, applicants).
 * Replaces three previously-inconsistent ad hoc rounded-md <div> treatments.
 */
export function Thumbnail({ src, alt = '', className }: ThumbnailProps) {
  return (
    <div className={cn('size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted', className)}>
      {src && <img src={src} alt={alt} className="size-full object-cover" />}
    </div>
  );
}
