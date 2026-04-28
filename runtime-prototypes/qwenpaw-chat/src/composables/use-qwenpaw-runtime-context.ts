import { onMounted, watch } from 'vue';
import type { Ref } from 'vue';

interface UseQwenPawRuntimeContextOptions {
  initialize: () => Promise<void>;
  isAuthReady: Readonly<Ref<boolean>>;
  token: Readonly<Ref<string | null>>;
  loadAgents: (token?: string | null) => Promise<void>;
  resetAgents: () => void;
  selectedAgentId: Readonly<Ref<string | null>>;
  setActiveAgent: (
    agentId: string | null,
    options?: {
      token?: string | null;
      force?: boolean;
    },
  ) => Promise<void>;
}

export function useQwenPawRuntimeContext(options: UseQwenPawRuntimeContextOptions) {
  async function refreshRuntimeContext(): Promise<void> {
    await options.initialize();
    if (!options.isAuthReady.value) {
      return;
    }

    await options.loadAgents(options.token.value);
    await options.setActiveAgent(options.selectedAgentId.value, {
      token: options.token.value,
      force: true,
    });
  }

  onMounted(() => {
    void options.initialize();
  });

  watch(
    options.isAuthReady,
    (ready) => {
      if (ready) {
        void options.loadAgents(options.token.value);
        return;
      }

      options.resetAgents();
      void options.setActiveAgent(null, { force: true });
    },
    { immediate: true },
  );

  watch(
    options.selectedAgentId,
    (agentId) => {
      if (!options.isAuthReady.value) {
        return;
      }

      void options.setActiveAgent(agentId, {
        token: options.token.value,
        force: true,
      });
    },
    { immediate: true },
  );

  return {
    refreshRuntimeContext,
  };
}
