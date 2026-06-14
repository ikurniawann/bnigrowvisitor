import { withScopedSession, ok, readJson } from '@/lib/server/apiHandler'
import { updateVisitor, deleteVisitor } from '@/lib/server/visitorsService'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return withScopedSession(request, async ({ session, scope }) => {
    const { id } = await context.params
    const body = await readJson(request)
    return ok(await updateVisitor(session, scope, id, body))
  })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return withScopedSession(request, async ({ session, scope }) => {
    const { id } = await context.params
    await deleteVisitor(session, scope, id)
    return ok({ id })
  })
}
