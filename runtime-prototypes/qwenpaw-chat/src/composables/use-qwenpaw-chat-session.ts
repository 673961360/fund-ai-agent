import { computed, onBeforeUnmount, ref } from 'vue';
import {
  buildConversationSessionId,
  createChat,
  deleteChat,
  getChatHistory,
  getQwenPawClientConfig,
  getStoredActiveChatId,
  listChats,
  reconnectQwenPawChat,
  sendQwenPawChat,
  setStoredActiveChatId,
  stopQwenPawChat,
  uploadConsoleFile,
} from '@proto-shared/qwenpaw-client';
import type {
  ChatTextContentBlock,
  ChatHistory,
  ChatMessage,
  ChatMessageContentBlock,
  ChatMessageSection,
  ChatMessageSectionKind,
  ChatMessageStatus,
  ChatSpec,
  ChatState,
  PendingUpload,
  QwenPawAudioContentBlock,
  QwenPawFileContentBlock,
  QwenPawHistoryMessage,
  QwenPawImageContentBlock,
  QwenPawMessageContentBlock,
  QwenPawRequestContentBlock,
  QwenPawRequestMessage,
  QwenPawStreamEvent,
  QwenPawTextContentBlock as QwenPawTextHistoryContentBlock,
  QwenPawTextContentBlock,
  QwenPawToolPayload,
  RecordingState,
} from '@proto-shared/types';

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const THINKING_MESSAGE_TYPES = new Set(['reasoning']);
const TOOL_CALL_MESSAGE_TYPES = new Set(['plugin_call', 'function_call', 'mcp_tool_call']);
const TOOL_RESULT_MESSAGE_TYPES = new Set([
  'plugin_call_output',
  'function_call_output',
  'mcp_tool_call_output',
]);
const RECORDING_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

interface AgentWorkspaceOptions {
  token?: string | null;
  force?: boolean;
}

interface SendDraftOptions {
  agentId: string | null;
  token?: string | null;
}

interface StopStreamingOptions {
  agentId: string | null;
  token?: string | null;
}

interface OpenChatOptions {
  agentId: string | null;
  token?: string | null;
  force?: boolean;
}

interface DeleteChatOptions {
  agentId: string | null;
  token?: string | null;
}

interface AddFilesOptions {
  agentId: string | null;
  token?: string | null;
  files: File[];
}

interface RetryUploadOptions {
  agentId: string | null;
  token?: string | null;
  uploadId: string;
}

interface StreamOutcome {
  hasRenderableContent: boolean;
  terminalStatus: string | null;
  errorMessage: string | null;
  resetSessionAfterCompletion: boolean;
}

interface ComposerSnapshot {
  draft: string;
  uploads: PendingUpload[];
}

