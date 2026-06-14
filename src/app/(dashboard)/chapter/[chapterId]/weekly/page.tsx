import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import WeeklyMeeting from '@/components/pages/WeeklyMeeting'

export default async function ChapterWeeklyPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <WeeklyMeeting />
    </ChapterRouteScope>
  )
}
