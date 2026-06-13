import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import ActivityLogs from '@/components/pages/ActivityLogs'

export default function ChapterLogsPage({ params }: { params: { chapterId: string } }) {
  return (
    <ChapterRouteScope chapterId={params.chapterId}>
      <ActivityLogs />
    </ChapterRouteScope>
  )
}