export function useQwenPawChatSession() {
  const state = ref<ChatState>(createInitialState());
  const draft = ref('');
  const activeAgentId = ref<string | null>(null);
  const isLoadingChats = ref(false);
  const isLoadingHistory = ref(false);
  const deletingChatId = ref<string | null>(null);
  const activeController = ref<AbortController | null>(null);
  const activeStreamChatId = ref<string | null>(null);
  const stopRequested = ref(false);
  const mediaRecorder = ref<MediaRecorder | null>(null);
  const recordingStream = ref<MediaStream | null>(null);
  const recordingChunks = ref<Blob[]>([]);
  const recordingMimeType = ref('');
  const localCompletionController = ref<AbortController | null>(null);
  const localCompletionTimer = ref<ReturnType<typeof setTimeout> | null>(null);
  const localCompletionRequested = ref(false);
  const uploadControllers = new Map<string, AbortController>();
  const cancelledUploadIds = new Set<string>();

  const hasMessages = computed(() => state.value.messages.length > 0);
  const hasPendingUploads = computed(() => state.value.pendingUploads.length > 0);
  const hasPendingUploadErrors = computed(() =>
    state.value.pendingUploads.some((upload) => upload.status === 'error'),
  );
  const hasPendingUploadsInFlight = computed(() =>
    state.value.pendingUploads.some((upload) => upload.status === 'uploading'),
  );
  const canRecord = computed(() => detectRecordingSupport());
  const canSubmit = computed(() => {
    if (state.value.isSending) {
      return false;
    }

    if (hasPendingUploadsInFlight.value || hasPendingUploadErrors.value) {
      return false;
    }

    return hasSendableComposerContent({
      draft: draft.value,
      uploads: state.value.pendingUploads,
    });
  });

  function clearLocalCompletionTimer(): void {
    if (localCompletionTimer.value) {
      clearTimeout(localCompletionTimer.value);
      localCompletionTimer.value = null;
    }
  }

  function resetLocalCompletionState(): void {
    clearLocalCompletionTimer();
    localCompletionRequested.value = false;
    localCompletionController.value = null;
  }

  function requestLocalCompletion(): void {
    if (localCompletionRequested.value) {
      return;
    }

    localCompletionRequested.value = true;
    clearLocalCompletionTimer();
    localCompletionController.value?.abort();
  }

  function scheduleLocalCompletion(assistantMessage: ChatMessage, streamOutcome: StreamOutcome): void {
    clearLocalCompletionTimer();

    if (
      streamOutcome.terminalStatus ||
      assistantMessage.status === 'error' ||
      !hasRenderableAnswerContent(assistantMessage)
    ) {
      return;
    }

    localCompletionTimer.value = setTimeout(() => {
      if (
        !state.value.isSending ||
        streamOutcome.terminalStatus ||
        assistantMessage.status === 'error' ||
        !hasRenderableAnswerContent(assistantMessage)
      ) {
        return;
      }

      requestLocalCompletion();
    }, 1000);
  }

  function cancelTrackedUpload(uploadId: string): void {
    const controller = uploadControllers.get(uploadId);
    if (!controller) {
      cancelledUploadIds.delete(uploadId);
      return;
    }

    cancelledUploadIds.add(uploadId);
    controller.abort();
    uploadControllers.delete(uploadId);
  }

  function hasPendingUpload(uploadId: string): boolean {
    return state.value.pendingUploads.some((upload) => upload.id === uploadId);
  }

  function getTrackedPendingUpload(uploadId: string): PendingUpload | null {
    return state.value.pendingUploads.find((upload) => upload.id === uploadId) ?? null;
  }

  function disposePendingUploads(uploads: PendingUpload[]): void {
    for (const upload of uploads) {
      cancelTrackedUpload(upload.id);
    }

    releaseComposerUploads(uploads);
  }

  async function setActiveAgent(agentId: string | null, options: AgentWorkspaceOptions = {}): Promise<void> {
    if (!options.force && activeAgentId.value === agentId) {
      return;
    }

    if (state.value.isSending) {
      return;
    }

    activeAgentId.value = agentId;
    state.value.errorMessage = null;

    if (!agentId) {
      resetWorkspace();
      return;
    }

    await loadChatWorkspace(agentId, options.token ?? null);
  }

  async function openChat(chatId: string, options: OpenChatOptions): Promise<void> {
    if (!options.agentId) {
      return;
    }

    if (state.value.isSending && state.value.activeChatId !== chatId) {
      return;
    }

    if (!options.force && state.value.activeChatId === chatId && state.value.messages.length > 0) {
      return;
    }

    await loadChatById(options.agentId, chatId, options.token ?? null, true);
  }

  function createNewConversation(): void {
    if (state.value.isSending) {
      return;
    }

    prepareBlankConversation(true);
  }

  async function deleteChatById(chatId: string, options: DeleteChatOptions): Promise<void> {
    if (!options.agentId) {
      return;
    }

    if (state.value.isSending && state.value.activeChatId === chatId) {
      return;
    }

    deletingChatId.value = chatId;
    state.value.errorMessage = null;

    try {
      await deleteChat(options.agentId, chatId, options.token);

      const remainingChats = sortChats(state.value.chatList.filter((chat) => chat.id !== chatId));
      state.value.chatList = remainingChats;

      if (state.value.activeChatId !== chatId) {
        return;
      }

      const nextChatId = remainingChats[0]?.id ?? null;
      if (nextChatId) {
        await loadChatById(options.agentId, nextChatId, options.token ?? null, true);
      } else {
        prepareBlankConversation(true);
      }
    } catch (error) {
      state.value.errorMessage = toErrorMessage(error);
    } finally {
      deletingChatId.value = null;
    }
  }

  async function addPendingFiles(options: AddFilesOptions): Promise<void> {
    if (!options.agentId) {
      state.value.errorMessage = '请先选择 Agent。';
      return;
    }

    if (state.value.isSending) {
      return;
    }

    for (const file of options.files) {
      const upload = createPendingFileUpload(file);
      state.value.pendingUploads.push(upload);
      const trackedUpload = getTrackedPendingUpload(upload.id) ?? upload;

      if (file.size > MAX_UPLOAD_SIZE) {
        trackedUpload.status = 'error';
        trackedUpload.errorMessage = '文件大小超过 10MB 限制。';
        continue;
      }

      await uploadPendingFile(options.agentId, trackedUpload, options.token ?? null);
    }
  }

  async function retryPendingUpload(options: RetryUploadOptions): Promise<void> {
    const upload = state.value.pendingUploads.find((item) => item.id === options.uploadId);
    if (!upload || !upload.sourceFile || !options.agentId || state.value.isSending) {
      return;
    }

    await uploadPendingFile(options.agentId, upload, options.token ?? null);
  }

  function removePendingUpload(uploadId: string): void {
    const upload = state.value.pendingUploads.find((item) => item.id === uploadId);
    if (!upload) {
      return;
    }

    cancelTrackedUpload(uploadId);
    revokePendingUpload(upload);
    state.value.pendingUploads = state.value.pendingUploads.filter((item) => item.id !== uploadId);
  }

  async function startRecording(): Promise<void> {
    if (!canRecord.value || state.value.isSending || hasPendingUploadsInFlight.value) {
      state.value.recordingState = canRecord.value
        ? state.value.recordingState
        : {
            status: 'unsupported',
            errorMessage: '当前浏览器不支持录音。',
          };
      return;
    }

    if (mediaRecorder.value || state.value.recordingState.status === 'recording') {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = resolveRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recordingStream.value = stream;
      mediaRecorder.value = recorder;
      recordingChunks.value = [];
      recordingMimeType.value = recorder.mimeType || mimeType || 'audio/webm';

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunks.value.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          state.value.recordingState = {
            ...state.value.recordingState,
            status: 'processing',
            errorMessage: '',
          };

          const audioBlob = new Blob(recordingChunks.value, {
            type: recorder.mimeType || recordingMimeType.value || 'audio/webm',
          });

          if (audioBlob.size === 0) {
            state.value.recordingState = createIdleRecordingState();
            return;
          }

          const dataUrl = await readBlobAsDataUrl(audioBlob);
          const data = extractBase64Payload(dataUrl);
          const format = guessAudioFormat(audioBlob.type || recordingMimeType.value);

          state.value.pendingUploads.push({
            id: crypto.randomUUID(),
            kind: 'audio',
            name: `voice-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`,
            size: audioBlob.size,
            status: 'ready',
            mimeType: audioBlob.type || recordingMimeType.value,
            previewUrl: dataUrl,
            data,
            format,
          });
          state.value.recordingState = createIdleRecordingState();
        } catch (error) {
          state.value.recordingState = {
            status: 'error',
            errorMessage: toErrorMessage(error),
          };
        } finally {
          cleanupRecorder();
        }
      };

      recorder.start();
      state.value.recordingState = {
        status: 'recording',
        mimeType: recorder.mimeType || recordingMimeType.value,
        startedAt: Date.now(),
        errorMessage: '',
      };
    } catch (error) {
      cleanupRecorder();
      state.value.recordingState = {
        status: detectRecordingSupport() ? 'error' : 'unsupported',
        errorMessage: toErrorMessage(error),
      };
    }
  }

  function stopRecordingCapture(): void {
    if (!mediaRecorder.value || state.value.recordingState.status !== 'recording') {
      return;
    }

    mediaRecorder.value.stop();
  }

  function cancelRecording(): void {
    if (!mediaRecorder.value) {
      state.value.recordingState = createIdleRecordingState();
      return;
    }

    mediaRecorder.value.onstop = null;
    mediaRecorder.value.stop();
    cleanupRecorder();
    state.value.recordingState = createIdleRecordingState();
  }

  async function sendDraft(options: SendDraftOptions): Promise<void> {
    if (state.value.isSending || !options.agentId) {
      return;
    }

    const runtimeConfig = getQwenPawClientConfig();
    ensureActiveSession(options.agentId, runtimeConfig.userId);

    const composerSnapshot = consumeComposerState();
    const requestMessage = buildRequestMessageFromComposer(composerSnapshot);
    if (!requestMessage) {
      restoreComposerState(composerSnapshot);
      return;
    }

    const chatSpec = await ensureActiveChatSpec(options.agentId, runtimeConfig.userId, runtimeConfig.channel, options.token);
    if (!chatSpec) {
      restoreComposerState(composerSnapshot);
      return;
    }

    const userMessage = createMessageFromRequestMessage(requestMessage, 'ready');
    const assistantMessage = createAssistantMessage('streaming');

    state.value.messages.push(userMessage, assistantMessage);
    state.value.isSending = true;
    state.value.errorMessage = null;
    state.value.activeChatStatus = 'running';
    activeStreamChatId.value = chatSpec.id;
    stopRequested.value = false;
    patchChatSpec(chatSpec.id, {
      status: 'running',
      updated_at: new Date().toISOString(),
    });

    resetLocalCompletionState();
    const controller = new AbortController();
    const completionController = new AbortController();
    activeController.value = controller;
    localCompletionController.value = completionController;

    const streamOutcome: StreamOutcome = {
      hasRenderableContent: false,
      terminalStatus: null,
      errorMessage: null,
      resetSessionAfterCompletion: false,
    };
    const messageTypeMap = new Map<string, string>();

    try {
      await sendQwenPawChat({
        agentId: options.agentId,
        token: options.token,
        message: requestMessage,
        sessionId: state.value.activeSessionId ?? chatSpec.session_id,
        userId: runtimeConfig.userId,
        channel: runtimeConfig.channel,
        model: runtimeConfig.model,
        signal: controller.signal,
        earlyExitSignal: completionController.signal,
        onEvent: (event) => {
          applyStreamEvent(event, assistantMessage, streamOutcome, messageTypeMap, state.value);
          scheduleLocalCompletion(assistantMessage, streamOutcome);
        },
      });

      finalizeCompletedStream(assistantMessage, streamOutcome, state.value);
      state.value.activeChatStatus = 'idle';
      patchChatSpec(chatSpec.id, {
        status: 'idle',
        updated_at: new Date().toISOString(),
      });

      if (streamOutcome.resetSessionAfterCompletion) {
        prepareBlankConversation(true);
      }

      releaseComposerUploads(composerSnapshot.uploads);
    } catch (error) {
      if (isAbortError(error)) {
        if (localCompletionRequested.value) {
          finalizeCompletedStream(assistantMessage, streamOutcome, state.value);
          state.value.activeChatStatus = 'idle';
          patchChatSpec(chatSpec.id, {
            status: 'idle',
            updated_at: new Date().toISOString(),
          });

          if (streamOutcome.resetSessionAfterCompletion) {
            prepareBlankConversation(true);
          }

          releaseComposerUploads(composerSnapshot.uploads);
          return;
        }

        finalizeAbortedAssistantMessage(assistantMessage, state.value);
        state.value.activeChatStatus = stopRequested.value ? 'idle' : 'interrupted';
        patchChatSpec(chatSpec.id, {
          status: 'idle',
          updated_at: new Date().toISOString(),
        });

        if (!stopRequested.value && !hasVisibleAssistantContent(assistantMessage)) {
          restoreComposerState(composerSnapshot);
        } else {
          releaseComposerUploads(composerSnapshot.uploads);
        }
        return;
      }

      assistantMessage.status = 'error';
      markSectionsAsReady(assistantMessage);
      if (!hasVisibleAssistantContent(assistantMessage)) {
        assistantMessage.content = '未能读取 QwenPaw 的流式回复。';
      }
      state.value.errorMessage = toErrorMessage(error);
      state.value.activeChatStatus = 'interrupted';
      patchChatSpec(chatSpec.id, {
        status: 'idle',
        updated_at: new Date().toISOString(),
      });
      restoreComposerState(composerSnapshot);
    } finally {
      state.value.isSending = false;
      activeController.value = null;
      activeStreamChatId.value = null;
      stopRequested.value = false;
      resetLocalCompletionState();
    }
  }

  async function stopStreaming(options: StopStreamingOptions): Promise<void> {
    if (!state.value.isSending || !activeController.value) {
      return;
    }

    stopRequested.value = true;
    clearLocalCompletionTimer();
    activeController.value.abort();

    if (!options.agentId || !activeStreamChatId.value) {
      return;
    }

    try {
      await stopQwenPawChat(options.agentId, activeStreamChatId.value, options.token);
    } catch {
      // Local abort remains the primary stop behavior for the prototype.
    }
  }

  onBeforeUnmount(() => {
    activeController.value?.abort();
    localCompletionController.value?.abort();
    clearLocalCompletionTimer();
    cleanupRecorder();
    disposePendingUploads(state.value.pendingUploads);
  });

  return {
    draft,
    messages: computed(() => state.value.messages),
    chatList: computed(() => state.value.chatList),
    activeChatId: computed(() => state.value.activeChatId),
    activeChatStatus: computed(() => state.value.activeChatStatus),
    activeChat: computed(() => state.value.chatList.find((chat) => chat.id === state.value.activeChatId) ?? null),
    pendingUploads: computed(() => state.value.pendingUploads),
    recordingState: computed(() => state.value.recordingState),
    isSending: computed(() => state.value.isSending),
    isLoadingChats: computed(() => isLoadingChats.value),
    isLoadingHistory: computed(() => isLoadingHistory.value),
    deletingChatId: computed(() => deletingChatId.value),
    errorMessage: computed(() => state.value.errorMessage),
    hasMessages,
    hasPendingUploads,
    hasPendingUploadsInFlight,
    canRecord,
    canSubmit,
    addPendingFiles,
    retryPendingUpload,
    removePendingUpload,
    createNewConversation,
    deleteChatById,
    openChat,
    sendDraft,
    setActiveAgent,
    startRecording,
    stopRecordingCapture,
    cancelRecording,
    stopStreaming,
  };

  async function loadChatWorkspace(agentId: string, token?: string | null): Promise<void> {
    const runtimeConfig = getQwenPawClientConfig();
    isLoadingChats.value = true;
    state.value.errorMessage = null;

    try {
      const loadedChats = await listChats(
        agentId,
        {
          userId: runtimeConfig.userId,
          channel: runtimeConfig.channel,
        },
        token,
      );

      if (activeAgentId.value !== agentId) {
        return;
      }

      state.value.chatList = sortChats(loadedChats);
      const preferredChatId = resolvePreferredChatId(
        state.value.chatList,
        agentId,
        runtimeConfig.userId,
        runtimeConfig.channel,
      );

      if (preferredChatId) {
        await loadChatById(agentId, preferredChatId, token ?? null, true);
        return;
      }

      prepareBlankConversation(true);
    } catch (error) {
      state.value.chatList = [];
      state.value.errorMessage = toErrorMessage(error);
      prepareBlankConversation(true);
    } finally {
      isLoadingChats.value = false;
    }
  }

  async function loadChatById(
    agentId: string,
    chatId: string,
    token: string | null,
    reconnectIfRunning: boolean,
  ): Promise<void> {
    const runtimeConfig = getQwenPawClientConfig();
    const chatSpec = state.value.chatList.find((chat) => chat.id === chatId);
    if (!chatSpec) {
      prepareBlankConversation(true);
      return;
    }

    isLoadingHistory.value = true;
    state.value.errorMessage = null;
    state.value.activeChatId = chatSpec.id;
    state.value.activeSessionId = chatSpec.session_id;
    state.value.activeChatStatus = chatSpec.status === 'running' ? 'running' : 'idle';
    setStoredActiveChatId(agentId, runtimeConfig.userId, runtimeConfig.channel, chatSpec.id);
    clearComposer();

    try {
      const history = await getChatHistory(agentId, chatId, token ?? undefined);
      if (activeAgentId.value !== agentId || state.value.activeChatId !== chatId) {
        return;
      }

      state.value.messages = normalizeHistoryMessages(history);
      state.value.activeChatStatus = history.status === 'running' ? 'running' : 'idle';
      patchChatSpec(chatId, { status: history.status });

      if (history.status === 'running' && reconnectIfRunning) {
        await reconnectActiveChat(agentId, chatSpec, token ?? undefined);
      }
    } catch (error) {
      state.value.errorMessage = toErrorMessage(error);
      state.value.activeChatStatus = 'interrupted';
    } finally {
      isLoadingHistory.value = false;
    }
  }

  async function reconnectActiveChat(agentId: string, chatSpec: ChatSpec, token?: string | null): Promise<void> {
    if (!chatSpec.session_id || state.value.isSending) {
      return;
    }

    const runtimeConfig = getQwenPawClientConfig();
    const assistantMessage = resolveReconnectAssistantMessage(state.value.messages);
    state.value.isSending = true;
    state.value.activeChatStatus = 'running';
    state.value.errorMessage = null;
    activeStreamChatId.value = chatSpec.id;
    stopRequested.value = false;

    resetLocalCompletionState();
    const controller = new AbortController();
    const completionController = new AbortController();
    activeController.value = controller;
    localCompletionController.value = completionController;

    const streamOutcome: StreamOutcome = {
      hasRenderableContent: false,
      terminalStatus: null,
      errorMessage: null,
      resetSessionAfterCompletion: false,
    };
    const messageTypeMap = new Map<string, string>();

    try {
      await reconnectQwenPawChat({
        agentId,
        token,
        sessionId: chatSpec.session_id,
        userId: runtimeConfig.userId,
        channel: runtimeConfig.channel,
        model: runtimeConfig.model,
        signal: controller.signal,
        earlyExitSignal: completionController.signal,
        onEvent: (event) => {
          applyStreamEvent(event, assistantMessage, streamOutcome, messageTypeMap, state.value);
          scheduleLocalCompletion(assistantMessage, streamOutcome);
        },
      });

      finalizeCompletedStream(assistantMessage, streamOutcome, state.value);
      state.value.activeChatStatus = 'idle';
      patchChatSpec(chatSpec.id, {
        status: 'idle',
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      if (isAbortError(error)) {
        if (localCompletionRequested.value) {
          finalizeCompletedStream(assistantMessage, streamOutcome, state.value);
          state.value.activeChatStatus = 'idle';
          patchChatSpec(chatSpec.id, {
            status: 'idle',
            updated_at: new Date().toISOString(),
          });
          return;
        }

        finalizeAbortedAssistantMessage(assistantMessage, state.value);
        state.value.activeChatStatus = stopRequested.value ? 'idle' : 'interrupted';
        patchChatSpec(chatSpec.id, {
          status: 'idle',
          updated_at: new Date().toISOString(),
        });
        return;
      }

      state.value.errorMessage = toErrorMessage(error);
      state.value.activeChatStatus = 'interrupted';
    } finally {
      state.value.isSending = false;
      activeController.value = null;
      activeStreamChatId.value = null;
      stopRequested.value = false;
      resetLocalCompletionState();
    }
  }

  async function ensureActiveChatSpec(
    agentId: string,
    userId: string,
    channel: string,
    token?: string | null,
  ): Promise<ChatSpec | null> {
    const existingChatId = state.value.activeChatId;
    if (existingChatId) {
      const existingChat = state.value.chatList.find((chat) => chat.id === existingChatId);
      if (existingChat) {
        return existingChat;
      }
    }

    try {
      const sessionId = state.value.activeSessionId ?? buildConversationSessionId(agentId, userId);
      const createdChat = await createChat(
        agentId,
        {
          session_id: sessionId,
          user_id: userId,
          channel,
        },
        token,
      );

      upsertChatSpec(createdChat);
      state.value.activeChatId = createdChat.id;
      state.value.activeSessionId = createdChat.session_id;
      setStoredActiveChatId(agentId, userId, channel, createdChat.id);
      return createdChat;
    } catch (error) {
      state.value.errorMessage = toErrorMessage(error);
      return null;
    }
  }

  async function uploadPendingFile(agentId: string, upload: PendingUpload, token?: string | null): Promise<void> {
    const trackedUpload = getTrackedPendingUpload(upload.id) ?? upload;

    if (!trackedUpload.sourceFile) {
      trackedUpload.status = 'error';
      trackedUpload.errorMessage = '缺少原始文件，无法重试上传。';
      return;
    }

    cancelledUploadIds.delete(trackedUpload.id);
    trackedUpload.status = 'uploading';
    trackedUpload.errorMessage = '';
    const controller = new AbortController();
    uploadControllers.set(trackedUpload.id, controller);

    try {
      const result = await uploadConsoleFile(agentId, trackedUpload.sourceFile, token, controller.signal);
      if (!hasPendingUpload(trackedUpload.id) || cancelledUploadIds.has(trackedUpload.id)) {
        return;
      }
      const nextUpload = getTrackedPendingUpload(trackedUpload.id);
      if (!nextUpload) {
        return;
      }
      nextUpload.status = 'ready';
      nextUpload.remoteUrl = result.url;
      nextUpload.fileId = result.fileId;
      nextUpload.name = result.filename || nextUpload.name;
    } catch (error) {
      if (isAbortError(error) || cancelledUploadIds.has(trackedUpload.id) || !hasPendingUpload(trackedUpload.id)) {
        return;
      }
      const nextUpload = getTrackedPendingUpload(trackedUpload.id);
      if (!nextUpload) {
        return;
      }
      nextUpload.status = 'error';
      nextUpload.errorMessage = toErrorMessage(error);
    } finally {
      if (uploadControllers.get(trackedUpload.id) === controller) {
        uploadControllers.delete(trackedUpload.id);
      }
      cancelledUploadIds.delete(trackedUpload.id);
    }
  }

  function clearComposer(): void {
    draft.value = '';
    disposePendingUploads(state.value.pendingUploads);
    state.value.pendingUploads = [];
    if (state.value.recordingState.status !== 'recording' && state.value.recordingState.status !== 'processing') {
      state.value.recordingState = canRecord.value ? createIdleRecordingState() : createUnsupportedRecordingState();
    }
  }

  function consumeComposerState(): ComposerSnapshot {
    const snapshot: ComposerSnapshot = {
      draft: draft.value,
      uploads: state.value.pendingUploads,
    };

    draft.value = '';
    state.value.pendingUploads = [];
    return snapshot;
  }

  function restoreComposerState(snapshot: ComposerSnapshot): void {
    if (!draft.value) {
      draft.value = snapshot.draft;
    }

    if (state.value.pendingUploads.length === 0) {
      state.value.pendingUploads = snapshot.uploads;
    } else {
      releaseComposerUploads(snapshot.uploads);
    }
  }

  function prepareBlankConversation(clearStoredChat: boolean): void {
    const runtimeConfig = getQwenPawClientConfig();
    state.value.messages = [];
    state.value.errorMessage = null;
    state.value.activeChatId = null;
    state.value.activeChatStatus = 'idle';
    state.value.activeSessionId = activeAgentId.value
      ? buildConversationSessionId(activeAgentId.value, runtimeConfig.userId)
      : null;

    clearComposer();

    if (activeAgentId.value && clearStoredChat) {
      setStoredActiveChatId(activeAgentId.value, runtimeConfig.userId, runtimeConfig.channel, null);
    }
  }

  function resetWorkspace(): void {
    clearComposer();
    clearLocalCompletionTimer();
    state.value.messages = [];
    state.value.chatList = [];
    state.value.errorMessage = null;
    state.value.activeChatId = null;
    state.value.activeSessionId = null;
    state.value.activeChatStatus = 'idle';
    state.value.isSending = false;
  }

  function ensureActiveSession(agentId: string, userId: string): void {
    if (!state.value.activeSessionId) {
      state.value.activeSessionId = buildConversationSessionId(agentId, userId);
    }
  }

  function upsertChatSpec(chatSpec: ChatSpec): void {
    const existingIndex = state.value.chatList.findIndex((chat) => chat.id === chatSpec.id);
    if (existingIndex === -1) {
      state.value.chatList = sortChats([chatSpec, ...state.value.chatList]);
      return;
    }

    const nextChats = [...state.value.chatList];
    nextChats.splice(existingIndex, 1, chatSpec);
    state.value.chatList = sortChats(nextChats);
  }

  function patchChatSpec(chatId: string, patch: Partial<ChatSpec>): void {
    const nextChats = state.value.chatList.map((chat) => (chat.id === chatId ? { ...chat, ...patch } : chat));
    state.value.chatList = sortChats(nextChats);
  }

  function cleanupRecorder(): void {
    if (recordingStream.value) {
      for (const track of recordingStream.value.getTracks()) {
        track.stop();
      }
    }

    mediaRecorder.value = null;
    recordingStream.value = null;
    recordingChunks.value = [];
    recordingMimeType.value = '';
  }
}

function applyStreamEvent(
  event: QwenPawStreamEvent,
  assistantMessage: ChatMessage,
  streamOutcome: StreamOutcome,
  messageTypeMap: Map<string, string>,
  state: ChatState,
): void {
  if (event.metadata?.clear_history === true) {
    streamOutcome.resetSessionAfterCompletion = true;
  }

  const normalizedStatus = normalizeStatus(event.status);
  if (isTerminalFailureStatus(normalizedStatus)) {
    streamOutcome.terminalStatus = normalizedStatus;
  } else if (event.object === 'response' && normalizedStatus === 'completed') {
    streamOutcome.terminalStatus = 'completed';
  }

  if (event.error || isTerminalFailureStatus(normalizedStatus)) {
    const streamErrorMessage = extractStreamErrorMessage(event);
    streamOutcome.errorMessage = streamErrorMessage;
    assistantMessage.status = 'error';
    markSectionsAsReady(assistantMessage);
    if (!hasVisibleAssistantContent(assistantMessage)) {
      assistantMessage.content = streamErrorMessage;
    }
    state.errorMessage = streamErrorMessage;
    return;
  }

  if (event.object === 'response') {
    applyResponseOutputMessages(event.output, assistantMessage, streamOutcome);
    syncAssistantMirrorContent(assistantMessage);
    return;
  }

  if (event.object === 'message') {
    applyMessageEvent(event, assistantMessage, streamOutcome, messageTypeMap, normalizedStatus);
    return;
  }

  if (event.object === 'content') {
    applyContentEvent(event, assistantMessage, streamOutcome, messageTypeMap);
    return;
  }

  if (event.object === 'raw_text' && typeof event.text === 'string') {
    const section = ensureSection(assistantMessage, 'raw_text', {
      kind: 'answer',
      title: '正式应答',
    });
    mergeSectionText(section, event.text, 'append', streamOutcome);
    syncAssistantMirrorContent(assistantMessage);
  }
}

function applyMessageEvent(
  event: QwenPawStreamEvent,
  assistantMessage: ChatMessage,
  streamOutcome: StreamOutcome,
  messageTypeMap: Map<string, string>,
  normalizedStatus: string | null,
): void {
  const messageId = typeof event.id === 'string' && event.id ? event.id : null;
  const messageType = normalizeMessageType(event.type);

  if (messageId && messageType) {
    messageTypeMap.set(messageId, messageType);
  }

  const descriptor = resolveSectionDescriptor(messageType, event.role, null);
  if (!messageId || !descriptor) {
    return;
  }

  const section = ensureSection(assistantMessage, messageId, descriptor);
  if (typeof event.name === 'string' && event.name.trim()) {
    section.meta = {
      ...(section.meta ?? {}),
      toolName: event.name.trim(),
    };
  }

  if (Array.isArray(event.content)) {
    applyContentBlocks(section, assistantMessage, event.content, 'backfill', streamOutcome);
  }

  if (normalizedStatus === 'completed') {
    section.status = 'ready';
  }

  syncAssistantMirrorContent(assistantMessage);
}

function applyContentEvent(
  event: QwenPawStreamEvent,
  assistantMessage: ChatMessage,
  streamOutcome: StreamOutcome,
  messageTypeMap: Map<string, string>,
): void {
  const parentMessageId = typeof event.msg_id === 'string' && event.msg_id ? event.msg_id : null;
  const parentType = parentMessageId ? messageTypeMap.get(parentMessageId) : undefined;
  const payload = asToolPayload(event.data);
  const descriptor = resolveSectionDescriptor(parentType, event.role, payload);
  const sectionId = parentMessageId ?? `content:${event.id ?? crypto.randomUUID()}`;

  if (!descriptor) {
    return;
  }

  const section = ensureSection(assistantMessage, sectionId, descriptor);
  if (typeof event.name === 'string' && event.name.trim()) {
    section.meta = {
      ...(section.meta ?? {}),
      toolName: event.name.trim(),
    };
  }

  if (event.type === 'data' && payload) {
    applyToolPayload(section, payload, streamOutcome);
  }

  if (typeof event.text === 'string') {
    mergeSectionText(section, event.text, event.delta === true ? 'append' : 'backfill', streamOutcome);
  }

  if (event.type !== 'data' && payload) {
    applyToolPayload(section, payload, streamOutcome);
  }

  const eventContentBlock = normalizeEventContentBlock(event);
  if (eventContentBlock && descriptor.kind === 'answer') {
    appendUniqueContentBlocks(assistantMessage, [eventContentBlock]);
    streamOutcome.hasRenderableContent = true;
  }

  syncAssistantMirrorContent(assistantMessage);
}

function applyResponseOutputMessages(
  output: QwenPawStreamEvent['output'],
  assistantMessage: ChatMessage,
  streamOutcome: StreamOutcome,
): void {
  if (!Array.isArray(output)) {
    return;
  }

  for (const message of normalizeOutputMessages(output)) {
    if (!isAssistantTurnHistoryMessage(message)) {
      continue;
    }

    applyHistoryAssistantMessage(assistantMessage, message, streamOutcome);
  }
}

function applyContentBlocks(
  section: ChatMessageSection,
  assistantMessage: ChatMessage,
  contentBlocks: QwenPawMessageContentBlock[],
  mode: 'append' | 'backfill',
  streamOutcome: StreamOutcome,
): void {
  const renderableBlocks: ChatMessageContentBlock[] = [];

  for (const contentBlock of contentBlocks) {
    if (contentBlock.type === 'text') {
      const textBlock = contentBlock as QwenPawTextHistoryContentBlock;
      mergeSectionText(section, textBlock.text ?? '', mode, streamOutcome);
      continue;
    }

    if (contentBlock.type === 'data') {
      const payload = asToolPayload(contentBlock.data);
      if (payload) {
        applyToolPayload(section, payload, streamOutcome);
      }
      continue;
    }

    const normalizedBlock = normalizeHistoryContentBlock(contentBlock, 'assistant');
    if (normalizedBlock) {
      renderableBlocks.push(normalizedBlock);
    }
  }

  if (section.kind === 'answer' && renderableBlocks.length > 0) {
    appendUniqueContentBlocks(assistantMessage, renderableBlocks);
    streamOutcome.hasRenderableContent = true;
  }
}

function mergeSectionText(
  section: ChatMessageSection,
  text: string,
  mode: 'append' | 'backfill',
  streamOutcome: StreamOutcome,
): void {
  if (!text) {
    return;
  }

  if (mode === 'append') {
    section.content += text;
  } else if (!section.content.trim()) {
    section.content = text;
  }

  if (section.content.length > 0) {
    section.status = 'streaming';
    streamOutcome.hasRenderableContent = true;
  }
}

function applyToolPayload(
  section: ChatMessageSection,
  payload: QwenPawToolPayload,
  streamOutcome: StreamOutcome,
): void {
  const meta = {
    ...(section.meta ?? {}),
  };

  if (typeof payload.call_id === 'string' && payload.call_id.trim()) {
    meta.callId = payload.call_id.trim();
  }

  if (typeof payload.name === 'string' && payload.name.trim()) {
    meta.toolName = payload.name.trim();
  }

  if (section.kind === 'tool_call' && payload.arguments !== undefined) {
    meta.argumentsText = stringifyToolValue(payload.arguments);
  }

  if (section.kind === 'tool_result' && payload.output !== undefined) {
    meta.outputText = stringifyToolValue(payload.output);
  }

  section.meta = meta;
  section.content = formatToolSectionContent(section);
  if (section.content.trim()) {
    section.status = 'streaming';
    streamOutcome.hasRenderableContent = true;
  }
}

function finalizeCompletedStream(assistantMessage: ChatMessage, streamOutcome: StreamOutcome, state: ChatState): void {
  syncAssistantMirrorContent(assistantMessage);

  if (assistantMessage.status === 'error') {
    if (!hasVisibleAssistantContent(assistantMessage)) {
      assistantMessage.content = streamOutcome.errorMessage || 'QwenPaw 返回了流式错误。';
    }
    return;
  }

  if (isTerminalFailureStatus(streamOutcome.terminalStatus)) {
    assistantMessage.status = 'error';
    markSectionsAsReady(assistantMessage);
    assistantMessage.content = assistantMessage.content.trim() || streamOutcome.errorMessage || 'QwenPaw 返回了流式错误。';
    state.errorMessage = streamOutcome.errorMessage || assistantMessage.content;
    return;
  }

  if (streamOutcome.terminalStatus !== 'completed' && !streamOutcome.hasRenderableContent) {
    assistantMessage.status = 'error';
    markSectionsAsReady(assistantMessage);
    assistantMessage.content = 'QwenPaw 在完成前结束了流。';
    state.errorMessage = assistantMessage.content;
    return;
  }

  assistantMessage.status = 'ready';
  markSectionsAsReady(assistantMessage);

  if (!hasVisibleAssistantContent(assistantMessage)) {
    assistantMessage.content = 'QwenPaw 返回了空响应。';
  }
}

function finalizeAbortedAssistantMessage(assistantMessage: ChatMessage, state: ChatState): void {
  assistantMessage.status = 'ready';
  markSectionsAsReady(assistantMessage);
  syncAssistantMirrorContent(assistantMessage);

  if (hasVisibleAssistantContent(assistantMessage)) {
    return;
  }

  state.messages = state.messages.filter((message) => message.id !== assistantMessage.id);
}

function createStreamOutcome(): StreamOutcome {
  return {
    hasRenderableContent: false,
    terminalStatus: null,
    errorMessage: null,
    resetSessionAfterCompletion: false,
  };
}

function normalizeOutputMessages(output: QwenPawStreamEvent['output']): QwenPawHistoryMessage[] {
  if (!Array.isArray(output)) {
    return [];
  }

  return output
    .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value)))
    .map((record) => ({
      ...(record as QwenPawHistoryMessage),
      id: typeof record.id === 'string' && record.id ? record.id : crypto.randomUUID(),
      role: normalizeHistoryRole(record.role),
      content: Array.isArray(record.content) ? (record.content as QwenPawMessageContentBlock[]) : null,
    }));
}

