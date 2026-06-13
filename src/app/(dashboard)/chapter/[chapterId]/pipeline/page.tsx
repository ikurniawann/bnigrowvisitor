import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import Kanban from '@/components/pages/Kanban'

export default function ChapterPipelinePage({ params }: { params: { chapterId: string } }) {
  return (
    <ChapterRouteScope chapterId={params.chapterId}>
      <Kanban />
    </ChapterRouteScope>
  )
}
