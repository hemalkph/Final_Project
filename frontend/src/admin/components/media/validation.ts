/**
 * Client-side file validation for the media uploader.
 *
 * This is a UX convenience only — it gives instant feedback and avoids
 * wasting a round trip on a file the server would reject anyway. It is NOT
 * a security boundary: the real enforcement lives in the backend's
 * sign-upload endpoint and in the Supabase bucket's own
 * allowed_mime_types / file_size_limit. Keep the values below in sync with
 * both of those.
 */

/** Mirrors SupabaseStorageService.ALLOWED_CONTENT_TYPES and the bucket config. */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Mirrors the bucket's file_size_limit (5 MB). */
export const DEFAULT_MAX_SIZE_MB = 5;

/** For the <input accept="..."> hint. Not enforcement — a user can bypass it. */
export const FILE_INPUT_ACCEPT = ALLOWED_MIME_TYPES.join(',');

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Human-readable list for error copy, e.g. "JPG, PNG or WEBP". */
function allowedLabel(): string {
  const names = ALLOWED_MIME_TYPES.map((t) => t.replace('image/', '').toUpperCase()).map((n) =>
    n === 'JPEG' ? 'JPG' : n,
  );
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

export function validateFile(file: File, maxSizeMb: number = DEFAULT_MAX_SIZE_MB): ValidationResult {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    // file.type is '' for extensionless/unknown files — say something useful
    // rather than "expected one of ... received ''".
    const got = file.type || 'an unrecognised file type';
    return { ok: false, reason: `${allowedLabel()} only (got ${got}).` };
  }

  if (file.size > maxSizeMb * 1024 * 1024) {
    return { ok: false, reason: `Too large — ${formatBytes(file.size)}, max ${maxSizeMb} MB.` };
  }

  if (file.size === 0) {
    return { ok: false, reason: 'File is empty.' };
  }

  return { ok: true };
}