function normalizeHistoryRole(value: unknown): 'assistant' | 'system' | 'tool' | 'user' | null {
  if (value !== 'assistant' && value !== 'system' && value !== 'tool' && value !== 'user') {
    return null;
  }

  return value;
}

function isAssistantTurnHistoryMessage(message: QwenPawHistoryMessage): boolean {
  const role = message.role ?? null;
  if (role === 'assistant' || role === 'tool') {
    return true;
  }

  const messageType = normalizeMessageType(message.type);
  return role === 'system' && Boolean(messageType && TOOL_RESULT_MESSAGE_TYPES.has(messageType));
}

function normalizeHistoryMessages(history: ChatHistory): ChatMessage[] {
  const result: ChatMessage[] = [];
  let activeAssistantTurn: ChatMessage | null = null;

  for (const message of history.messages) {
    const role = message.role ?? null;
    if (role === 'user' || (role === 'system' && !isAssistantTurnHistoryMessage(message))) {
      activeAssistantTurn = null;
      result.push(createHistoryPrimaryMessage(message, role));
      continue;
    }

    if (isAssistantTurnHistoryMessage(message)) {
      if (!activeAssistantTurn) {
        activeAssistantTurn = createAssistantMessage(normalizeMessageStatus(message.status));
        result.push(activeAssistantTurn);
      }

      applyHistoryAssistantMessage(activeAssistantTurn, message);
    }
  }

  return result.filter((message) => message.role !== 'assistant' || hasVisibleAssistantContent(message));
}

