import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import PICManagement from '@/components/pages/PICManagement'

export default async function ChapterPICPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <PICManagement />
    </ChapterRouteScope>
  )
}
