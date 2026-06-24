import Layout from '@/components/layout/Layout'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { PlusCircle } from 'lucide-react'

export default function AddSchool() {
  return (
    <Layout>
      <ComingSoon title="Add School" icon={PlusCircle}
        features={['School details form', 'Assign plan', 'Create admin account']} />
    </Layout>
  )
}