function applyHistoryAssistantMessage(
  assistantMessage: ChatMessage,
  message: QwenPawHistoryMessage,
  streamOutcome: StreamOutcome = createStreamOutcome(),
): void {
  const descriptor = resolveSectionDescriptor(normalizeMessageType(message.type), message.role ?? undefined, null);
  if (descriptor) {
    const section = ensureSection(assistantMessage, message.id || crypto.randomUUID(), descriptor);
    applyContentBlocks(section, assistantMessage, Array.isArray(message.content) ? message.content : [], 'backfill', streamOutcome);
    section.status = normalizeMessageStatus(message.status) === 'streaming' ? 'streaming' : 'ready';
  } else {
    const normalizedBlocks = toUiContentBlocks(Array.isArray(message.content) ? message.content : [], 'assistant');
    appendUniqueContentBlocks(assistantMessage, normalizedBlocks);
    if (normalizedBlocks.length > 0) {
      streamOutcome.hasRenderableContent = true;
    }
  }

  if (normalizeMessageStatus(message.status) === 'error') {
    assistantMessage.status = 'error';
  } else if (normalizeMessageStatus(message.status) === 'streaming') {
    assistantMessage.status = 'streaming';
  }

  syncAssistantMirrorContent(assistantMessage);
}

function createHistoryPrimaryMessage(message: QwenPawHistoryMessage, role: 'user' | 'system'): ChatMessage {
  const blocks = toUiContentBlocks(Array.isArray(message.content) ? message.content : [], role);
  return {
    id: message.id || crypto.randomUUID(),
    role,
    content: extractPlainTextFromBlocks(blocks),
    contentBlocks: blocks,
    createdAt: new Date().toISOString(),
    status: normalizeMessageStatus(message.status),
  };
}

