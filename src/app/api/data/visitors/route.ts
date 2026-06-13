import { withScopedSession, ok, readJson } from '@/lib/server/apiHandler'
import { listVisitors, createVisitor } from '@/lib/server/visitorsService'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withScopedSession(request, async ({ scope }) => ok(await listVisitors(scope)))
}

export async function POST(request: Request) {
  return withScopedSession(
    request,
    async ({ session, scope }) => {
      const body = await readJson(request)
      return ok(await createVisitor(session, scope, body), 201)
    },
    { requireChapter: true }
  )
}
