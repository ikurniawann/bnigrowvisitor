import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import Kanban from '@/components/pages/Kanban'

export default async function ChapterPipelinePage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <Kanban />
    </ChapterRouteScope>
  )
}