function createMessageFromRequestMessage(
  message: Pick<QwenPawRequestMessage, 'role' | 'content'>,
  status: ChatMessageStatus,
): ChatMessage {
  const blocks = requestBlocksToUiBlocks(message.content, message.role);
  return {
    id: crypto.randomUUID(),
    role: message.role,
    content: extractPlainTextFromBlocks(blocks),
    contentBlocks: blocks,
    createdAt: new Date().toISOString(),
    status,
    sections: message.role === 'assistant' ? [] : undefined,
  };
}

function createAssistantMessage(status: ChatMessageStatus): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: '',
    contentBlocks: [],
    createdAt: new Date().toISOString(),
    status,
    sections: [],
  };
}

function resolveReconnectAssistantMessage(messages: ChatMessage[]): ChatMessage {
  const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
  if (lastAssistant) {
    lastAssistant.status = 'streaming';
    return lastAssistant;
  }

  const message = createAssistantMessage('streaming');
  messages.push(message);
  return message;
}

function ensureSection(
  assistantMessage: ChatMessage,
  sectionId: string,
  descriptor: { kind: ChatMessageSectionKind; title: string },
): ChatMessageSection {
  const sections = assistantMessage.sections ?? (assistantMessage.sections = []);
  const existingSection = sections.find((section) => section.id === sectionId);
  if (existingSection) {
    return existingSection;
  }

  const section: ChatMessageSection = {
    id: sectionId,
    kind: descriptor.kind,
    title: descriptor.title,
    content: '',
    status: 'streaming',
    meta: {},
  };
  sections.push(section);
  return section;
}

