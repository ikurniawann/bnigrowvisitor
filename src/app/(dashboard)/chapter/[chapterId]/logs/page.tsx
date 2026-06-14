import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import ActivityLogs from '@/components/pages/ActivityLogs'

export default async function ChapterLogsPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <ActivityLogs />
    </ChapterRouteScope>
  )
}
