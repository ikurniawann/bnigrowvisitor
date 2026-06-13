import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import AttendedVisitors from '@/components/pages/AttendedVisitors'

export default function ChapterMCQAPage({ params }: { params: { chapterId: string } }) {
  return (
    <ChapterRouteScope chapterId={params.chapterId}>
      <AttendedVisitors />
    </ChapterRouteScope>
  )
}
