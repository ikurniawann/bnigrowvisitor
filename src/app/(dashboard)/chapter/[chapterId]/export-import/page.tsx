import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import ExportImport from '@/app/(dashboard)/export-import/page'

export default async function ChapterExportImportPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await params
  return (
    <ChapterRouteScope chapterId={chapterId}>
      <ExportImport />
    </ChapterRouteScope>
  )
}
