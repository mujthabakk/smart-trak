import Layout from '@/components/layout/Layout'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { ScrollText } from 'lucide-react'

export default function AuditLogs() {
  return (
    <Layout>
      <ComingSoon title="Audit Logs" icon={ScrollText}
        features={['Full action history', 'Filter by user & module', 'Export']} />
    </Layout>
  )
}
