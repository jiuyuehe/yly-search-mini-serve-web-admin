<template>
  <div class="governance-page graph-home">
    <ContentWrap>
      <div class="governance-page-head">
        <div>
          <div class="governance-breadcrumb">首页 / AI 数据智能治理 / <span>图谱分析</span></div>
          <div class="governance-page-title">图谱分析工作台</div>
          <div class="governance-page-subtitle">NER 图谱、邮件图谱和人物画像不是三套重复入口，而是同一条实体关系分析链路的三个视角。</div>
        </div>
      </div>
    </ContentWrap>

    <div class="graph-entry-grid">
      <ContentWrap v-for="item in entries" :key="item.path" class="graph-entry">
        <div class="entry-head">
          <Icon :icon="item.icon" class="entry-icon" />
          <div>
            <div class="entry-title">{{ item.title }}</div>
            <div class="entry-subtitle">{{ item.subtitle }}</div>
          </div>
        </div>
        <div class="entry-desc">{{ item.desc }}</div>
        <el-button type="primary" plain @click="router.push(item.path)">进入</el-button>
      </ContentWrap>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
defineOptions({ name: 'RagGraph' })

const entries = [
  {
    title: 'NER 实体图谱',
    subtitle: '文档内实体与关系抽取',
    desc: '从 NER 缓存构建人物、地点、组织、事件等实体关系，适合查看单文档或范围内的结构化关系。',
    icon: 'ep:connection',
    path: '/data-governance/graph/ner'
  },
  {
    title: '邮件图谱',
    subtitle: '复用邮件分析业务页',
    desc: '邮件图谱与邮件分析是同一个成熟业务场景，图谱入口直接复用邮件分析页面，避免两套页面割裂。',
    icon: 'ep:message',
    path: '/data-governance/graph/mail'
  },
  {
    title: '人物画像',
    subtitle: 'NER 结果沉淀的人物档案',
    desc: '人物画像是 NER 图谱后的治理结果视角，用于档案合并、冲突确认和人物共现回看。',
    icon: 'ep:user',
    path: '/data-governance/graph/person-profile'
  }
]
</script>

<style scoped>
.graph-home {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.graph-entry-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.graph-entry {
  min-height: 220px;
}

.entry-head {
  display: flex;
  gap: 12px;
  align-items: center;
}

.entry-icon {
  width: 38px;
  height: 38px;
  padding: 8px;
  border-radius: 8px;
  color: #1f6fff;
  background: #eef5ff;
}

.entry-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.entry-subtitle {
  margin-top: 4px;
  color: #64748b;
}

.entry-desc {
  min-height: 72px;
  margin: 18px 0;
  line-height: 1.7;
  color: #475569;
}

@media (max-width: 1200px) {
  .graph-entry-grid {
    grid-template-columns: 1fr;
  }
}
</style>
