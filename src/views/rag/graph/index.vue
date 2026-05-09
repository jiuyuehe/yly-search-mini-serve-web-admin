<template>
  <ContentWrap>
    <template #header>图谱生成管理</template>
    <el-alert title="请选择左侧菜单中的 NER 图谱或邮件图谱进入具体工作台。" type="info" show-icon :closable="false" />
  </ContentWrap>
</template>

<script setup lang="ts">
defineOptions({ name: 'RagGraph' })
</script>
