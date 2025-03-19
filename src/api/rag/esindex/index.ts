import request from '@/config/axios'

// ES索引管理 VO
export interface EsIndexVO {
  id: number // 主键ID
  indexName: string // ES索引名称
  indexType: string // 索引类型
  indexDesc: string // 索引描述
  mappingJson: string // Mapping配置JSON
  status: boolean // 状态 1:启用 0:禁用
  createdTime: Date // 创建时间
  updatedTime: Date // 更新时间
}

// ES索引管理 API
export const EsIndexApi = {
  // 查询ES索引管理分页
  getEsIndexPage: async (params: any) => {
    return await request.get({ url: `/rag/es-index/page`, params })
  },

  // 查询ES索引管理详情
  getEsIndex: async (id: number) => {
    return await request.get({ url: `/rag/es-index/get?id=` + id })
  },

  listEsIndexNames: async () => {
    return await request.get({ url: `/rag/es-index/list-names` })
  },

  // 新增ES索引管理
  createEsIndex: async (data: EsIndexVO) => {
    return await request.post({ url: `/rag/es-index/create`, data })
  },

  // 修改ES索引管理
  updateEsIndex: async (data: EsIndexVO) => {
    return await request.put({ url: `/rag/es-index/update`, data })
  },

  // 删除ES索引管理
  deleteEsIndex: async (id: number) => {
    return await request.delete({ url: `/rag/es-index/delete?id=` + id })
  },

  // 导出ES索引管理 Excel
  exportEsIndex: async (params) => {
    return await request.download({ url: `/rag/es-index/export-excel`, params })
  },
}
