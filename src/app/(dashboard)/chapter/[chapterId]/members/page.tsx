import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import Members from '@/components/pages/Members'

export default function ChapterMembersPage({ params }: { params: { chapterId: string } }) {
  return (
    <ChapterRouteScope chapterId={params.chapterId}>
      <Members />
    </ChapterRouteScope>
  )
}
