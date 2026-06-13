import ChapterRouteScope from '@/components/layout/ChapterRouteScope'
import ExportImport from '@/app/(dashboard)/export-import/page'

export default function ChapterExportImportPage({ params }: { params: { chapterId: string } }) {
  return (
    <ChapterRouteScope chapterId={params.chapterId}>
      <ExportImport />
    </ChapterRouteScope>
  )
}
