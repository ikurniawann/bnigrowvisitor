import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import PICManagement from '@/components/pages/PICManagement'

export default function ChapterPICPage({ params }: { params: { chapterId: string } }) {
  return (
    <ChapterRouteScope chapterId={params.chapterId}>
      <PICManagement />
    </ChapterRouteScope>
  )
}
