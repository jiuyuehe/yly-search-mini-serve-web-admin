import request from '@/config/axios'

// 应用配置 VO
export interface RagAppsVO {
  id: number // 主键
  appKey: string // App唯一标识
  appName: string // App名称
  appCode: string // App唯一代码
  appDescription: string // App描述
  // appType: string // App类型/分类
  apiConfig: string // API配置信息(JSON格式)
  icon: string // App图标路径
  sortOrder: number // 显示排序
  status: boolean // 状态 0:启用 1:禁用
}

// 应用配置 API
export const RagAppsApi = {
  // 查询应用配置分页
  getRagAppsPage: async (params: any) => {
    return await request.get({ url: `/yly/rag-apps/page`, params })
  },

  // 查询应用配置详情
  getRagApps: async (id: number) => {
    return await request.get({ url: `/yly/rag-apps/get?id=` + id })
  },

  // 新增应用配置
  createRagApps: async (data: RagAppsVO) => {
    return await request.post({ url: `/yly/rag-apps/create`, data })
  },

  // 修改应用配置
  updateRagApps: async (data: RagAppsVO) => {
    return await request.put({ url: `/yly/rag-apps/update`, data })
  },

  // 删除应用配置
  deleteRagApps: async (id: number) => {
    return await request.delete({ url: `/yly/rag-apps/delete?id=` + id })
  },

  // 导出应用配置 Excel
  exportRagApps: async (params) => {
    return await request.download({ url: `/yly/rag-apps/export-excel`, params })
  },
}
