import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import Guests from '@/components/pages/Guests'

export default async function ChapterGuestsPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <Guests />
    </ChapterRouteScope>
  )
}
