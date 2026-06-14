import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import TextFormat from '@/components/pages/TextFormat'

export default async function ChapterTextFormatPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <TextFormat />
    </ChapterRouteScope>
  )
}
