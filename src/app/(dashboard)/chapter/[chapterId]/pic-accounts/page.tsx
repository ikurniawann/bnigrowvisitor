import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import ManagePicAccounts from '@/components/pages/ManagePicAccounts'

export default async function PicAccountsPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <ManagePicAccounts chapterId={chapterId} />
    </ChapterRouteScope>
  )
}
