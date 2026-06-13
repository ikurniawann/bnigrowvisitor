import MasterData from '@/components/pages/MasterData'

export default function NationalDashboardPage() {
  return (
    <MasterData
      defaultTab="chapters"
      title="Manage Chapter"
      subtitle="Tambah, edit, delete/nonaktifkan chapter, lalu pilih chapter untuk membuka data operasionalnya."
      visibleTabs={['chapters']}
    />
  )
}
