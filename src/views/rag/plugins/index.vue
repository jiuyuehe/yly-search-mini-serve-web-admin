<template>
  <ContentWrap>
    <!-- 操作工具栏 -->
    <div class="mb-10px">
      <el-button @click="handleRefresh">
        <Icon icon="ep:refresh" class="mr-5px" />
        刷新
      </el-button>
    </div>

    <!-- 空数据状态 -->
    <el-empty v-if="pluginList.length === 0 && !loading" description="暂无插件数据" />

    <!-- 插件卡片列表 -->
    <div v-else class="plugin-list" v-loading="loading">
      <div class="plugin-item" v-for="plugin in pluginList" :key="plugin.code">
        <!-- 已启用状态标记 -->
        <div v-if="plugin.status === 0" class="status-flag">
          <span>已启用</span>
        </div>
        
        <div class="plugin-info">
          <img :src="getPluginIconUrl(plugin.code || 'default')" class="plugin-icon"/>
          <div class="plugin-name">{{ plugin.name }}</div>
        </div>

        <!-- 描述 -->
        <div class="plugin-desc">{{ plugin.description }}</div>

        <div class="plugin-label">集成对接</div>

        <div class="plugin-action">
          <el-button type="primary" link @click="handleConfig(plugin)">
            <Icon icon="ep:setting" class="mr-5px" />
            配置
          </el-button>
          <el-button 
            type="danger" 
            link
            @click="handleDisable(plugin)"
            v-if="plugin.status === 0"
          >
            <Icon icon="ep:video-pause" class="mr-5px" />
            禁用
          </el-button>
          <el-button
            type="success"
            link
            @click="handleEnable(plugin)"
            v-else
          >
            <Icon icon="ep:check" class="mr-5px" />
            启用
          </el-button>
          <el-button 
            type="primary"
            link
            @click="handleJump(plugin)"
            v-if="plugin.status === 0" 
          >
            <Icon icon="ep:link" class="mr-5px" />
            跳转
          </el-button>

          <el-button
            type="primary"
            link
            @click="reConnect(plugin)"
            v-if="plugin.code === 'elasticsearch' || plugin.code === 'kafka' "
          >
            <Icon icon="ep:link" class="mr-5px" />
            重连
          </el-button>

        </div>
      </div>
    </div>

    <!-- 配置弹窗 -->
    <PluginsConfigForm ref="formRef" @success="getPluginsList" />
  </ContentWrap>
</template>

<script setup lang="ts">
import { PluginsConfigApi, PluginsConfigVO } from '@/api/rag/pluginsconfig'
import { useMessage } from '@/hooks/web/useMessage'
import { onMounted, ref } from 'vue'
import PluginsConfigForm from './PluginsConfigForm.vue'

defineOptions({ name: 'PluginsConfig' })

const message = useMessage()
const loading = ref(false)
const pluginList = ref<PluginsConfigVO[]>([])
const formRef = ref()

// 获取插件图标URL
const getPluginIconUrl = (code: string) => {
  return `/resource/img/plugins/${code}.png`
}

/**
 * 重新连接
 */
const reConnect = async (plugin: PluginsConfigVO) => {
  loading.value = true
  try {
    if(plugin.code === 'elasticsearch') {
      await PluginsConfigApi.reConnectElasticsearch()
    } else if (plugin.code === 'kafka') {
     // await PluginsConfigApi.reConnectKafka(plugin)
      message.error('还未实现')
      return
    } else {
      message.error('不支持的插件类型')
      return
    }
   // await PluginsConfigApi.reInit()
    //pluginList.value = res
    message.success('重连成功')
  } catch (err) {
    console.error('重连失败:', err)
    message.error('重连失败')
  } finally {
    loading.value = false
  }
}

// 获取插件列表
const getPluginsList = async () => {
  loading.value = true
  try {
    const res = await PluginsConfigApi.getPluginsConfigList()
    pluginList.value = res
  } catch(err) {
    console.error('获取插件列表失败:', err)
    message.error('获取插件列表失败')
  } finally {
    loading.value = false
  }
}

// 刷新列表
const handleRefresh = () => {
  getPluginsList()
}

// 配置插件
const handleConfig = (plugin: PluginsConfigVO) => {
  formRef.value.open(plugin)
}

// 跳转访问
const handleJump = async (plugin: PluginsConfigVO) => {
  try {
    let url = ''
    if(plugin.code === 'elasticsearch' || plugin.code === 'dify') {
      url = 'http://' + `${plugin.host}${plugin.path}`
    } else if (plugin.code === 'kkfile' || plugin.code === 'kibana' || plugin.code === 'ollama') {
      url = `http://${plugin.host}:${plugin.port}${plugin.path}`
    } else {
      url = plugin.url || ''
    }
    
    if (url) {
      window.open(url, '_blank')
    } else {
      message.error('无效的URL')
    }
  } catch (err) {
    console.error('跳转失败:', err) 
    message.error('跳转失败，当前服务地址可能不存在，若有疑问，请联系管理员处理！')
  }
}

// 禁用插件
const handleDisable = async (plugin: PluginsConfigVO) => {
  try {
    await PluginsConfigApi.updatePluginsConfig({
      code: plugin.code,
      status: 1
    })
    message.success('禁用成功')
    getPluginsList()
  } catch(err) {
    console.error('禁用失败:', err)
    message.error('禁用失败')  
  }
}

// 启用插件
const handleEnable = async (plugin: PluginsConfigVO) => {
  try {
    await PluginsConfigApi.updatePluginsConfig({
      code: plugin.code,
      status: 0
    })
    message.success('启用成功')
    getPluginsList()
  } catch(err) {
    console.error('启用失败:', err)
    message.error('启用失败')
  }
}

// 初始化
onMounted(() => {
  getPluginsList()
})
</script>

<style lang="scss" scoped>
.plugin-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  padding: 8px 0;
}

.plugin-item {
  position: relative;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 3%);
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 3px 6px -2px rgb(0 0 0 / 8%);
  }
}

.status-flag {
  position: absolute;
  top: 0;
  right: -12px;
  width: 80px;
  height: 80px;
  overflow: hidden;
  
  span {
    position: absolute;
    top: 13px;
    right: -5px;
    padding: 2px 15px;
    font-size: 12px;
    color: #fff;
    background: #67c23a;
    transform: rotate(45deg);
    box-shadow: 0 2px 4px rgb(0 0 0 / 10%);
    transform-origin: center;
  }
}

.plugin-info {
  padding: 24px 0 12px;
  text-align: center;

  .plugin-icon {
    width: 56px;
    height: 56px;
    margin-bottom: 8px;
  }

  .plugin-name {
    font-size: 15px;
    font-weight: 500;
    color: #333;
  }
}

.plugin-desc {
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

.plugin-label {
  position: relative;
  left: 50%;
  display: inline-block;
  width: fit-content;
  height: 22px;
  padding: 0 8px;
  margin: 12px auto 8px;
  font-size: 12px;
  line-height: 20px;
  color: #666;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 2px;
  transform: translateX(-50%);
}

.plugin-action {
  padding: 12px 16px;
  text-align: left;
  border-top: 1px solid #f0f0f0;
}

.mb-10px {
  margin-bottom: 10px;
}

.mr-5px {
  margin-right: 5px;
}
</style>