function resolveSectionDescriptor(
  messageType: string | undefined,
  role: string | undefined,
  payload: QwenPawToolPayload | null,
): { kind: ChatMessageSectionKind; title: string } | null {
  if (messageType && THINKING_MESSAGE_TYPES.has(messageType)) {
    return { kind: 'thinking', title: '思考过程' };
  }

  if (messageType && TOOL_CALL_MESSAGE_TYPES.has(messageType)) {
    return { kind: 'tool_call', title: '工具调用' };
  }

  if (messageType && TOOL_RESULT_MESSAGE_TYPES.has(messageType)) {
    return { kind: 'tool_result', title: '工具结果' };
  }

  if (messageType === 'message') {
    return { kind: 'answer', title: '正式应答' };
  }

  if (payload) {
    if (payload.output !== undefined) {
      return { kind: 'tool_result', title: '工具结果' };
    }

    if (payload.arguments !== undefined || payload.call_id !== undefined || payload.name !== undefined) {
      return { kind: 'tool_call', title: '工具调用' };
    }
  }

  if (role === 'assistant') {
    return { kind: 'answer', title: '正式应答' };
  }

  if (role === 'tool') {
    return { kind: 'tool_result', title: '工具结果' };
  }

  return null;
}

function syncAssistantMirrorContent(assistantMessage: ChatMessage): void {
  const answerSections = (assistantMessage.sections ?? [])
    .filter((section) => section.kind === 'answer' && section.content.length > 0)
    .map((section) => section.content);

  if (answerSections.length > 0) {
    assistantMessage.content = answerSections.join('\n\n');
    return;
  }

  const textBlocks = assistantMessage.contentBlocks.filter((block) => block.type === 'text') as ChatTextContentBlock[];
  if (textBlocks.length > 0) {
    assistantMessage.content = textBlocks.map((block) => block.text).join('\n\n');
    return;
  }

  if (assistantMessage.status !== 'error') {
    assistantMessage.content = '';
  }
}

