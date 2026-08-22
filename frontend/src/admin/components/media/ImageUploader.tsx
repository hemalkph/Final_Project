import { ImagePlus, Upload } from 'lucide-react';
import * as React from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { uploadFile, UploadError } from '@/lib/storage/upload';
import { cn } from '@/lib/utils';

import { ImagePreview } from './ImagePreview';
import { DEFAULT_MAX_SIZE_MB, FILE_INPUT_ACCEPT, validateFile } from './validation';

export interface ImageUploaderProps {
  /**
   * Logical storage namespace — 'properties', 'agents', 'logos', ...
   * Validated server-side against a fixed allow-list.
   */
  folder: string;
  /** Committed public URLs. This component is fully controlled. */
  value: string[];
  onChange: (urls: string[]) => void;
  /** Total images allowed. `1` turns this into a single-slot picker. */
  maxFiles?: number;
  maxSizeMb?: number;
  disabled?: boolean;
  className?: string;
}

/** An upload that hasn't been committed to `value` yet. */
interface PendingItem {
  id: string;
  file: File;
  objectUrl: string;
  status: 'uploading' | 'error';
  progress: number;
  error?: string;
  controller: AbortController;
}

let idCounter = 0;
const nextId = () => `upload-${++idCounter}`;

/**
 * Reusable image uploader.
 *
 * Deliberately knows nothing about what it is uploading images *for* — its
 * entire contract is `File[] in → string[] of public URLs out`. Callers
 * decide what those URLs mean and where they get stored, which is what lets
 * the same component serve properties, agent avatars, logos and banners.
 */
