import { withScopedSession, ok, readJson } from '@/lib/server/apiHandler'
import { updateMember, deleteMember } from '@/lib/server/membersService'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return withScopedSession(request, async ({ session, scope }) => {
    const { id } = await context.params
    const body = await readJson(request)
    return ok(await updateMember(session, scope, id, body))
  })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return withScopedSession(request, async ({ session, scope }) => {
    const { id } = await context.params
    await deleteMember(session, scope, id)
    return ok({ id })
  })
}
