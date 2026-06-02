<template>
  <div class="kb-workspace">
    <div class="kb-workspace-toolbar">
      <div class="kb-workspace-info">
        <el-breadcrumb class="kb-breadcrumb" separator="/">
          <el-breadcrumb-item>
            <button class="kb-breadcrumb-link" @click="emit('switch-docs')">文档管理</button>
          </el-breadcrumb-item>
          <el-breadcrumb-item>管理知识库</el-breadcrumb-item>/ {{ datasetTitle }}
        </el-breadcrumb>
      </div>
    </div>

    <div v-if="datasetId" class="kb-workspace-content">
      <el-tabs v-model="activeTab" class="kb-tabs">
        <el-tab-pane label="知识问答" name="qa">
          <div class="tab-panel">
            <KnowledgeBaseQaPanel
              class="tab-panel-content"
              :dataset-id="datasetId"
              :dataset-name="datasetTitle"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="文档管理" name="doc">
          <div class="tab-panel">
            <KnowledgeBaseDocManagePanel class="tab-panel-content" :dataset-id="datasetId" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="模型设置" name="model">
          <div class="tab-panel">
            <ModelSettingPanel
              class="tab-panel-content"
              v-if="datasetId"
              :dataset-id="datasetId"
              @saved="handleModelSaved"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="成员管理" name="member">
          <div class="tab-panel">
            <MemberManagerPanel
              class="tab-panel-content"
              v-if="datasetId"
              :dataset-id="datasetId"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-empty v-else description="请选择左侧知识库开始管理" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PropType } from 'vue'

import KnowledgeBaseDocManagePanel from './KnowledgeBaseDocManagePanel.vue'
import KnowledgeBaseQaPanel from './KnowledgeBaseQaPanel.vue'
import ModelSettingPanel from './ModelSettingPanel.vue'
import MemberManagerPanel from './MemberManagerPanel.vue'

defineOptions({ name: 'RagAiKnowledgeBaseWorkspace' })

const props = defineProps({
  datasetId: { type: [String, Number], default: '' },
  dataset: {
    type: Object as PropType<Record<string, any> | null>,
    default: null
  }
})

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'switch-docs'): void
  (e: 'saved', payload: Record<string, any>): void
}>()

const activeTab = ref<'qa' | 'doc' | 'model' | 'member'>('qa')

const datasetTitle = computed(() => {
  return props.dataset?.dataset_name || props.dataset?.name || '请选择知识库开始管理'
})

const handleModelSaved = (payload: Record<string, any>) => {
  emit('saved', payload)
}

watch(
  () => props.datasetId,
  () => {
    activeTab.value = 'qa'
  },
  { immediate: true }
)
</script>

<style scoped>
.kb-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--app-bg-page);
}

.kb-workspace-toolbar {
  display: flex;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid var(--app-border-color);
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.kb-workspace-info {
  min-width: 0;
}

.kb-breadcrumb {
  margin-bottom: 8px;
}

.kb-breadcrumb-link {
  padding: 0;
  line-height: 1;
  color: var(--el-color-primary);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.kb-breadcrumb-link:hover {
  color: var(--el-color-primary-light-3);
}

.kb-workspace-title {
  font-size: 18px;
  font-weight: 600;
}

.kb-workspace-content {
  display: flex;
  flex: 1;
  min-height: 0;
  padding: 0 16px 16px;
  overflow: hidden;
  flex-direction: column;
}

.kb-tabs {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.tab-panel {
  display: flex;
  height: 100%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  flex-direction: column;
}

.tab-panel-content {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

:deep(.el-tabs__content) {
  display: flex;
  flex: 1;
  height: 100%;
  min-height: 0;
}

:deep(.el-tab-pane) {
  display: flex;
  height: 100%;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}
</style>
