<template>
  <div class="chat-page-wrapper">
    <ChatPage />
  </div>
</template>

<script setup lang="ts">
import ChatPage from './ChatPage.vue'

defineOptions({ name: 'RagAiChatIndex' })
</script>
<style scoped>
.chat-page-wrapper {
  width: calc(100% + var(--app-content-padding) * 2);
  height: calc(100vh - var(--top-tool-height) - var(--tags-view-height) - var(--app-footer-height));
  margin: calc(var(--app-content-padding) * -1);
  overflow: hidden;
}
</style>
