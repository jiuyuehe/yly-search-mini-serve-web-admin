const stripLeadingSlash = (value: string) => value.replace(/^\/+/, '')

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const normalizePrefix = (value: string, fallback: string) => {
  const normalizedValue = stripTrailingSlash(value.trim())
  if (!normalizedValue) {
    return fallback
  }
  return normalizedValue.startsWith('/') ? normalizedValue : `/${normalizedValue}`
}

const joinPath = (base: string, path = '') => {
  const normalizedPath = stripLeadingSlash(path)
  if (!base) {
    return normalizedPath ? `/${normalizedPath}` : '/'
  }
  const normalizedBase = stripTrailingSlash(base)
  return normalizedPath ? `${normalizedBase}/${normalizedPath}` : normalizedBase
}

/**
 * 管理端接口统一走相对路径，由当前访问入口对应的反向代理负责转发。
 */
export const ADMIN_API_PREFIX = normalizePrefix(import.meta.env.VITE_API_URL || '', '/admin-api')

/**
 * APP 端接口统一走相对路径，方便同一套静态资源复用不同入口。
 */
export const APP_API_PREFIX = normalizePrefix(import.meta.env.VITE_APP_API_URL || '', '/app-api')

/**
 * 生成管理端接口地址。
 */
export const getAdminApiUrl = (path = '') => joinPath(ADMIN_API_PREFIX, path)

/**
 * 生成 APP 端接口地址。
 */
export const getAppApiUrl = (path = '') => joinPath(APP_API_PREFIX, path)

/**
 * 生成当前访问入口下的同源地址。
 */
export const getBackendUrl = (path = '') => joinPath('', path)

/**
 * 生成当前访问入口下的 WebSocket 地址。
 */
export const getWebSocketUrl = (
  path: string,
  query?: Record<string, string | number | null | undefined>
) => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = new URL(getBackendUrl(path), `${protocol}//${window.location.host}`)
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}
