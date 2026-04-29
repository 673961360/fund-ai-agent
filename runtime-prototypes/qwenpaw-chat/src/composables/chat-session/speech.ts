// Web Speech API 兼容类型（浏览器可能使用 webkit 前缀）
type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onresult:
    | ((event: {
        results: { isFinal: boolean; [index: number]: { transcript: string } }[];
        resultIndex: number;
      }) => void)
    | null;
  start(): void;
  stop(): void;
  abort(): void;
};

interface SpeechRecognitionCallbacks {
  onStart: () => void;
  onEnd: () => void;
  onError: (errorMessage: string) => void;
  onResult: (transcript: string, isFinal: boolean) => void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    (window as unknown as Record<string, unknown>).SpeechRecognition ??
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  ) as (new () => SpeechRecognitionInstance) | null;
}

export function detectSpeechRecognitionSupport(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function createSpeechRecognition(
  callbacks: SpeechRecognitionCallbacks,
): SpeechRecognitionInstance | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    return null;
  }

  const recognition = new Ctor();
  recognition.lang = 'zh-CN';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    callbacks.onStart();
  };

  recognition.onend = () => {
    callbacks.onEnd();
  };

  recognition.onerror = (event) => {
    callbacks.onError(event.error || event.message || '语音识别出错');
  };

  recognition.onresult = (event) => {
    const resultIndex = event.resultIndex;
    for (let i = resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      callbacks.onResult(result[0].transcript, result.isFinal);
    }
  };

  return recognition;
}
