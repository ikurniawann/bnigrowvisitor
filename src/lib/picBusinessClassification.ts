'use client'

const STORAGE_KEY = 'bni-grow-pic-business-classifications'

type PicBusinessMap = Record<string, string>

function readMap(): PicBusinessMap {
  if (typeof window === 'undefined') return {}

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getLocalPicBusinessClassification(picId?: string) {
  if (!picId) return ''
  return readMap()[picId] || ''
}

export function saveLocalPicBusinessClassification(picId: string, value: string) {
  if (typeof window === 'undefined') return

  const map = readMap()
  if (value.trim()) {
    map[picId] = value.trim()
  } else {
    delete map[picId]
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}
