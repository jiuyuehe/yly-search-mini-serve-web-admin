import request from '@/config/axios'

export type NasType = 'admin' | 'individual' | 'public'
export type NasMountType = 'SMB2' | 'SMB3' | 'CIFS2' | 'CIFS3' | 'FTP' | 'NFS'

export interface NasVO {
  nasId: number
  nasCode: string
  nasName: string
  nasUrl: string
  nasAccount?: string
  nasPassword?: string
  attrText?: string
  localPath: string
  type: NasType
  mountType: NasMountType
  status: number
  isMounted: boolean
  updateTime?: string
}

export interface NasSaveReqVO {
  nasId?: number
  nasCode: string
  nasName: string
  nasUrl: string
  nasAccount?: string
  nasPassword?: string
  localPath?: string
  mountType: NasMountType
  attrText?: string
}

export interface NasPageReqVO {
  pageNo: number
  pageSize: number
  keyword?: string
  type?: NasType
}

export interface NasPermissionVO {
  id: number
  nasId: number
  status: number
  filePath: string
  perTargetType: number
  perTargetId: number
  perTargetName: string
  perType?: number
  folder?: boolean
  permissions?: number
  expireTime?: string
  mark?: string
  markType?: number
  attrs?: string
  createTime?: string
  updateTime?: string
}

export interface NasPermissionSaveReqVO {
  id?: number
  filePath: string
  perTargetType: number
  perTargetId: number
  perTargetName: string
  perType?: number
  folder?: boolean
  permissions?: number
  expireTime?: string
  mark?: string
  markType?: number
  attrs?: string
}

export const NasApi = {
  createAdminNas: async (data: NasSaveReqVO) => {
    return await request.post<number>({ url: '/apps/ad/nas/admin', data })
  },

  getAdminNasOptions: async () => {
    return await request.get<NasVO[]>({ url: '/apps/ad/nas/options' })
  },

  getNasPage: async (params: NasPageReqVO) => {
    return await request.get<{ list: NasVO[]; total: number }>({ url: '/apps/ad/nas/all', params })
  },

  getNasDetail: async (nasId: number) => {
    return await request.get<NasVO>({ url: `/apps/nas/all/${nasId}` })
  },

  updateNas: async (nasId: number, data: NasSaveReqVO) => {
    return await request.put<boolean>({ url: `/apps/nas/all/${nasId}`, data })
  },

  deleteNas: async (nasId: number) => {
    return await request.delete<boolean>({ url: `/apps/nas/all/${nasId}` })
  },

  mountNas: async (nasId: number) => {
    return await request.post<boolean>({ url: `/apps/nas/all/${nasId}/mount` })
  },

  umountNas: async (nasId: number) => {
    return await request.post<boolean>({ url: `/apps/nas/all/${nasId}/umount` })
  },

  getPermissionList: async (nasId: number) => {
    return await request.get<NasPermissionVO[]>({ url: `/apps/ad/nas/all/${nasId}/file_per` })
  },

  createPermission: async (nasId: number, data: NasPermissionSaveReqVO) => {
    return await request.post<number>({ url: `/apps/ad/nas/all/${nasId}/file_per`, data })
  },

  updatePermission: async (nasId: number, filePerId: number, data: NasPermissionSaveReqVO) => {
    return await request.put<boolean>({ url: `/apps/ad/nas/all/${nasId}/file_per/${filePerId}`, data })
  },

  deletePermission: async (nasId: number, filePerId: number) => {
    return await request.delete<boolean>({ url: `/apps/ad/nas/all/${nasId}/file_per/${filePerId}` })
  }
}