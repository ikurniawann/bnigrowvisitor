import { withScopedSession, ok, readJson } from '@/lib/server/apiHandler'
import { listMeetings, createMeeting } from '@/lib/server/meetingsService'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withScopedSession(request, async ({ scope }) => ok(await listMeetings(scope)))
}

export async function POST(request: Request) {
  return withScopedSession(
    request,
    async ({ session, scope }) => {
      const body = await readJson(request)
      return ok(await createMeeting(session, scope, body), 201)
    },
    { requireChapter: true }
  )
}
