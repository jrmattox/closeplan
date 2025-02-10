import { UseFormReturn } from 'react-hook-form'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FormField, FormItem, FormLabel } from '@/components/ui/form'

interface PhiReviewStepProps {
  form: UseFormReturn<any>
  acknowledged: boolean
  onAcknowledge: (value: boolean) => void
  onNext: () => void
  onBack: () => void
}

export function PhiReviewStep({
  form,
  acknowledged,
  onAcknowledge,
  onNext,
  onBack
}: PhiReviewStepProps) {
  const containsPhi = form.watch('containsPhi')

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="containsPhi"
        render={({ field }) => (
          <FormItem className="flex items-center space-x-2">
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            <FormLabel>This deal contains PHI</FormLabel>
          </FormItem>
        )}
      />

      {containsPhi && (
        <Alert variant="destructive">
          <AlertTitle>PHI Handling Warning</AlertTitle>
          <AlertDescription>
            You've indicated this deal contains Protected Health Information (PHI).
            All PHI will be encrypted before storage and proper audit logs will be maintained.
            Please ensure you're following all HIPAA guidelines when handling this data.
          </AlertDescription>
        </Alert>
      )}

      {containsPhi && (
        <FormItem className="flex items-center space-x-2">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={onAcknowledge}
          />
          <FormLabel>
            I understand the responsibilities of handling PHI
          </FormLabel>
        </FormItem>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={containsPhi && !acknowledged}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