function formatToolSectionContent(section: ChatMessageSection): string {
  const lines: string[] = [];

  if (section.meta?.toolName) {
    lines.push(`工具：${section.meta.toolName}`);
  }

  if (section.meta?.callId) {
    lines.push(`调用 ID：${section.meta.callId}`);
  }

  if (section.kind === 'tool_call' && section.meta?.argumentsText) {
    lines.push('参数：');
    lines.push(section.meta.argumentsText);
  }

  if (section.kind === 'tool_result' && section.meta?.outputText) {
    lines.push('结果：');
    lines.push(section.meta.outputText);
  }

  return lines.join('\n');
}

function markSectionsAsReady(message: ChatMessage): void {
  for (const section of message.sections ?? []) {
    if (section.status === 'streaming') {
      section.status = 'ready';
    }
  }
}

function hasVisibleAssistantContent(message: ChatMessage): boolean {
  if (message.content.trim()) {
    return true;
  }

  if (message.contentBlocks.length > 0) {
    return true;
  }

  return (message.sections ?? []).some((section) => section.content.trim().length > 0);
}

function hasRenderableAnswerContent(message: ChatMessage): boolean {
  if (message.content.trim()) {
    return true;
  }

  if (message.contentBlocks.length > 0) {
    return true;
  }

  return (message.sections ?? []).some(
    (section) => section.kind === 'answer' && section.content.trim().length > 0,
  );
}

function createInitialState(): ChatState {
  return {
    messages: [],
    isSending: false,
    errorMessage: null,
    activeChatId: null,
    activeSessionId: null,
    activeChatStatus: 'idle',
    chatList: [],
    pendingUploads: [],
    recordingState: detectRecordingSupport() ? createIdleRecordingState() : createUnsupportedRecordingState(),
  };
}

function createIdleRecordingState(): RecordingState {
  return {
    status: 'idle',
    errorMessage: '',
  };
}

function createUnsupportedRecordingState(): RecordingState {
  return {
    status: 'unsupported',
    errorMessage: '当前浏览器不支持录音。',
  };
}

