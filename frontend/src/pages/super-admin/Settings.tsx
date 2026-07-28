import Layout from '@/components/layout/Layout'
import { SettingsView } from '@/components/shared/SettingsView'

export default function SuperAdminSettings() {
  return (
    <Layout>
      <SettingsView scope="super_admin" />
    </Layout>
  )
}
