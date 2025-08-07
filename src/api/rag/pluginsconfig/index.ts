import request from '@/config/axios'

export interface PluginsConfigVO {
  id?: number
  code: string
  name: string
  description: string
  status: number
  url?: string
  path?: string
  host?: string
  port?: string
  secret?: string
  spare?: string
}

// 插件配置API
export const PluginsConfigApi = {

  //重新连接服务

  reConnectElasticsearch : async () => {
    return await request.get({ url: '/rag/es-index/re-init' })
  },


  // 查询插件配置列表
  getPluginsConfigList: async () => {
    return await request.get({ url: '/yly/plugins-config/list' })
  },

  // 查询插件配置详情
  getPluginsConfig: async (id: number) => {
    return await request.get({ url: `/yly/plugins-config/get?id=${id}` })
  },

  // 新增插件配置
  createPluginsConfig: async (data: any) => {
    return await request.post({ url: '/yly/plugins-config/create', data })
  },

  // 修改插件配置
  updatePluginsConfig: async (data: any) => {
    return await request.put({ url: '/yly/plugins-config/update', data })
  },

  // 删除插件配置
  deletePluginsConfig: async (type: string) => {
    return await request.delete({ url: `/yly/plugins-config/delete?type=${type}` })
  }
}
