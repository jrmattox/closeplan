import { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

interface BasicInfoStepProps {
  form: UseFormReturn<any>
  onNext: () => void
}

export function BasicInfoStep({ form, onNext }: BasicInfoStepProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Deal Name</FormLabel>
            <Input {...field} placeholder="Enter deal name" />
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="value"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Deal Value</FormLabel>
            <Input
              type="number"
              {...field}
              onChange={e => field.onChange(parseFloat(e.target.value))}
              placeholder="Enter deal value"
            />
            <FormMessage />
          </FormItem>
        )}
      />

      <Button
        type="button"
        onClick={onNext}
        disabled={!form.formState.isValid}
      >
        Next
      </Button>
    </div>
  )
}
