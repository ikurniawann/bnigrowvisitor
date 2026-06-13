import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import Visitors from '@/components/pages/Visitors'

export default function ChapterVisitorsPage({ params }: { params: { chapterId: string } }) {
  return (
    <ChapterRouteScope chapterId={params.chapterId}>
      <Visitors />
    </ChapterRouteScope>
  )
}
