import { withScopedSession, ok, readJson } from '@/lib/server/apiHandler'
import { updatePic, deactivatePic, PicInput } from '@/lib/server/accountsService'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return withScopedSession(request, async ({ session, scope }) => {
    const { id } = await context.params
    const body = await readJson<Partial<PicInput>>(request)
    return ok(
      await updatePic(session, scope, id, {
        name: body.name ?? '',
        phone: body.phone,
        business_classification: body.business_classification,
        role: body.role,
      })
    )
  })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return withScopedSession(request, async ({ session, scope }) => {
    const { id } = await context.params
    await deactivatePic(session, scope, id)
    return ok({ id })
  })
}
