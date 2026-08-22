import { apiClient } from '@/lib/apiClient';

/**
 * Two-step upload transport.
 *
 *   1. Ask OUR backend to mint a short-lived signed upload URL. The backend
 *      holds the Supabase service role key and generates the storage path —
 *      the browser never sees the key and never chooses a path/filename.
 *   2. PUT the raw bytes straight to that signed URL.
 *
 * Step 2 deliberately uses XMLHttpRequest rather than fetch(): fetch has no
 * upload-progress events, and per-file progress is a requirement here.
 *
 * Nothing in this module imports the Supabase SDK or any Supabase
 * credential — by design there is nothing to leak.
 */

export interface SignUploadResponse {
  signedUrl: string;
  path: string;
  publicUrl: string;
}

export interface UploadOptions {
  /** 0-100, fired as bytes go out. */
  onProgress?: (percent: number) => void;
  /** Abort an in-flight upload (user removed the file, or navigated away). */
  signal?: AbortSignal;
}

/** Thrown for anything the caller may want to show verbatim to the user. */
export class UploadError extends Error {
  readonly cancelled: boolean;

  constructor(message: string, cancelled = false) {
    super(message);
    this.name = 'UploadError';
    this.cancelled = cancelled;
  }
}

function messageFromAxios(error: unknown, fallback: string): string {
  const res = (error as { response?: { data?: { message?: string }; status?: number } })?.response;
  if (res?.data?.message) return res.data.message;
  if (res?.status === 403) return 'You do not have permission to upload files.';
  if (res?.status) return `${fallback} (HTTP ${res.status})`;
  return fallback;
}

/** Pull Supabase Storage's `{ message }` error body out of an XHR response. */
function messageFromStorage(xhr: XMLHttpRequest): string {
  try {
    const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
    if (body.message) return body.message;
    if (body.error) return body.error;
  } catch {
    // Non-JSON body — fall through to the status-based message.
  }
  if (xhr.status === 413) return 'File is too large for the storage bucket.';
  if (xhr.status === 415) return 'That file type is not allowed by the storage bucket.';
  return `Upload failed (HTTP ${xhr.status}).`;
}

function putToSignedUrl(
  signedUrl: string,
  file: File,
  { onProgress, signal }: UploadOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadError('Upload cancelled.', true));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl, true);

    // Only these two headers. Notably absent: our backend's Authorization
    // JWT — this request goes to Supabase, and the signed URL's own token
    // (already embedded in the query string) is the credential. Sending our
    // JWT to a third-party origin would leak it for no reason.
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('x-upsert', 'false');

    const onAbort = () => xhr.abort();
    signal?.addEventListener('abort', onAbort);

    const cleanup = () => signal?.removeEventListener('abort', onAbort);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new UploadError(messageFromStorage(xhr)));
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new UploadError('Network error while uploading. Check your connection.'));
    };

    xhr.onabort = () => {
      cleanup();
      reject(new UploadError('Upload cancelled.', true));
    };

    xhr.send(file);
  });
}

/**
 * Upload one file and resolve with its permanent public URL.
 *
 * `folder` is a logical bucket namespace ('properties', 'agents', ...). The
 * backend validates it against a fixed allow-list, so an unknown value
 * fails fast with a 400 rather than writing somewhere unexpected.
 */
export async function uploadFile(
  file: File,
  folder: string,
  options: UploadOptions = {},
): Promise<string> {
  let signed: SignUploadResponse;

  try {
    const { data } = await apiClient.post<SignUploadResponse>('/admin/media/sign-upload', {
      folder,
      contentType: file.type,
    });
    signed = data;
  } catch (error) {
    throw new UploadError(messageFromAxios(error, 'Could not start the upload.'));
  }

  await putToSignedUrl(signed.signedUrl, file, options);
  return signed.publicUrl;
}
