import Layout from '@/components/layout/Layout'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { HelpCircle } from 'lucide-react'

export default function HelpCenter() {
  return (
    <Layout>
      <ComingSoon title="Help Center" icon={HelpCircle}
        features={['Guides & tutorials', 'FAQs', 'Contact support']} />
    </Layout>
  )
}