function detectRecordingSupport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function resolveRecordingMimeType(): string {
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

function createPendingFileUpload(file: File): PendingUpload {
  return {
    id: crypto.randomUUID(),
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

function revokePendingUpload(upload: PendingUpload): void {
  if (upload.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(upload.previewUrl);
  }
}

function releaseComposerUploads(uploads: PendingUpload[]): void {
  for (const upload of uploads) {
    revokePendingUpload(upload);
  }
}

function hasSendableComposerContent(snapshot: ComposerSnapshot): boolean {
  const hasText = snapshot.draft.trim().length > 0;
  const hasReadyUploads = snapshot.uploads.some((upload) => upload.status === 'ready');
  return hasText || hasReadyUploads;
}

function buildRequestMessageFromComposer(snapshot: ComposerSnapshot): Pick<QwenPawRequestMessage, 'role' | 'content'> | null {
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

function requestBlocksToUiBlocks(
  contentBlocks: QwenPawRequestContentBlock[],
  role: QwenPawRequestMessage['role'],
): ChatMessageContentBlock[] {
  const result: ChatMessageContentBlock[] = [];

  for (const contentBlock of contentBlocks) {
    if (contentBlock.type === 'text') {
      result.push({
        id: crypto.randomUUID(),
        type: 'text',
        text: contentBlock.text,
        format: role === 'assistant' ? 'markdown' : 'plain',
      });
      continue;
    }

    if (contentBlock.type === 'image') {
      result.push({
        id: crypto.randomUUID(),
        type: 'image',
        imageUrl: contentBlock.image_url,
      });
      continue;
    }

    if (contentBlock.type === 'file') {
      const fileUrl = contentBlock.file_url || buildGenericDataUrl(contentBlock.file_data);
      if (!fileUrl) {
        continue;
      }

      result.push({
        id: crypto.randomUUID(),
        type: 'file',
        fileUrl,
        filename: contentBlock.filename,
        fileId: contentBlock.file_id,
      });
      continue;
    }

    if (contentBlock.type === 'audio') {
      result.push({
        id: crypto.randomUUID(),
        type: 'audio',
        data: contentBlock.data,
        format: contentBlock.format,
        dataUrl: buildAudioDataUrl(contentBlock.data, contentBlock.format),
      });
    }
  }

  return result;
}

function toUiContentBlocks(contentBlocks: QwenPawMessageContentBlock[], role: 'assistant' | 'system' | 'user'): ChatMessageContentBlock[] {
  const result: ChatMessageContentBlock[] = [];

  for (const contentBlock of contentBlocks) {
    const normalized = normalizeHistoryContentBlock(contentBlock, role);
    if (normalized) {
      result.push(normalized);
    }
  }

  return result;
}

function normalizeHistoryContentBlock(
  contentBlock: QwenPawMessageContentBlock,
  role: 'assistant' | 'system' | 'user',
): ChatMessageContentBlock | null {
  if (contentBlock.type === 'text') {
    const textBlock = contentBlock as QwenPawTextHistoryContentBlock;
    const text = textBlock.text ?? '';
    if (!text) {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      type: 'text',
      text,
      format: role === 'assistant' ? 'markdown' : 'plain',
    };
  }

  if (contentBlock.type === 'image') {
    const imageBlock = contentBlock as QwenPawImageContentBlock;
    if (!imageBlock.image_url) {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      type: 'image',
      imageUrl: imageBlock.image_url,
    };
  }

  if (contentBlock.type === 'file') {
    const fileBlock = contentBlock as QwenPawFileContentBlock;
    const fileUrl = fileBlock.file_url || buildGenericDataUrl(fileBlock.file_data ?? undefined);
    if (!fileUrl) {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      type: 'file',
      fileUrl,
      filename: fileBlock.filename ?? undefined,
      fileId: fileBlock.file_id ?? undefined,
    };
  }

  if (contentBlock.type === 'audio') {
    const audioBlock = contentBlock as QwenPawAudioContentBlock;
    if (!audioBlock.data || !audioBlock.format) {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      type: 'audio',
      data: audioBlock.data,
      format: audioBlock.format,
      dataUrl: buildAudioDataUrl(audioBlock.data, audioBlock.format),
    };
  }

  return null;
}

function normalizeEventContentBlock(event: QwenPawStreamEvent): ChatMessageContentBlock | null {
  if (event.type === 'image' && typeof event.image_url === 'string' && event.image_url.trim()) {
    return {
      id: crypto.randomUUID(),
      type: 'image',
      imageUrl: event.image_url,
    };
  }

  if (event.type === 'file') {
    const fileUrl = typeof event.file_url === 'string' ? event.file_url : '';
    if (!fileUrl) {
      return null;
    }

    return {
      id: crypto.randomUUID(),
      type: 'file',
      fileUrl,
      filename: typeof event.filename === 'string' ? event.filename : undefined,
      fileId: typeof event.file_id === 'string' ? event.file_id : undefined,
    };
  }

  if (event.type === 'audio' && typeof event.data === 'string' && typeof event.format === 'string') {
    return {
      id: crypto.randomUUID(),
      type: 'audio',
      data: event.data,
      format: event.format,
      dataUrl: buildAudioDataUrl(event.data, event.format),
    };
  }

  return null;
}

function appendUniqueContentBlocks(message: ChatMessage, contentBlocks: ChatMessageContentBlock[]): void {
  for (const contentBlock of contentBlocks) {
    const key = buildContentBlockKey(contentBlock);
    const hasExisting = message.contentBlocks.some((existingBlock) => buildContentBlockKey(existingBlock) === key);
    if (!hasExisting) {
      message.contentBlocks.push(contentBlock);
    }
  }
}

function buildContentBlockKey(contentBlock: ChatMessageContentBlock): string {
  if (contentBlock.type === 'text') {
    return `text:${contentBlock.format}:${contentBlock.text}`;
  }

  if (contentBlock.type === 'image') {
    return `image:${contentBlock.imageUrl}`;
  }

  if (contentBlock.type === 'file') {
    return `file:${contentBlock.fileUrl}:${contentBlock.filename ?? ''}`;
  }

  return `audio:${contentBlock.format}:${contentBlock.data.slice(0, 48)}`;
}

function normalizeMessageType(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue || undefined;
}

function normalizeStatus(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  return value.toLowerCase();
}

function normalizeMessageStatus(value: unknown): ChatMessageStatus {
  const normalized = normalizeStatus(value);
  if (normalized === 'failed' || normalized === 'rejected') {
    return 'error';
  }

  if (normalized === 'created' || normalized === 'in_progress' || normalized === 'running') {
    return 'streaming';
  }

  return 'ready';
}

function isTerminalFailureStatus(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return ['failed', 'canceled', 'cancelled', 'rejected'].includes(value);
}

function extractStreamErrorMessage(event: QwenPawStreamEvent): string {
  if (typeof event.error === 'string' && event.error.trim()) {
    return event.error;
  }

  if (event.error && typeof event.error === 'object' && typeof event.error.message === 'string') {
    return event.error.message;
  }

  if (typeof event.text === 'string' && event.text.trim()) {
    return event.text;
  }

  if (typeof event.status === 'string') {
    return `QwenPaw stream ${event.status}.`;
  }

  return 'QwenPaw reported a stream error.';
}

function asToolPayload(value: unknown): QwenPawToolPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as QwenPawToolPayload;
}

function stringifyToolValue(value: unknown): string {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return '';
    }

    if ((trimmedValue.startsWith('{') || trimmedValue.startsWith('[')) && isJson(trimmedValue)) {
      return JSON.stringify(JSON.parse(trimmedValue), null, 2);
    }

    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
}

function isJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown chat error.';
}

function sortChats(chats: ChatSpec[]): ChatSpec[] {
  return [...chats].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
}

function resolvePreferredChatId(chats: ChatSpec[], agentId: string, userId: string, channel: string): string | null {
  const storedChatId = getStoredActiveChatId(agentId, userId, channel);
  if (storedChatId && chats.some((chat) => chat.id === storedChatId)) {
    return storedChatId;
  }

  return chats[0]?.id ?? null;
}

function extractPlainTextFromBlocks(contentBlocks: ChatMessageContentBlock[]): string {
  return contentBlocks
    .filter((contentBlock): contentBlock is ChatTextContentBlock => contentBlock.type === 'text')
    .map((contentBlock) => contentBlock.text)
    .join('\n\n');
}

function buildAudioDataUrl(data: string, format: string): string {
  if (data.startsWith('data:')) {
    return data;
  }

  const normalizedFormat = format.trim() || 'webm';
  const mediaType = normalizedFormat.includes('/') ? normalizedFormat : `audio/${normalizedFormat}`;
  return `data:${mediaType};base64,${data}`;
}

function buildGenericDataUrl(base64Data?: string): string {
  if (!base64Data) {
    return '';
  }

  if (base64Data.startsWith('data:')) {
    return base64Data;
  }

  return `data:application/octet-stream;base64,${base64Data}`;
}

function extractBase64Payload(dataUrl: string): string {
  const separatorIndex = dataUrl.indexOf(',');
  if (separatorIndex === -1) {
    return dataUrl;
  }

  return dataUrl.slice(separatorIndex + 1);
}

function guessAudioFormat(mimeType: string): string {
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

function readBlobAsDataUrl(blob: Blob): Promise<string> {
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
