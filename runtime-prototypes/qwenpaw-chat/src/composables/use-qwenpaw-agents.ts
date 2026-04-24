import { computed, ref } from 'vue';
import { getStoredSelectedAgentId, listAgents, setStoredSelectedAgentId } from '@proto-shared/qwenpaw-client';
import type { QwenPawAgentSummary } from '@proto-shared/types';

export function useQwenPawAgents() {
  const agents = ref<QwenPawAgentSummary[]>([]);
  const selectedAgentId = ref<string | null>(getStoredSelectedAgentId());
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  async function loadAgents(token?: string | null): Promise<void> {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const loadedAgents = await listAgents(token);
      agents.value = loadedAgents;
      selectedAgentId.value = resolveSelectedAgentId(loadedAgents, selectedAgentId.value || getStoredSelectedAgentId());

      if (selectedAgentId.value) {
        setStoredSelectedAgentId(selectedAgentId.value);
      }
    } catch (error) {
      agents.value = [];
      selectedAgentId.value = null;
      errorMessage.value = toErrorMessage(error);
    } finally {
      isLoading.value = false;
    }
  }

  function selectAgent(agentId: string): void {
    selectedAgentId.value = agentId;
    setStoredSelectedAgentId(agentId);
  }

  function reset(): void {
    agents.value = [];
    selectedAgentId.value = null;
    errorMessage.value = null;
  }

  return {
    agents: computed(() => agents.value),
    selectedAgentId,
    selectedAgent: computed(
      () => agents.value.find((agent) => agent.id === selectedAgentId.value) ?? null,
    ),
    hasAgents: computed(() => agents.value.length > 0),
    isLoading: computed(() => isLoading.value),
    errorMessage: computed(() => errorMessage.value),
    loadAgents,
    selectAgent,
    reset,
  };
}

function resolveSelectedAgentId(
  agents: QwenPawAgentSummary[],
  preferredAgentId: string | null,
): string | null {
  const enabledAgents = agents.filter((agent) => agent.enabled);
  const candidates = enabledAgents.length > 0 ? enabledAgents : agents;

  if (candidates.length === 0) {
    return null;
  }

  if (preferredAgentId && candidates.some((agent) => agent.id === preferredAgentId)) {
    return preferredAgentId;
  }

  return candidates[0].id;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unknown agent loading error.';
}
