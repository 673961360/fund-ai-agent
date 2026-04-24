import { computed, ref } from 'vue';
import {
  clearAuthSession,
  fetchAuthStatus,
  getStoredToken,
  getStoredUsername,
  loginWithPassword,
  storeAuthSession,
  verifyAuthToken,
} from '@proto-shared/qwenpaw-client';
import type { QwenPawAuthState, QwenPawLoginRequest } from '@proto-shared/types';

export function useQwenPawAuth() {
  const state = ref<QwenPawAuthState>({
    enabled: false,
    valid: false,
    username: getStoredUsername(),
    tokenPresent: Boolean(getStoredToken()),
    isLoading: true,
  });
  const token = ref<string | null>(getStoredToken());
  const errorMessage = ref<string | null>(null);
  const hasUsers = ref(true);
  const isSubmitting = ref(false);

  async function initialize(): Promise<void> {
    state.value.isLoading = true;
    errorMessage.value = null;
    syncStoredSession();

    try {
      const status = await fetchAuthStatus();
      hasUsers.value = status.has_users !== false;
      state.value.enabled = Boolean(status.enabled);

      if (!state.value.enabled) {
        state.value.valid = true;
        return;
      }

      if (!token.value) {
        state.value.valid = false;
        return;
      }

      const isValid = await verifyAuthToken(token.value);
      if (!isValid) {
        clearSessionState();
        state.value.enabled = true;
        state.value.valid = false;
        return;
      }

      state.value.valid = true;
    } catch (error) {
      state.value.valid = false;
      errorMessage.value = toErrorMessage(error);
    } finally {
      state.value.isLoading = false;
      syncStoredSession();
    }
  }

  async function login(request: QwenPawLoginRequest): Promise<boolean> {
    isSubmitting.value = true;
    errorMessage.value = null;

    try {
      const result = await loginWithPassword(request);
      storeAuthSession(result);
      token.value = result.token;
      state.value.username = result.username;
      state.value.enabled = true;
      state.value.valid = true;
      state.value.tokenPresent = true;
      return true;
    } catch (error) {
      errorMessage.value = toErrorMessage(error);
      state.value.valid = false;
      return false;
    } finally {
      isSubmitting.value = false;
      syncStoredSession();
    }
  }

  function logout(): void {
    clearSessionState();
    state.value.valid = !state.value.enabled;
    syncStoredSession();
  }

  function syncStoredSession(): void {
    token.value = getStoredToken();
    state.value.username = getStoredUsername();
    state.value.tokenPresent = Boolean(token.value);
  }

  function clearSessionState(): void {
    clearAuthSession();
    token.value = null;
    state.value.username = null;
    state.value.tokenPresent = false;
  }

  return {
    authState: computed(() => state.value),
    token: computed(() => token.value),
    hasUsers: computed(() => hasUsers.value),
    isSubmitting: computed(() => isSubmitting.value),
    errorMessage: computed(() => errorMessage.value),
    initialize,
    login,
    logout,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown authentication error.';
}
