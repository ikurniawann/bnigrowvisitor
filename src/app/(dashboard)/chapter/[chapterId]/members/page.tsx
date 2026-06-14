import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import Members from '@/components/pages/Members'

export default async function ChapterMembersPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <Members />
    </ChapterRouteScope>
  )
}
