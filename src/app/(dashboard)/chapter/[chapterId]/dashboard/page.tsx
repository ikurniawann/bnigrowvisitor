import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import Dashboard from '@/components/pages/Dashboard'

export default async function ChapterDashboardByIdPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <Dashboard mode="chapter" />
    </ChapterRouteScope>
  )
}
