<template>
  <div class="graph-page">
    <ContentWrap>
      <div class="page-head">
        <div>
          <div class="breadcrumb">首页 / 数据图谱 / <span>{{ title }}</span></div>
          <div class="page-title">{{ title }}</div>
          <div class="page-subtitle">
            基于 {{ sceneLabel }} 内置模型结果投影生成，真实数据为空时自动展示 demo 图谱。
          </div>
        </div>
        <div class="head-actions">
          <el-input v-model="keyword" class="!w-240px" clearable placeholder="搜索节点" @keyup.enter="loadGraph" />
          <el-button type="primary" @click="loadGraph"><Icon icon="ep:search" class="mr-5px" />查询</el-button>
          <el-button @click="reset"><Icon icon="ep:refresh" class="mr-5px" />刷新</el-button>
        </div>
      </div>
    </ContentWrap>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">节点数</div>
        <div class="kpi-value">{{ graph.nodes.length }}</div>
        <div class="kpi-delta">模型实体</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">关系数</div>
        <div class="kpi-value">{{ graph.edges.length }}</div>
        <div class="kpi-delta">投影边</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">来源文件</div>
        <div class="kpi-value">{{ graph.sourceFiles?.length || 0 }}</div>
        <div class="kpi-delta">sourceEsId</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">数据模式</div>
        <div class="kpi-value">{{ graph.demo ? 'Demo' : '真实' }}</div>
        <div class="kpi-delta">{{ graph.demo ? '空数据兜底' : 'ES 结果投影' }}</div>
      </div>
    </div>

    <div class="graph-layout">
      <ContentWrap class="graph-canvas-wrap">
        <template #header>关系网络</template>
        <div v-loading="loading" class="graph-canvas">
          <svg class="graph-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line
              v-for="edge in graph.edges"
              :key="edge.id || `${edge.source}-${edge.target}`"
              :x1="nodePosition(edge.source).x"
              :y1="nodePosition(edge.source).y"
              :x2="nodePosition(edge.target).x"
              :y2="nodePosition(edge.target).y"
            />
          </svg>
          <button
            v-for="node in positionedNodes"
            :key="node.id"
            class="graph-node"
            :class="node.type"
            :style="{ left: `${node.x}%`, top: `${node.y}%` }"
            type="button"
            @click="openNode(node)"
          >
            <span>{{ node.label }}</span>
            <b>{{ node.type }}</b>
          </button>
          <el-empty v-if="!loading && !graph.nodes.length" description="暂无图谱数据" />
        </div>
      </ContentWrap>

      <ContentWrap class="side-panel">
        <template #header>来源与节点</template>
        <el-table :data="graph.nodes" height="420" class="dense-table">
          <el-table-column label="节点" prop="label" min-width="150" show-overflow-tooltip />
          <el-table-column label="类型" prop="type" width="110" />
          <el-table-column label="来源" prop="sourceEsId" min-width="150" show-overflow-tooltip />
          <el-table-column label="操作" width="90">
            <template #default="{ row }">
              <el-button link type="primary" @click="openNode(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </ContentWrap>
    </div>

    <Dialog title="节点详情" v-model="detailVisible" width="720px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="节点">{{ currentNode?.label }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ currentNode?.type }}</el-descriptions-item>
        <el-descriptions-item label="来源模型">{{ currentNode?.sourceModelName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="来源文件">
          <span>{{ traceData?.sourceFile?.fileName || currentNode?.sourceEsId || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="来源结果">{{ currentNode?.sourceResultId || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-table
        v-if="traceData?.personProfiles?.length"
        :data="traceData.personProfiles"
        border
        class="!mt-16px"
      >
        <el-table-column label="人物档案" prop="personName" min-width="140" />
        <el-table-column label="别名" prop="aliasNames" min-width="160" show-overflow-tooltip />
        <el-table-column label="溯源数" prop="evidenceCount" width="90" />
      </el-table>
      <div class="detail-actions">
        <el-button
          :disabled="!currentNode?.sourceEsId"
          @click="router.push({ path: '/rag/ai-result', query: { taskType: 'summary', esId: currentNode?.sourceEsId } })"
        >
          查看来源文件
        </el-button>
        <el-button
          v-if="props.scene !== 'person'"
          @click="router.push({ path: '/data-catalog/graph/person', query: { keyword: currentNode?.label } })"
        >
          跳转人物画像
        </el-button>
        <el-button
          v-else
          type="success"
          @click="router.push({ path: '/data-governance/graph/person-profile', query: { personName: currentNode?.label } })"
        >
          查看人物档案
        </el-button>
        <el-button
          v-if="currentNode?.sourceModelId"
          type="primary"
          @click="router.push({ path: '/data-catalog/metadata/models/detail', query: { id: currentNode.sourceModelId } })"
        >
          查看数据模型详情
        </el-button>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { MetadataApi, GraphSourceTraceVO, MetadataGraphVO } from '@/api/rag/metadata'

const props = defineProps<{
  scene: string
  title: string
  sceneLabel: string
}>()

defineOptions({ name: 'MetadataGraphPage' })

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const keyword = ref('')
const detailVisible = ref(false)
const currentNode = ref<any>()
const traceData = ref<GraphSourceTraceVO>()
const graph = reactive<MetadataGraphVO>({ scene: props.scene, nodes: [], edges: [], sourceFiles: [] })

const positionedNodes = computed(() => {
  const total = Math.max(graph.nodes.length, 1)
  return graph.nodes.map((node, index) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2
    const radius = total <= 3 ? 28 : 36
    return {
      ...node,
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle)
    }
  })
})

const positionMap = computed(() => {
  const map: Record<string, { x: number; y: number }> = {}
  positionedNodes.value.forEach((node) => {
    map[node.id] = { x: node.x, y: node.y }
  })
  return map
})

const nodePosition = (id: string) => positionMap.value[id] || { x: 50, y: 50 }

const loadGraph = async () => {
  loading.value = true
  try {
    const data = await MetadataApi.getMetadataGraph(props.scene, { keyword: keyword.value || undefined })
    graph.scene = data.scene
    graph.demo = data.demo
    graph.nodes = data.nodes || []
    graph.edges = data.edges || []
    graph.sourceFiles = data.sourceFiles || []
    graph.nodeCount = data.nodeCount
    graph.edgeCount = data.edgeCount
  } finally {
    loading.value = false
  }
}

const reset = () => {
  keyword.value = ''
  loadGraph()
}

const openNode = (node: any) => {
  currentNode.value = node
  detailVisible.value = true
  loadTrace(node)
}

const loadTrace = async (node: any) => {
  traceData.value = await MetadataApi.getGraphSourceTrace({
    scene: props.scene,
    sourceEsId: node?.sourceEsId,
    nodeLabel: node?.label
  })
}

onMounted(() => {
  if (route.query.keyword) {
    keyword.value = String(route.query.keyword)
  }
  loadGraph()
})
</script>

<style scoped>
.graph-page { display: flex; flex-direction: column; gap: 12px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.breadcrumb { color: #667085; }
.breadcrumb span { color: #1f6fff; font-weight: 600; }
.page-title { margin-top: 8px; font-size: 22px; font-weight: 800; color: #101828; }
.page-subtitle { margin-top: 6px; color: #667085; }
.head-actions { display: flex; align-items: center; gap: 8px; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kpi-card { padding: 18px; background: #fff; border: 1px solid #e6ebf2; border-radius: 6px; }
.kpi-label { color: #344054; }
.kpi-value { margin-top: 12px; font-size: 27px; font-weight: 800; color: #101828; }
.kpi-delta { margin-top: 10px; color: #12a666; }
.graph-layout { display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 12px; }
.graph-canvas-wrap :deep(.el-card__body) { padding: 0; }
.graph-canvas { position: relative; height: 560px; overflow: hidden; background: linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%); border-radius: 0 0 6px 6px; }
.graph-lines { position: absolute; inset: 0; width: 100%; height: 100%; }
.graph-lines line { stroke: #6aa1ff; stroke-width: 0.22; opacity: 0.75; }
.graph-node {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 142px;
  min-height: 62px;
  padding: 9px 10px;
  border: 1px solid #9ec5ff;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 26px rgba(31, 111, 255, 0.14);
  color: #101828;
  cursor: pointer;
}
.graph-node span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 800; }
.graph-node b { display: block; margin-top: 6px; color: #1f6fff; font-size: 12px; font-weight: 600; }
.graph-node.source { border-color: #9ee5d1; }
.graph-node.mail { border-color: #f8c471; }
.graph-node.person, .graph-node.sender, .graph-node.recipient { border-color: #b7a7ff; }
.side-panel :deep(.el-card__body) { padding-top: 8px; }
.detail-actions { margin-top: 16px; display: flex; justify-content: flex-end; }
@media (max-width: 1200px) { .graph-layout, .kpi-grid { grid-template-columns: 1fr 1fr; } .side-panel { grid-column: 1 / -1; } }
@media (max-width: 768px) {
  .page-head, .head-actions { align-items: flex-start; flex-direction: column; }
  .graph-layout, .kpi-grid { grid-template-columns: 1fr; }
}
</style>
