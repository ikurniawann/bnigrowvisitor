import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import AttendedVisitors from '@/components/pages/AttendedVisitors'

export default async function ChapterMCQAPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <AttendedVisitors />
    </ChapterRouteScope>
  )
}
