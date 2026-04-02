import request from '@/config/axios'

// 存储介质 VO
export interface StorageMediumVO {
  id: number // 主键ID
  mediumName: string // 存储介质名称
  mediumType: string // 存储介质类型：MYSQL/NAS
  mediumDesc: string // 存储介质描述
  configJson: string // 配置JSON，不同类型的介质会有不同的配置内容
  status: number | boolean // 状态 1:启用 0:禁用
  mountStatus?: number
  mountPath?: string
}

export interface StorageMediumNasCheckReqVO {
  nasId?: string
}

// 存储介质 API
export const StorageMediumApi = {
  // 查询存储介质分页
  getStorageMediumPage: async (params: any) => {
    return await request.get({ url: `/rag/storage-medium/page`, params })
  },

  // 查询存储介质详情
  getStorageMedium: async (id: number) => {
    return await request.get({ url: `/rag/storage-medium/get?id=` + id })
  },

  listStorageMediumNames: async () => {
    return await request.get({ url: `/rag/storage-medium/list-names` })
  },

  // 新增存储介质
  createStorageMedium: async (data: StorageMediumVO) => {
    return await request.post({ url: `/rag/storage-medium/create`, data })
  },

  // 修改存储介质
  updateStorageMedium: async (data: StorageMediumVO) => {
    return await request.put({ url: `/rag/storage-medium/update`, data })
  },

  // 删除存储介质
  deleteStorageMedium: async (id: number) => {
    return await request.delete({ url: `/rag/storage-medium/delete?id=` + id })
  },

  testDatabaseConnection: async (data: any) => {
    return await request.post({ url: `/rag/storage-medium/test-database-connection`, data })
  },

  testNasConnection: async (data: StorageMediumNasCheckReqVO) => {
    return await request.post({ url: `/rag/storage-medium/test-nas-mouthpath`, data })
  },

  // 导出存储介质 Excel
  exportStorageMedium: async (params) => {
    return await request.download({ url: `/rag/storage-medium/export-excel`, params })
  },
}
