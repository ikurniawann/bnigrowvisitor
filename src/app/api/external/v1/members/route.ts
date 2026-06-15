import { NextResponse } from 'next/server'
import { withApiKey } from '@/lib/server/apiAuth'
import { listMembersExternal } from '@/lib/server/externalMembers'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50

function parseIntParam(value: string | null, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

// GET /api/external/v1/members
// Query: chapterId, status, renewalBefore (YYYY-MM-DD), limit, offset
export async function GET(request: Request) {
  return withApiKey(
    request,
    async () => {
      const params = new URL(request.url).searchParams
      const limit = Math.min(parseIntParam(params.get('limit'), DEFAULT_LIMIT), MAX_LIMIT)
      const offset = parseIntParam(params.get('offset'), 0)

      const result = await listMembersExternal({
        chapterId: params.get('chapterId'),
        status: params.get('status'),
        renewalBefore: params.get('renewalBefore'),
        limit,
        offset,
      })

      return NextResponse.json({
        data: result.members,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.offset + result.members.length < result.total,
        },
      })
    },
    { requiredScope: 'finance' }
  )
}
