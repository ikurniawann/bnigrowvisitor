import { withScopedSession, ok, readJson } from '@/lib/server/apiHandler'
import { listGuests, createGuest } from '@/lib/server/guestsService'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withScopedSession(request, async ({ scope }) => ok(await listGuests(scope)))
}

export async function POST(request: Request) {
  return withScopedSession(
    request,
    async ({ session, scope }) => {
      const body = await readJson(request)
      return ok(await createGuest(session, scope, body), 201)
    },
    { requireChapter: true }
  )
}
