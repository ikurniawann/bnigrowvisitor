import { withScopedSession, ok, readJson } from '@/lib/server/apiHandler'
import { updateGuest, deleteGuest } from '@/lib/server/guestsService'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withScopedSession(request, async ({ session, scope }) => {
    const body = await readJson(request)
    return ok(await updateGuest(session, scope, id, body))
  })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withScopedSession(request, async ({ session, scope }) => {
    await deleteGuest(session, scope, id)
    return ok({ success: true })
  })
}
