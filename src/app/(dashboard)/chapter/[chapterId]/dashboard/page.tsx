import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import Dashboard from '@/components/pages/Dashboard'

export default function ChapterDashboardByIdPage({ params }: { params: { chapterId: string } }) {
  return (
    <ChapterRouteScope chapterId={params.chapterId}>
      <Dashboard mode="chapter" />
    </ChapterRouteScope>
  )
}
