import { withScopedSession, ok, readJson } from '@/lib/server/apiHandler'
import { updateMeeting, deleteMeeting } from '@/lib/server/meetingsService'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return withScopedSession(request, async ({ session, scope }) => {
    const { id } = await context.params
    const body = await readJson(request)
    return ok(await updateMeeting(session, scope, id, body))
  })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return withScopedSession(request, async ({ session, scope }) => {
    const { id } = await context.params
    await deleteMeeting(session, scope, id)
    return ok({ id })
  })
}
