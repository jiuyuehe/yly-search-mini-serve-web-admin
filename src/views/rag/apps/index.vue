<template>
  <ContentWrap>
    <!-- 操作工具栏 -->
    <div class="toolbar">
      <el-button @click="handleRefresh">
        <Icon icon="ep:refresh" class="mr-5px" />
        刷新
      </el-button>
    </div>

    <!-- 空数据状态 -->
    <el-empty v-if="appsList.length === 0 && !loading" description="暂无应用数据" />

    <!-- 插件卡片列表 -->
    <div v-else class="apps-list" v-loading="loading">
      <!-- 应用列表 -->
      <div class="apps-item" v-for="app in appsList" :key="app.appCode">
        <!-- 已启用状态标记 - 移到左上角 -->
        <div v-if="app.status === true" class="status-flag status-flag-left">
          <span>已启用</span>
        </div>
        
        <!-- 删除按钮 -->
        <div class="delete-btn" @click.stop="handleDelete(app)">
          <Icon icon="ep:delete" />
        </div>
        
        <div class="apps-info">
          <img :src="getAppsIconUrl(app)" class="apps-icon"/>
          <div class="apps-name">{{ app.appName }}</div>
        </div>

        <!-- 描述 -->
        <div class="apps-desc">{{ app.appDescription }}</div>

        <div class="apps-action">
          <!-- 配置按钮放在左侧 -->
          <el-button type="primary" link @click="handleConfig(app)">
            <Icon icon="ep:setting" class="mr-5px" />
            配置服务
          </el-button>
          
          <!-- 启用/禁用按钮放在右侧 -->
          <div class="action-right">
            <el-button 
              type="danger" 
              link
              @click="handleDisable(app)"
              v-if="app.status === true"
            >
              <Icon icon="ep:video-pause" class="mr-5px" />
              禁用
            </el-button>
            <el-button
              type="success"
              link
              @click="handleEnable(app)"
              v-else
            >
              <Icon icon="ep:check" class="mr-5px" />
              启用
            </el-button>
          </div>
        </div>
      </div>
      
      <!-- 添加应用卡片 -->
      <div class="apps-item add-app-item" @click="handleAddApp">
        <div class="add-icon">
          <Icon icon="ep:plus" />
        </div>
      </div>
    </div>

    <!-- 配置弹窗 -->
    <AppsForm ref="formRef" @success="getAppsList" />
  </ContentWrap>
</template>

<script setup lang="ts">
import { RagAppsApi, RagAppsVO } from '@/api/rag/apps'
import { useMessage } from '@/hooks/web/useMessage'
import { onMounted, ref } from 'vue'
import AppsForm from './AppsForm.vue'

defineOptions({ name: 'Apps' })

const message = useMessage()
const loading = ref(false)
const appsList = ref<RagAppsVO[]>([])
const formRef = ref()

// 获取插件图标URL
const getAppsIconUrl = (app) => {
  // 如果app有icon属性，优先使用
  if (app.icon) {
    return app.icon;
  }
  // 后备方案，使用默认路径和时间戳避免缓存
  const timestamp = Date.now();
  return `/resource/img/apps/${app.appCode || 'default'}.png?t=${timestamp}`;
}

// 获取插件列表
const getAppsList = async () => {
  loading.value = true
  try {
    const res = await RagAppsApi.getRagAppsPage({})
    appsList.value = res.list
  } catch(err) {
    console.error('获取应用列表失败:', err)
    message.error('获取应用列表失败')
  } finally {
    loading.value = false
  }
}

// 刷新列表
const handleRefresh = () => {
  getAppsList()
}

// 添加新应用
const handleAddApp = () => {
  formRef.value.open(null, true)
}

// 配置插件
const handleConfig = (app: RagAppsVO) => {
  formRef.value.open(app, false)
}

// 禁用插件
const handleDisable = async (app: RagAppsVO) => {
  try {
    await RagAppsApi.updateRagApps(
      {
        ...app,
        status: false
      }
    )
    message.success('禁用成功')
    getAppsList()
  } catch(err) {
    console.error('禁用失败:', err)
    message.error('禁用失败')  
  }
}

// 启用插件
const handleEnable = async (app: RagAppsVO) => {
  try {
    await RagAppsApi.updateRagApps({
      ...app,
      status: true
    })
    message.success('启用成功')
    getAppsList()
  } catch(err) {
    console.error('启用失败:', err)
    message.error('启用失败')
  }
}

// 删除应用
const handleDelete = async (app: RagAppsVO) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除应用 "${app.appName}" 吗？删除后无法恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await RagAppsApi.deleteRagApps(app.id)
    message.success('删除成功')
    getAppsList()
  } catch(err) {
    if (err !== 'cancel') {
      console.error('删除失败:', err)
      message.error('删除失败')
    }
  }
}

// 初始化
onMounted(() => {
  getAppsList()
})
</script>

<style lang="scss" scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.apps-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  padding: 8px 0;
}

.apps-item {
  position: relative;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 3%);
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 3px 6px -2px rgb(0 0 0 / 8%);
    
    .delete-btn {
      opacity: 1;
    }
  }
}

.add-app-item {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  cursor: pointer;
  
  &:hover {
    border-color: #409eff;
    
    .add-icon {
      color: #409eff;
      transform: scale(1.1);
    }
  }
  
  .add-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    font-size: 60px;
    color: #909399;
    transition: all 0.3s;
  }
}

.status-flag {
  position: absolute;
  z-index: 1;
  width: 80px;
  height: 80px;
  overflow: hidden;
  
  span {
    position: absolute;
    padding: 2px 15px;
    font-size: 12px;
    color: #fff;
    background: #67c23a;
    box-shadow: 0 2px 4px rgb(0 0 0 / 10%);
    transform-origin: center;
  }
}

.status-flag-left {
  top: 0;
  left: -12px;
  
  span {
    top: 13px;
    left: -5px;
    transform: rotate(-45deg);
  }
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  width: 24px;
  height: 24px;
  color: #f56c6c;
  cursor: pointer;
  background: rgb(255 255 255 / 80%);
  border-radius: 50%;
  opacity: 0;
  transition: all 0.2s;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: #fff;
    box-shadow: 0 2px 6px rgb(0 0 0 / 10%);
  }
}

.apps-info {
  padding: 24px 0 12px;
  text-align: center;

  .apps-icon {
    width: 56px;
    height: 56px;
    margin-bottom: 8px;
  }

  .apps-name {
    font-size: 15px;
    font-weight: 500;
    color: #333;
  }
}

.apps-desc {
  display: -webkit-box;
  height: 44px;
  padding: 0 16px;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.6;
  color: #666;
  text-align: center;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* 已移除 apps-label 相关样式 */

.apps-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  text-align: left;
  border-top: 1px solid #f0f0f0;
  
  .action-right {
    text-align: right;
  }
}

.mb-10px {
  margin-bottom: 10px;
}

.mr-5px {
  margin-right: 5px;
}
</style>