import { NextResponse } from 'next/server'
import { withApiKey } from '@/lib/server/apiAuth'
import { getMemberExternal } from '@/lib/server/externalMembers'

export const dynamic = 'force-dynamic'

// GET /api/external/v1/members/:id
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiKey(
    request,
    async () => {
      const { id } = await context.params
      const member = await getMemberExternal(id)
      if (!member) {
        return NextResponse.json({ error: 'Member tidak ditemukan.' }, { status: 404 })
      }
      return NextResponse.json({ data: member })
    },
    { requiredScope: 'finance' }
  )
}
