const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const normalizeApiPath = (value: string) => {
  if (!value) return ''
  return value.startsWith('/') ? value : `/${value}`
}

const getOriginBaseUrl = () => {
  if (typeof window === 'undefined') return ''
  return `${window.location.protocol}//${window.location.hostname}`
}

export const getPreviewApiBaseUrl = () => {
  const baseUrl = String(import.meta.env.VITE_BASE_URL || '').trim()
  const apiUrl = normalizeApiPath(String(import.meta.env.VITE_API_URL || '').trim())

  if (baseUrl) {
    return `${trimTrailingSlash(baseUrl)}${apiUrl}`
  }

  const originBaseUrl = getOriginBaseUrl()
  if (!originBaseUrl) return apiUrl

  return `${trimTrailingSlash(originBaseUrl)}${apiUrl}`
}

export const buildPreviewApiUrl = (path: string) => {
  const baseUrl = getPreviewApiBaseUrl()
  const normalizedPath = normalizeApiPath(path)
  if (!baseUrl) return normalizedPath
  return `${trimTrailingSlash(baseUrl)}${normalizedPath}`
}
