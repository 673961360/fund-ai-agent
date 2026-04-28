import { computed, onBeforeUnmount, ref } from 'vue';
import {
  DEFAULT_CHAT_NAME,
  buildConversationSessionId,
  createChat,
  deleteChat,
  getChatHistory,
  getQwenPawClientConfig,
  listChats,
  reconnectQwenPawChat,
  sendQwenPawChat,
  setStoredActiveChatId,
  stopQwenPawChat,
  updateChat,
  uploadConsoleFile,
} from '@proto-shared/qwenpaw-client';
import { uuid } from '@proto-shared/uuid';
import {
  MAX_UPLOAD_SIZE,
  buildRequestMessageFromComposer,
  createIdleRecordingState,
  createPendingFileUpload,
  createUnsupportedRecordingState,
  detectRecordingSupport,
  extractBase64Payload,
  guessAudioFormat,
  hasSendableComposerContent,
  readBlobAsDataUrl,
  releaseComposerUploads,
  resolveRecordingMimeType,
  revokePendingUpload,
} from '@/composables/chat-session/media';
import {
  applyPreviewUrls,
  createAssistantMessage,
  createMessageFromRequestMessage,
  getTrackedAssistantMessage,
  hasVisibleAssistantContent,
  isAbortError,
  markSectionsAsReady,
  resolveReconnectAssistantMessage,
  toErrorMessage,
} from '@/composables/chat-session/message-helpers';
import {
  finalizeCachedMessages,
  normalizeHistoryMessages,
} from '@/composables/chat-session/history';
import {
  applyStreamEvent,
  finalizeAbortedAssistantMessage,
  finalizeCompletedStream,
} from '@/composables/chat-session/stream';
import type {
  AddFilesOptions,
  AgentWorkspaceOptions,
  ComposerSnapshot,
  DeleteChatOptions,
  OpenChatOptions,
  RenameChatOptions,
  RetryUploadOptions,
  SendDraftOptions,
  StopStreamingOptions,
} from '@/composables/chat-session/types';
import {
  createInitialState,
  createStreamOutcome,
  generateChatTitleFromText,
  resolvePreferredChatId,
  sortChats,
} from '@/composables/chat-session/workspace';
import type { ChatMessage, ChatSpec, ChatState, PendingUpload } from '@proto-shared/types';

