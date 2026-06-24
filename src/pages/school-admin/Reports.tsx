import Layout from '@/components/layout/Layout'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { BarChart3 } from 'lucide-react'

export default function SchoolReports() {
  return (
    <Layout>
      <ComingSoon title="Reports" icon={BarChart3}
        features={['Attendance reports', 'Trip logs', 'Export CSV / PDF']} />
    </Layout>
  )
}
