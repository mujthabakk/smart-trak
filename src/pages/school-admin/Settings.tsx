import Layout from '@/components/layout/Layout'
import { SettingsView } from '@/components/shared/SettingsView'

export default function SchoolAdminSettings() {
  return (
    <Layout>
      <SettingsView scope="school_admin" />
    </Layout>
  )
}
