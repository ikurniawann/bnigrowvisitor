import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import Visitors from '@/components/pages/Visitors'

export default async function ChapterVisitorsPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <Visitors />
    </ChapterRouteScope>
  )
}
