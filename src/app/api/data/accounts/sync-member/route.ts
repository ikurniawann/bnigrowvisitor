import { withScopedSession, ok, readJson } from '@/lib/server/apiHandler'
import { syncMemberAccount, MemberAccountInput } from '@/lib/server/accountsService'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return withScopedSession(
    request,
    async ({ session, scope }) => {
      const body = await readJson<MemberAccountInput>(request)
      return ok(await syncMemberAccount(session, scope, body))
    },
    { requireChapter: true }
  )
}
