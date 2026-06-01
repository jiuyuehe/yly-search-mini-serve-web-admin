const DONE_RUN_STATUS = new Set([
  'DONE',
  'SUCCESS',
  'SUCCEEDED',
  'COMPLETED',
  'FINISHED'
])
const FAILED_RUN_STATUS = new Set([
  'FAIL',
  'FAILED',
  'ERROR',
  'ABORTED',
  'CANCELLED',
  'STOPPED'
])
const ACTIVE_RUN_STATUS = new Set([
  'PENDING',
  'RUNNING',
  'PROCESSING',
  'STARTED',
  'PARSING',
  'INDEXING',
  'EMBEDDING'
])

function toFiniteNumber(value: unknown) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function formatProcessBeginAt(value: unknown) {
  const text = String(value || '').trim()
  if (!text) return ''
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) {
    return text
  }
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function formatProcessDuration(value: unknown) {
  const seconds = toFiniteNumber(value)
  if (seconds == null || seconds < 0) return ''
  if (seconds < 60) {
    return `${seconds < 10 ? seconds.toFixed(2) : seconds.toFixed(1)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds - minutes * 60
  if (minutes < 60) {
    return `${minutes}m ${remainSeconds.toFixed(remainSeconds < 10 ? 1 : 0)}s`
  }
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  return `${hours}h ${remainMinutes}m`
}

export function getDocumentRunStatus(doc: any) {
  return String(doc?.run || '').trim().toUpperCase()
}

export function getDocumentParsePercent(doc: any) {
  const progressValue = toFiniteNumber(doc?.progress)
  if (progressValue == null) {
    return isDocumentParseCompleted(doc) ? 100 : 0
  }
  const normalizedPercent = progressValue <= 1 ? progressValue * 100 : progressValue
  return clampNumber(Math.round(normalizedPercent), 0, 100)
}

export function getDocumentProgressMessages(doc: any) {
  return String(doc?.progress_msg || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function getDocumentLatestProgressMessage(doc: any) {
  const messages = getDocumentProgressMessages(doc)
  return messages[messages.length - 1] || ''
}

export function isDocumentParseCompleted(doc: any) {
  const runStatus = getDocumentRunStatus(doc)
  if (DONE_RUN_STATUS.has(runStatus)) {
    return true
  }
  const progressValue = toFiniteNumber(doc?.progress)
  return progressValue != null && progressValue >= 1
}

export function isDocumentParseFailed(doc: any) {
  const runStatus = getDocumentRunStatus(doc)
  if (FAILED_RUN_STATUS.has(runStatus)) {
    return true
  }
  if (isDocumentParseCompleted(doc)) {
    return false
  }
  const progressMessage = String(doc?.progress_msg || '').toLowerCase()
  if (!progressMessage) {
    return false
  }
  return (
    progressMessage.includes('fail') ||
    progressMessage.includes('error') ||
    progressMessage.includes('exception')
  )
}

export function isDocumentParsing(doc: any) {
  if (isDocumentParseCompleted(doc) || isDocumentParseFailed(doc)) {
    return false
  }
  const runStatus = getDocumentRunStatus(doc)
  if (ACTIVE_RUN_STATUS.has(runStatus)) {
    return true
  }
  if (String(doc?.process_begin_at || '').trim()) {
    return true
  }
  const progressValue = toFiniteNumber(doc?.progress)
  return progressValue != null && progressValue > 0
}

export function getDocumentParseStatusLabel(doc: any) {
  if (isDocumentParseCompleted(doc)) return '已完成'
  if (isDocumentParseFailed(doc)) return '解析失败'
  if (isDocumentParsing(doc)) return '解析中'
  return '未解析'
}

export function getDocumentParseStatusTheme(doc: any) {
  if (isDocumentParseCompleted(doc)) return 'success'
  if (isDocumentParseFailed(doc)) return 'danger'
  if (isDocumentParsing(doc)) return 'warning'
  return 'danger'
}

export function getDocumentParseMetaText(doc: any) {
  const parts: string[] = []
  const beginAtText = formatProcessBeginAt(doc?.process_begin_at)
  const durationText = formatProcessDuration(doc?.process_duration)
  if (beginAtText) {
    parts.push(`开始: ${beginAtText}`)
  }
  if (durationText) {
    parts.push(`耗时: ${durationText}`)
  }
  return parts.join(' · ')
}
