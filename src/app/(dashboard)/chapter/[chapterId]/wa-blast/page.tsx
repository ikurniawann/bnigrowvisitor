import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import WaBlast from '@/components/pages/WaBlast'

export default async function ChapterWaBlastPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <WaBlast />
    </ChapterRouteScope>
  )
}
