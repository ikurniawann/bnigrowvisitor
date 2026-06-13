import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import TextFormat from '@/components/pages/TextFormat'

export default function ChapterTextFormatPage({ params }: { params: { chapterId: string } }) {
  return (
    <ChapterRouteScope chapterId={params.chapterId}>
      <TextFormat />
    </ChapterRouteScope>
  )
}
