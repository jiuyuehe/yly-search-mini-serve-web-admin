import request from '@/config/axios'

export type WhitelistType = 'APP_KEY' | 'IP' | 'DOMAIN'

export interface WhitelistVO {
  id: number
  whitelistType: WhitelistType
  whitelistValue: string
  whitelistName?: string
  whitelistStatus: number
  createTime: string
  updateTime?: string
}

export interface WhitelistPageReqVO {
  pageNo: number
  pageSize: number
  whitelistType?: WhitelistType
  whitelistValue?: string
  whitelistName?: string
  whitelistStatus?: number
}

// 分页查询白名单
export const getWhitelistPage = (params: WhitelistPageReqVO) => {
  return request.get<{ list: WhitelistVO[]; total: number }>({
    url: '/extends/whitelist/page',
    params
  })
}

// 获取白名单详情
export const getWhitelist = (id: number) => {
  return request.get<WhitelistVO>({ url: '/extends/whitelist/get', params: { id } })
}

// 创建白名单
export const createWhitelist = (data: Omit<WhitelistVO, 'id' | 'createTime' | 'updateTime'>) => {
  return request.post<number>({ url: '/extends/whitelist/create', data })
}

// 更新白名单
export const updateWhitelist = (data: WhitelistVO) => {
  return request.put<boolean>({ url: '/extends/whitelist/update', data })
}

// 删除白名单
export const deleteWhitelist = (id: number) => {
  return request.delete<boolean>({
    url: '/extends/whitelist/delete',
    params: { id }
  })
}



