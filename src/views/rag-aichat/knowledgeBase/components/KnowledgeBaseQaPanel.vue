<template>
  <div class="qa-panel">
    <ChatPage
      v-if="datasetId"
      :fixed-dataset-id="datasetId"
      :fixed-knowledge-base-label="datasetName"
      :show-knowledge-base-selector="false"
      :hide-session-list="true"
      :allow-session-sidebar-toggle="false"
      :use-route-dataset-id="false"
    />
  </div>
</template>

<script setup lang="ts">
import ChatPage from '@/views/rag-aichat/chat/ChatPage.vue'

defineOptions({ name: 'RagAiKnowledgeBaseQaPanel' })

defineProps({
  datasetId: { type: [String, Number], default: '' },
  datasetName: { type: String, default: '' }
})
</script>

<style scoped>
.qa-panel {
  height: 100%;
  min-height: 0;
}
</style>