export function ImageUploader({
  folder,
  value,
  onChange,
  maxFiles,
  maxSizeMb = DEFAULT_MAX_SIZE_MB,
  disabled = false,
  className,
}: ImageUploaderProps) {
  const [pending, setPending] = React.useState<PendingItem[]>([]);
  const [rejections, setRejections] = React.useState<string[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragDepth = React.useRef(0);

  // Async upload callbacks resolve long after the render that started them,
  // so read `value`/`onChange` through refs rather than capturing them —
  // otherwise two uploads finishing together would each append to the same
  // stale array and the first URL would be lost.
  const valueRef = React.useRef(value);
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  // Abort in-flight requests and release object URLs if we unmount mid-upload.
  const pendingRef = React.useRef<PendingItem[]>([]);
  React.useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  React.useEffect(
    () => () => {
      pendingRef.current.forEach((item) => {
        item.controller.abort();
        URL.revokeObjectURL(item.objectUrl);
      });
    },
    [],
  );

  const isSingle = maxFiles === 1;
  const usedSlots = value.length + pending.length;
  const remainingSlots = maxFiles === undefined ? Infinity : Math.max(0, maxFiles - usedSlots);
  const isFull = remainingSlots === 0 && !isSingle;

  const startUpload = React.useCallback(
    (item: PendingItem) => {
      uploadFile(item.file, folder, {
        signal: item.controller.signal,
        onProgress: (percent) =>
          setPending((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, progress: percent } : p)),
          ),
      })
        .then((publicUrl) => {
          URL.revokeObjectURL(item.objectUrl);
          setPending((prev) => prev.filter((p) => p.id !== item.id));
          onChangeRef.current([...valueRef.current, publicUrl]);
        })
        .catch((error: unknown) => {
          // A cancelled upload was removed by the user — its tile is already
          // gone, so there is nothing to mark as failed.
          if (error instanceof UploadError && error.cancelled) return;

          const message = error instanceof Error ? error.message : 'Upload failed.';
          setPending((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error: message } : p)),
          );
        });
    },
    [folder],
  );

  const addFiles = React.useCallback(
    (fileList: FileList | null) => {
      if (!fileList || disabled) return;

      const incoming = Array.from(fileList);
      const nextRejections: string[] = [];
      const accepted: File[] = [];

      for (const file of incoming) {
        const result = validateFile(file, maxSizeMb);
        if (result.ok) {
          accepted.push(file);
        } else {
          nextRejections.push(`${file.name}: ${result.reason}`);
        }
      }

      // A single-slot picker replaces rather than refuses — that's the
      // expected behaviour for an "avatar"/"main image" style control.
      if (isSingle) {
        const [file] = accepted;
        if (file) {
          pending.forEach((p) => {
            p.controller.abort();
            URL.revokeObjectURL(p.objectUrl);
          });
          const item: PendingItem = {
            id: nextId(),
            file,
            objectUrl: URL.createObjectURL(file),
            status: 'uploading',
            progress: 0,
            controller: new AbortController(),
          };
          setPending([item]);
          onChangeRef.current([]);
          startUpload(item);
        }
        if (accepted.length > 1) {
          nextRejections.push(`Only one image allowed — kept ${accepted[0]?.name}.`);
        }
        setRejections(nextRejections);
        return;
      }

      const admitted = accepted.slice(0, remainingSlots);
      if (accepted.length > admitted.length) {
        nextRejections.push(
          `Limit is ${maxFiles} image${maxFiles === 1 ? '' : 's'} — ${
            accepted.length - admitted.length
          } skipped.`,
        );
      }

      const items: PendingItem[] = admitted.map((file) => ({
        id: nextId(),
        file,
        objectUrl: URL.createObjectURL(file),
        status: 'uploading',
        progress: 0,
        controller: new AbortController(),
      }));

      if (items.length > 0) setPending((prev) => [...prev, ...items]);
      setRejections(nextRejections);
      items.forEach(startUpload);
    },
    [disabled, isSingle, maxFiles, maxSizeMb, pending, remainingSlots, startUpload],
  );

  const removePending = (id: string) => {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) {
        item.controller.abort();
        URL.revokeObjectURL(item.objectUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const retryPending = (id: string) => {
    const existing = pending.find((p) => p.id === id);
    if (!existing) return;

    // A used AbortController stays aborted, so a retry needs a fresh one.
    const retried: PendingItem = {
      ...existing,
      status: 'uploading',
      progress: 0,
      error: undefined,
      controller: new AbortController(),
    };
    setPending((prev) => prev.map((p) => (p.id === id ? retried : p)));
    startUpload(retried);
  };

  const removeCommitted = (url: string) => {
    onChangeRef.current(valueRef.current.filter((u) => u !== url));
  };

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragDepth.current += 1;
          if (!disabled) setIsDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          // Dragging over a child fires dragleave on the parent; count
          // enter/leave pairs so the highlight doesn't flicker.
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) setIsDragging(false);
        }}
        onDrop={onDrop}
        onClick={openPicker}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors',
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-primary/50 hover:bg-accent/40',
          isDragging && !disabled && 'border-primary bg-accent/60',
          isFull && 'pointer-events-none opacity-60',
        )}
      >
        <ImagePlus className="size-5 text-muted-foreground" aria-hidden />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {isDragging ? 'Drop to upload' : 'Drag & drop images here'}
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG or WEBP · up to {maxSizeMb} MB
            {maxFiles !== undefined && ` · ${usedSlots}/${maxFiles} used`}
          </p>
        </div>

        {/* The real keyboard-accessible affordance; the surrounding
            click-to-open is a mouse convenience layered on top. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isFull}
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          className="mt-1 gap-1.5"
        >
          <Upload className="size-3.5" aria-hidden />
          Browse files
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept={FILE_INPUT_ACCEPT}
          multiple={!isSingle}
          hidden
          disabled={disabled}
          onChange={(e) => {
            addFiles(e.target.files);
            // Reset so picking the same file twice still fires onChange.
            e.target.value = '';
          }}
        />
      </div>

      {rejections.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="space-y-0.5 text-xs">
            {rejections.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {(value.length > 0 || pending.length > 0) && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((url) => (
            <ImagePreview
              key={url}
              src={url}
              status="done"
              label={url.split('/').pop()}
              onRemove={() => removeCommitted(url)}
            />
          ))}

          {pending.map((item) => (
            <ImagePreview
              key={item.id}
              src={item.objectUrl}
              status={item.status}
              progress={item.progress}
              error={item.error}
              label={item.file.name}
              onRemove={() => removePending(item.id)}
              onRetry={item.status === 'error' ? () => retryPending(item.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