export function useQwenPawChatSession() {
  const state = ref<ChatState>(createInitialState());
  const draft = ref('');
  const activeAgentId = ref<string | null>(null);
  const isLoadingChats = ref(false);
  const isLoadingHistory = ref(false);
  const deletingChatId = ref<string | null>(null);
  const renamingChatId = ref<string | null>(null);
  const activeController = ref<AbortController | null>(null);
  const activeStreamChatId = ref<string | null>(null);
  const stopRequested = ref(false);
  const mediaRecorder = ref<MediaRecorder | null>(null);
  const recordingStream = ref<MediaStream | null>(null);
  const recordingChunks = ref<Blob[]>([]);
  const recordingMimeType = ref('');
  const localCompletionController = ref<AbortController | null>(null);
  const localCompletionTimer = ref<ReturnType<typeof setTimeout> | null>(null);
  const uploadControllers = new Map<string, AbortController>();
  const cancelledUploadIds = new Set<string>();
  // 鍒囨崲绂诲紑娴佸紡鑱婂ぉ鏃剁紦瀛樻秷鎭紙鍚庣鍙兘灏氭湭鎸佷箙鍖栵級
  const messageCache = new Map<string, ChatMessage[]>();

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
    localCompletionController.value = null;
  }

  function waitForSendingClear(timeoutMs = 3000): Promise<void> {
    if (!state.value.isSending) return Promise.resolve();
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (!state.value.isSending || Date.now() - start > timeoutMs) {
          resolve();
        } else {
          setTimeout(check, 20);
        }
      };
      setTimeout(check, 20);
    });
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

  async function setActiveAgent(
    agentId: string | null,
    options: AgentWorkspaceOptions = {},
  ): Promise<void> {
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
      // 缂撳瓨褰撳墠娴佸紡鑱婂ぉ鐨勬秷鎭紙鍚庣鍦ㄦ祦瀹屾垚鍓嶄笉浼氭寔涔呭寲锛屽垏鍥炴椂闇€瑕佹仮澶嶏級
      const currentChatId = state.value.activeChatId;
      if (currentChatId) {
        messageCache.set(currentChatId, JSON.parse(JSON.stringify(state.value.messages)));
      }
      stopRequested.value = true;
      clearLocalCompletionTimer();
      activeController.value?.abort();
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

  async function renameChatById(
    chatId: string,
    name: string,
    options: RenameChatOptions,
  ): Promise<void> {
    if (!options.agentId) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      state.value.errorMessage = '聊天名称不能为空。';
      return;
    }

    const existingChat = state.value.chatList.find((chat) => chat.id === chatId);
    if (existingChat && existingChat.name === trimmedName) {
      return;
    }

    renamingChatId.value = chatId;
    state.value.errorMessage = null;

    try {
      const updatedChat = await updateChat(
        options.agentId,
        chatId,
        {
          name: trimmedName,
        },
        options.token,
      );

      upsertChatSpec(updatedChat);
    } catch (error) {
      state.value.errorMessage = toErrorMessage(error);
    } finally {
      if (renamingChatId.value === chatId) {
        renamingChatId.value = null;
      }
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
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

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
            id: uuid(),
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

    const chatSpec = await ensureActiveChatSpec(
      options.agentId,
      runtimeConfig.userId,
      runtimeConfig.channel,
      options.token,
    );
    if (!chatSpec) {
      restoreComposerState(composerSnapshot);
      return;
    }

    const isFirstMessage = state.value.messages.length === 0;
    const userText = composerSnapshot.draft.trim();

    const userMessage = createMessageFromRequestMessage(requestMessage, 'ready');
    applyPreviewUrls(userMessage, composerSnapshot.uploads);
    const assistantMessage = createAssistantMessage('streaming');

    state.value.messages.push(userMessage, assistantMessage);
    const trackedAssistantMessage =
      getTrackedAssistantMessage(state.value.messages, assistantMessage.id) ?? assistantMessage;
    state.value.isSending = true;
    state.value.errorMessage = null;
    state.value.activeChatStatus = 'running';
    activeStreamChatId.value = chatSpec.id;
    stopRequested.value = false;
    patchChatSpec(chatSpec.id, {
      status: 'running',
      updated_at: new Date().toISOString(),
    });

    // 棣栨潯娑堟伅绔嬪嵆鐢熸垚鏍囬锛堜笉绛夊緟娴佸畬鎴愶紝閬垮厤鍒囨崲浼氳瘽鏃舵爣棰樹涪澶憋級
    if (isFirstMessage && userText && chatSpec.name === DEFAULT_CHAT_NAME) {
      const autoTitle = generateChatTitleFromText(userText);
      updateChat(options.agentId, chatSpec.id, { name: autoTitle }, options.token)
        .then((updated) => upsertChatSpec(updated))
        .catch(() => {});
    }

    resetLocalCompletionState();
    const controller = new AbortController();
    const completionController = new AbortController();
    activeController.value = controller;
    localCompletionController.value = completionController;

    const streamOutcome = createStreamOutcome();
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
          applyStreamEvent(
            event,
            trackedAssistantMessage,
            streamOutcome,
            messageTypeMap,
            state.value,
          );
        },
      });

      finalizeCompletedStream(trackedAssistantMessage, streamOutcome, state.value);
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
      // earlyExitSignal abort does not throw here; only user-triggered aborts and real errors
      // need explicit handling in this branch.
      if (isAbortError(error)) {
        finalizeAbortedAssistantMessage(trackedAssistantMessage, state.value);
        state.value.activeChatStatus = stopRequested.value ? 'idle' : 'interrupted';
        patchChatSpec(chatSpec.id, {
          status: 'idle',
          updated_at: new Date().toISOString(),
        });

        if (!stopRequested.value && !hasVisibleAssistantContent(trackedAssistantMessage)) {
          restoreComposerState(composerSnapshot);
        } else {
          releaseComposerUploads(composerSnapshot.uploads);
        }
        return;
      }

      const reactiveMsg = state.value.messages.find((m) => m.id === assistantMessage.id);
      if (reactiveMsg) {
        reactiveMsg.status = 'error';
        markSectionsAsReady(reactiveMsg);
        if (!hasVisibleAssistantContent(reactiveMsg)) {
          reactiveMsg.content = '未能读取 QwenPaw 的流式回复。';
        }
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
    activeChat: computed(
      () => state.value.chatList.find((chat) => chat.id === state.value.activeChatId) ?? null,
    ),
    pendingUploads: computed(() => state.value.pendingUploads),
    recordingState: computed(() => state.value.recordingState),
    isSending: computed(() => state.value.isSending),
    isLoadingChats: computed(() => isLoadingChats.value),
    isLoadingHistory: computed(() => isLoadingHistory.value),
    deletingChatId: computed(() => deletingChatId.value),
    renamingChatId: computed(() => renamingChatId.value),
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
    renameChatById,
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

      const cached = messageCache.get(chatId);

      if (history.status === 'running' && reconnectIfRunning) {
        // Reconnect from persisted history first, then rebuild assistant output from stream
        // events to avoid duplicating the cached, not-yet-persisted assistant content.
        state.value.messages = normalizeHistoryMessages(history);
        if (history.messages.length === 0 && cached) {
          // If the backend has not persisted the user turn yet, fall back to the cached copy.
          state.value.messages = cached.filter((message) => message.role === 'user');
        }
        if (cached) messageCache.delete(chatId);
        state.value.activeChatStatus = 'running';
        patchChatSpec(chatId, { status: 'running' });
        isLoadingHistory.value = false;

        // Wait for any previous abort cleanup to settle before starting reconnect.
        if (state.value.isSending) {
          await waitForSendingClear();
        }
        if (state.value.activeChatId === chatId) {
          await reconnectActiveChat(agentId, chatSpec, token ?? undefined);
        }
      } else {
        if (cached && history.messages.length === 0) {
          state.value.messages = finalizeCachedMessages(cached);
        } else {
          state.value.messages = normalizeHistoryMessages(history);
        }
        if (cached) messageCache.delete(chatId);
        state.value.activeChatStatus = history.status === 'running' ? 'running' : 'idle';
        patchChatSpec(chatId, { status: history.status });
      }
    } catch (error) {
      state.value.errorMessage = toErrorMessage(error);
      state.value.activeChatStatus = 'interrupted';
    } finally {
      isLoadingHistory.value = false;
    }
  }

  async function reconnectActiveChat(
    agentId: string,
    chatSpec: ChatSpec,
    token?: string | null,
  ): Promise<void> {
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

    const streamOutcome = createStreamOutcome();
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
        },
      });

      // No events arrived, which means the backend task likely finished before reconnect.
      if (!streamOutcome.hasRenderableContent) {
        const freshHistory = await getChatHistory(agentId, chatSpec.id, token ?? undefined);
        if (freshHistory.messages.length > 0) {
          state.value.messages = normalizeHistoryMessages(freshHistory);
        }
      }

      finalizeCompletedStream(assistantMessage, streamOutcome, state.value);
      state.value.activeChatStatus = 'idle';
      patchChatSpec(chatSpec.id, {
        status: 'idle',
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      // earlyExitSignal abort is handled on the happy path; this branch is for local aborts
      // and actual reconnect failures.
      if (isAbortError(error)) {
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

  async function uploadPendingFile(
    agentId: string,
    upload: PendingUpload,
    token?: string | null,
  ): Promise<void> {
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
      const result = await uploadConsoleFile(
        agentId,
        trackedUpload.sourceFile,
        token,
        controller.signal,
      );
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
      if (
        isAbortError(error) ||
        cancelledUploadIds.has(trackedUpload.id) ||
        !hasPendingUpload(trackedUpload.id)
      ) {
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
    if (
      state.value.recordingState.status !== 'recording' &&
      state.value.recordingState.status !== 'processing'
    ) {
      state.value.recordingState = canRecord.value
        ? createIdleRecordingState()
        : createUnsupportedRecordingState();
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
    messageCache.clear();
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
    const nextChats = state.value.chatList.map((chat) =>
      chat.id === chatId ? { ...chat, ...patch } : chat,
    );
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
