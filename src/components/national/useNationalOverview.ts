'use client'

import { useCallback, useEffect, useState } from 'react'
import type { NationalOverview } from '@/lib/national/types'

export interface OverviewFilters {
  period: string
  cityId: string
  areaId: string
  chapterId: string
}

export const DEFAULT_FILTERS: OverviewFilters = {
  period: 'all',
  cityId: '',
  areaId: '',
  chapterId: '',
}

interface OverviewState {
  data: NationalOverview | null
  loading: boolean
  error: string | null
}

function buildQuery(filters: OverviewFilters): string {
  const params = new URLSearchParams()
  if (filters.period) params.set('period', filters.period)
  if (filters.chapterId) params.set('chapterId', filters.chapterId)
  else if (filters.areaId) params.set('areaId', filters.areaId)
  else if (filters.cityId) params.set('cityId', filters.cityId)
  return params.toString()
}

export function useNationalOverview(filters: OverviewFilters) {
  const [state, setState] = useState<OverviewState>({ data: null, loading: true, error: null })

  const query = buildQuery(filters)

  const load = useCallback(async (signal?: AbortSignal) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const response = await fetch(`/api/national/overview?${query}`, { cache: 'no-store', signal })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Gagal memuat dashboard nasional.')
      setState({ data: payload as NationalOverview, loading: false, error: null })
    } catch (error: any) {
      if (error?.name === 'AbortError') return
      setState({ data: null, loading: false, error: error?.message || 'Gagal memuat dashboard nasional.' })
    }
  }, [query])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  return { ...state, refetch: () => load() }
}
