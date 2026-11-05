export interface UploadProgress {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface UploadOptions {
  url: string;
  file: File;
  headers: Record<string, string>;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

/**
 * Direct browser-to-bucket upload with real progress (architecture section 6.5).
 *
 * `XMLHttpRequest` is required here: `fetch` cannot report upload progress, and
 * the browser must PUT straight to the bucket so image bytes never transit the
 * API.
 */
export function uploadFile(options: UploadOptions): Promise<void> {
  const { url, file, headers, onProgress, signal } = options;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);

    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.({
        loadedBytes: event.loaded,
        totalBytes: event.total,
        percent: Math.round((event.loaded / event.total) * 100),
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({ loadedBytes: file.size, totalBytes: file.size, percent: 100 });
        resolve();
        return;
      }
      reject(new UploadError(`Upload failed (${xhr.status})`, xhr.status));
    };

    xhr.onerror = () => reject(new UploadError("Upload failed due to a network error.", 0));
    xhr.onabort = () => reject(new UploadError("Upload cancelled.", 0, true));
    xhr.ontimeout = () => reject(new UploadError("Upload timed out.", 0));

    signal?.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(file);
  });
}

export class UploadError extends Error {
  readonly status: number;
  readonly cancelled: boolean;

  constructor(message: string, status: number, cancelled = false) {
    super(message);
    this.name = "UploadError";
    this.status = status;
    this.cancelled = cancelled;
  }
}
