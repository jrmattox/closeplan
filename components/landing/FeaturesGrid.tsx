import { Shield, Users, Workflow, FileText, Video, BarChart } from 'lucide-react'
import { FeatureCard } from './FeatureCard'

const features = [
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Role-Based Access',
    description: 'Secure permission management with custom role definitions.',
    benefits: [
      'Custom role definitions',
      'Granular access controls',
      'Audit logging',
      'HIPAA compliance'
    ],
    learnMoreHref: '/features/security'
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Advanced Stakeholder Management',
    description: 'Map and track key relationships with comprehensive communication history.',
    benefits: [
      'Stakeholder mapping',
      'Relationship tracking',
      'Communication history',
      'Team collaboration'
    ],
    learnMoreHref: '/features/stakeholders'
  },
  // ... other features
]

export function FeaturesGrid() {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Everything You Need to Close Complex Deals
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Powerful features designed for healthcare sales professionals
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  )
}
