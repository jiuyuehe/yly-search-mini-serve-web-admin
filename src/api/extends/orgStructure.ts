import request from '@/config/axios'

export interface OrgDeptQuery {
  name?: string
  status?: number
}

export interface OrgDeptVO {
  id: number
  name: string
  parentId: number
  sort: number
  status: number
  leaderUserId?: number
  phone?: string
  email?: string
  sourceType?: string
  sourceTypeName?: string
  children?: OrgDeptVO[]
}

export interface OrgDeptCreateReq {
  name: string
  parentId?: number
  sort: number
  leaderUserId?: number
  phone?: string
  email?: string
  status: number
}

export interface OrgDeptUpdateReq extends OrgDeptCreateReq {
  id: number
}

export interface OrgDeptMoveReq {
  parentId: number
  sort: number
  name?: string
  status?: number
}

export interface OrgUserRespVO {
  id: number
  username: string
  nickname: string
  mobile?: string
  email?: string
  deptIds: number[]
  status?: number
  sourceType?: string
  sourceTypeName?: string
  createTime?: string | number
}

export interface OrgUserUpdateReq {
  id: number
  username?: string
  nickname?: string
  mobile?: string
  email?: string
  status: number
}

export interface OrgUserQuery {
  name?: string
  account?: string
}

export interface ExtendedUserDTO {
  originalUser: any
  deptIds: number[]
}

export const getDeptList = (params?: OrgDeptQuery) => {
  return request.get<OrgDeptVO[]>({
    url: '/extends/org-structure/depts',
    params
  })
}

export const createDept = (data: OrgDeptCreateReq) => {
  return request.post<number>({
    url: '/extends/org-structure/depts',
    data
  })
}

export const updateDept = (data: OrgDeptUpdateReq) => {
  return request.put<boolean>({
    url: `/extends/org-structure/depts/${data.id}`,
    data
  })
}

export const moveDept = (id: number, data: OrgDeptMoveReq) => {
  return request.post<boolean>({
    url: `/extends/org-structure/depts/${id}/move`,
    data
  })
}

export const deleteDept = (id: number) => {
  return request.delete<boolean>({
    url: `/extends/org-structure/depts/${id}`
  })
}

export const getUsersByDept = (deptId: number, params?: OrgUserQuery) => {
  return request.get<OrgUserRespVO[]>({
    url: `/extends/org-structure/depts/${deptId}/users`,
    params
  })
}

export const addUserToDept = (deptId: number, userId: number) => {
  return request.post<boolean>({
    url: `/extends/org-structure/depts/${deptId}/users`,
    data: { userId }
  })
}

export const removeUserFromDept = (deptId: number, userId: number) => {
  return request.delete<boolean>({
    url: `/extends/org-structure/depts/${deptId}/users/${userId}`
  })
}

export const updateUserDepartments = (userId: number, deptIds: number[]) => {
  return request.put<boolean>({
    url: `/extends/org-structure/users/${userId}/depts`,
    data: { deptIds }
  })
}

export const getUserDetail = (userId: number) => {
  return request.get<ExtendedUserDTO>({
    url: `/extends/org-structure/users/${userId}`
  })
}

export const updateUser = (data: OrgUserUpdateReq) => {
  return request.put<boolean>({
    url: `/extends/org-structure/users/${data.id}`,
    data
  })
}

export const updateUserPassword = (userId: number, password: string) => {
  return request.put<boolean>({
    url: `/extends/org-structure/users/${userId}/password`,
    data: { password }
  })
}

export const deleteUser = (userId: number) => {
  return request.delete<boolean>({
    url: `/extends/org-structure/users/${userId}`
  })
}

