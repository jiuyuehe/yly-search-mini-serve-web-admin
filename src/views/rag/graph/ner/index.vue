<template>
  <div class="graph-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 图谱生成管理 / <span>NER 图谱</span></div>
          <div class="page-title">NER 实体关系图谱</div>
        </div>
        <el-button type="primary" @click="loadGraph">
          <Icon icon="ep:share" class="mr-5px" />
          生成图谱
        </el-button>
      </div>
    </ContentWrap>

    <el-row :gutter="12">
      <el-col :xs="24" :lg="6">
        <ContentWrap>
          <template #header>图谱筛选</template>
          <el-form label-width="80px">
            <el-form-item label="ESID">
              <el-input v-model="query.esId" clearable placeholder="请输入文档 esId" />
            </el-form-item>
            <el-form-item label="实体类型">
              <el-select v-model="query.type" class="!w-full" clearable>
                <el-option v-for="item in entityTypes" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-form>
        </ContentWrap>
      </el-col>

      <el-col :xs="24" :lg="12">
        <ContentWrap>
          <template #header>节点关系画布</template>
          <el-empty v-if="filteredNodes.length === 0" description="暂无图谱数据" />
          <div v-else class="graph-canvas">
            <div
              v-for="(node, index) in filteredNodes"
              :key="node.id"
              class="node"
              :class="'node-' + (index % 5)"
              @click="currentNode = node"
            >
              {{ node.label }}
              <span>{{ node.type }}</span>
            </div>
            <div class="edge-list">
              <div v-for="edge in graph.edges || []" :key="edge.source + edge.target" class="edge-item">
                {{ edge.source }} → {{ edge.target }}
              </div>
            </div>
          </div>
        </ContentWrap>
      </el-col>

      <el-col :xs="24" :lg="6">
        <ContentWrap>
          <template #header>实体详情</template>
          <el-empty v-if="!currentNode" description="请选择节点" />
          <el-descriptions v-else :column="1" border>
            <el-descriptions-item label="实体">{{ currentNode.label }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ currentNode.type }}</el-descriptions-item>
            <el-descriptions-item label="来源 ESID">{{ currentNode.sourceEsId }}</el-descriptions-item>
            <el-descriptions-item label="来源句子">{{ currentNode.sourceSentence || '-' }}</el-descriptions-item>
          </el-descriptions>
          <div class="detail-actions">
            <el-button type="primary" plain :disabled="!currentNode.sourceEsId" @click="goSourceFile(currentNode.sourceEsId)">
              <Icon icon="ep:connection" class="mr-5px" />
              跳转来源文件
            </el-button>
          </div>
        </ContentWrap>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { GraphApi } from '@/api/rag/graph'

defineOptions({ name: 'RagGraphNer' })

const message = useMessage()
const router = useRouter()
const query = reactive({ esId: '', type: '' })
const graph = ref<any>({ nodes: [], edges: [] })
const currentNode = ref<any>()
const entityTypes = computed<string[]>(() => Array.from(new Set((graph.value.nodes || []).map((item: any) => item.type).filter(Boolean))))
const filteredNodes = computed(() => {
  const nodes = graph.value.nodes || []
  return query.type ? nodes.filter((item: any) => item.type === query.type) : nodes
})

const loadGraph = async () => {
  if (!query.esId) {
    message.warning('请输入文档 esId')
    return
  }
  graph.value = await GraphApi.getNerGraph(query.esId)
  currentNode.value = graph.value.nodes?.[0]
}

const goSourceFile = (esId?: string) => {
  if (!esId) return
  router.push({ path: '/rag/ai-result', query: { taskType: 'ner', esId } })
}
</script>

<style scoped>
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 700; }
.graph-canvas { min-height: 520px; position: relative; padding: 24px; background: radial-gradient(circle at 50% 45%, #eef5ff 0, #f8fbff 45%, #fff 100%); border: 1px solid #e6ebf2; border-radius: 6px; overflow: hidden; }
.node { width: 118px; height: 72px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: absolute; border-radius: 6px; color: #fff; font-weight: 700; box-shadow: 0 10px 22px rgb(31 111 255 / 18%); cursor: pointer; }
.node span { margin-top: 4px; font-size: 12px; font-weight: 500; opacity: .86; }
.node-0 { left: 42%; top: 40%; background: #1f6fff; }
.node-1 { left: 12%; top: 16%; background: #12a666; }
.node-2 { right: 12%; top: 18%; background: #ff9f2f; }
.node-3 { left: 18%; bottom: 16%; background: #7a5af8; }
.node-4 { right: 18%; bottom: 14%; background: #f04438; }
.edge-list { position: absolute; left: 18px; bottom: 18px; right: 18px; display: grid; gap: 6px; color: #475467; font-size: 12px; }
.edge-item { padding: 6px 8px; background: rgb(255 255 255 / 82%); border: 1px solid #e6ebf2; border-radius: 4px; }
.detail-actions { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
