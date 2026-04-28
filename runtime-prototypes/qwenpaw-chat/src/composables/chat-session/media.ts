import { uuid } from '@proto-shared/uuid';
import type {
  PendingUpload,
  QwenPawRequestContentBlock,
  QwenPawRequestMessage,
  RecordingState,
} from '@proto-shared/types';
import type { ComposerSnapshot } from './types';

export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

const RECORDING_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

export function createIdleRecordingState(): RecordingState {
  return {
    status: 'idle',
    errorMessage: '',
  };
}

export function createUnsupportedRecordingState(): RecordingState {
  return {
    status: 'unsupported',
    errorMessage: '当前浏览器不支持录音。',
  };
}

export function detectRecordingSupport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function resolveRecordingMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  for (const mimeType of RECORDING_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return '';
}

export function createPendingFileUpload(file: File): PendingUpload {
  return {
    id: uuid(),
    kind: file.type.startsWith('image/') ? 'image' : 'file',
    name: file.name,
    size: file.size,
    status: 'uploading',
    mimeType: file.type,
    sourceFile: file,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    errorMessage: '',
  };
}

export function revokePendingUpload(upload: PendingUpload): void {
  if (upload.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(upload.previewUrl);
  }
}

export function releaseComposerUploads(uploads: PendingUpload[]): void {
  for (const upload of uploads) {
    revokePendingUpload(upload);
  }
}

export function hasSendableComposerContent(snapshot: ComposerSnapshot): boolean {
  const hasText = snapshot.draft.trim().length > 0;
  const hasReadyUploads = snapshot.uploads.some((upload) => upload.status === 'ready');
  return hasText || hasReadyUploads;
}

export function buildRequestMessageFromComposer(
  snapshot: ComposerSnapshot,
): Pick<QwenPawRequestMessage, 'role' | 'content'> | null {
  const content: QwenPawRequestContentBlock[] = [];
  const text = snapshot.draft.trim();

  if (text) {
    content.push({
      type: 'text',
      text,
    });
  }

  for (const upload of snapshot.uploads) {
    if (upload.status !== 'ready') {
      continue;
    }

    if (upload.kind === 'image' && upload.remoteUrl) {
      content.push({
        type: 'image',
        image_url: upload.remoteUrl,
      });
      continue;
    }

    if (upload.kind === 'file' && upload.remoteUrl) {
      content.push({
        type: 'file',
        file_url: upload.remoteUrl,
        file_id: upload.fileId,
        filename: upload.name,
      });
      continue;
    }

    if (upload.kind === 'audio' && upload.data && upload.format) {
      content.push({
        type: 'audio',
        data: upload.data,
        format: upload.format,
      });
    }
  }

  if (content.length === 0) {
    return null;
  }

  return {
    role: 'user',
    content,
  };
}

export function buildAudioDataUrl(data: string, format: string): string {
  if (data.startsWith('data:')) {
    return data;
  }

  const normalizedFormat = format.trim() || 'webm';
  const mediaType = normalizedFormat.includes('/') ? normalizedFormat : `audio/${normalizedFormat}`;
  return `data:${mediaType};base64,${data}`;
}

export function buildGenericDataUrl(base64Data?: string): string {
  if (!base64Data) {
    return '';
  }

  if (base64Data.startsWith('data:')) {
    return base64Data;
  }

  return `data:application/octet-stream;base64,${base64Data}`;
}

export function extractBase64Payload(dataUrl: string): string {
  const separatorIndex = dataUrl.indexOf(',');
  if (separatorIndex === -1) {
    return dataUrl;
  }

  return dataUrl.slice(separatorIndex + 1);
}

export function guessAudioFormat(mimeType: string): string {
  if (mimeType.includes('ogg')) {
    return 'ogg';
  }

  if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
    return 'mp4';
  }

  if (mimeType.includes('wav')) {
    return 'wav';
  }

  return 'webm';
}

export function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Unable to read recorded audio.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read recorded audio.'));
    reader.readAsDataURL(blob);
  });
}
