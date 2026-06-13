import { withScopedSession, ok, readJson } from '@/lib/server/apiHandler'
import { listActivityLogs, writeActivityLog, ActivityLogInput } from '@/lib/server/activityLogService'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withScopedSession(request, async ({ scope }) => {
    const limit = Number(new URL(request.url).searchParams.get('limit')) || 200
    return ok(await listActivityLogs(scope, limit))
  })
}

export async function POST(request: Request) {
  return withScopedSession(request, async ({ session, scope }) => {
    const body = await readJson<ActivityLogInput>(request)
    await writeActivityLog(session, scope, body)
    return ok({ logged: true }, 201)
  })
}
