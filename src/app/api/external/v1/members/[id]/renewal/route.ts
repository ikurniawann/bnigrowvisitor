import { NextResponse } from 'next/server'
import { withApiKey } from '@/lib/server/apiAuth'
import { recordRenewal } from '@/lib/server/membershipRenewal'
import { getMemberExternal } from '@/lib/server/externalMembers'

export const dynamic = 'force-dynamic'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

interface RenewalBody {
  renewedUntil?: string
  cycleMonths?: number
}

// POST /api/external/v1/members/:id/renewal
// Body: { renewedUntil?: "YYYY-MM-DD", cycleMonths?: number }
// Finance confirms a paid renewal: pushes renewal_date forward and reactivates.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiKey(
    request,
    async ({ apiKey }) => {
      const { id } = await context.params

      let body: RenewalBody = {}
      try {
        body = (await request.json()) as RenewalBody
      } catch {
        body = {}
      }

      if (body.renewedUntil != null && !ISO_DATE.test(body.renewedUntil)) {
        return NextResponse.json(
          { error: 'renewedUntil harus berformat YYYY-MM-DD.' },
          { status: 400 }
        )
      }
      if (
        body.cycleMonths != null &&
        (!Number.isInteger(body.cycleMonths) || body.cycleMonths <= 0 || body.cycleMonths > 120)
      ) {
        return NextResponse.json(
          { error: 'cycleMonths harus bilangan bulat 1-120.' },
          { status: 400 }
        )
      }

      const updated = await recordRenewal(id, {
        renewedUntil: body.renewedUntil ?? null,
        cycleMonths: body.cycleMonths ?? null,
        actorEmail: `finance:${apiKey.name}`,
      })

      if (!updated) {
        return NextResponse.json({ error: 'Member tidak ditemukan.' }, { status: 404 })
      }

      // Return the curated external view rather than the raw row.
      const member = await getMemberExternal(id)
      return NextResponse.json({ data: member })
    },
    { requiredScope: 'finance' }
  )
}
