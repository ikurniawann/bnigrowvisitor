import { withScopedSession, ok, readJson } from '@/lib/server/apiHandler'
import { listPics, createPic, PicInput } from '@/lib/server/accountsService'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return withScopedSession(request, async ({ scope }) => ok(await listPics(scope)))
}

export async function POST(request: Request) {
  return withScopedSession(
    request,
    async ({ session, scope }) => {
      const body = await readJson<PicInput>(request)
      return ok(await createPic(session, scope, body), 201)
    },
    { requireChapter: true }
  )
}
