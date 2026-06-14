import { withScopedSession, ok, readJson } from '@/lib/server/apiHandler'
import { listMembers, createMember } from '@/lib/server/membersService'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withScopedSession(request, async ({ scope }) => ok(await listMembers(scope)))
}

export async function POST(request: Request) {
  return withScopedSession(
    request,
    async ({ session, scope }) => {
      const body = await readJson(request)
      return ok(await createMember(session, scope, body), 201)
    },
    { requireChapter: true }
  )
}
