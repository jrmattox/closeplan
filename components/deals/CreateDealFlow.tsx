import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createAuditLog } from '@/lib/audit'
import { encrypt } from '@/lib/utils/phi-encryption'
import { withTenantContext } from '@/lib/middleware/tenant-context'

const dealSchema = z.object({
  name: z.string().min(3).max(100),
  department: z.enum(['HEALTHCARE', 'PHARMA', 'BIOTECH', 'OTHER']),
  stage: z.enum(['QUALIFICATION', 'PROPOSAL', 'CLOSING']),
  value: z.number().min(0),
  containsPhi: z.boolean(),
  phiFields: z.array(z.string()).optional()
})

type DealFormData = z.infer<typeof dealSchema>

const STEPS = ['Basic Info', 'Department', 'PHI Review', 'Confirmation'] as const
type Step = typeof STEPS[number]

export function CreateDealFlow() {
  const [currentStep, setCurrentStep] = useState<Step>('Basic Info')
  const [phiWarningAcknowledged, setPhiWarningAcknowledged] = useState(false)

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      containsPhi: false,
      phiFields: []
    }
  })

  const onSubmit = async (data: DealFormData) => {
    try {
      // Encrypt PHI fields if present
      const encryptedData = data.containsPhi ? {
        ...data,
        name: await encrypt(data.name),
        phiFields: data.phiFields?.map(field => encrypt(field))
      } : data

      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(encryptedData)
      })

      if (!response.ok) throw new Error('Failed to create deal')

      // Audit the creation
      await createAuditLog({
        action: 'CREATE_DEAL',
        resourceType: 'DEAL',
        metadata: {
          department: data.department,
          containsPhi: data.containsPhi
        }
      })

      // Reset form and show success
      form.reset()
      setCurrentStep('Basic Info')
    } catch (error) {
      console.error('Failed to create deal:', error)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Deal</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {currentStep === 'Basic Info' && (
            <BasicInfoStep form={form} onNext={() => setCurrentStep('Department')} />
          )}

          {currentStep === 'Department' && (
            <DepartmentStep
              form={form}
              onNext={() => setCurrentStep('PHI Review')}
              onBack={() => setCurrentStep('Basic Info')}
            />
          )}

          {currentStep === 'PHI Review' && (
            <PhiReviewStep
              form={form}
              acknowledged={phiWarningAcknowledged}
              onAcknowledge={setPhiWarningAcknowledged}
              onNext={() => setCurrentStep('Confirmation')}
              onBack={() => setCurrentStep('Department')}
            />
          )}

          {currentStep === 'Confirmation' && (
            <ConfirmationStep
              form={form}
              onSubmit={onSubmit}
              onBack={() => setCurrentStep('PHI Review')}
            />
          )}
        </form>
      </CardContent>
    </Card>
  )
}
