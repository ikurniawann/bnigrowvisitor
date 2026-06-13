import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import WeeklyMeeting from '@/components/pages/WeeklyMeeting'

export default function ChapterWeeklyPage({ params }: { params: { chapterId: string } }) {
  return (
    <ChapterRouteScope chapterId={params.chapterId}>
      <WeeklyMeeting />
    </ChapterRouteScope>
  )
}
