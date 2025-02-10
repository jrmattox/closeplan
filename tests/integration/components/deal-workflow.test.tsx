import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DealWorkflow } from '@/components/deals/DealWorkflow'
import { createDeal, createCompliantDeal } from '@/tests/factories/deals'
import { Department, DealStage } from '@/lib/types'

describe('Deal Workflow Integration', () => {
  it('handles complete deal stage progression', async () => {
    // Create initial deal
    const deal = createDeal({
      stage: DealStage.DISCOVERY,
      department: Department.CARDIOLOGY
    })

    render(<DealWorkflow deal={deal} />)

    // Progress through stages
    await waitFor(async () => {
      // Discovery -> Clinical Validation
      const validateBtn = screen.getByRole('button', { name: /begin validation/i })
      fireEvent.click(validateBtn)
      expect(screen.getByText(/clinical validation/i)).toBeInTheDocument()

      // Complete clinical requirements
      const clinicalForm = screen.getByTestId('clinical-validation-form')
      fireEvent.change(clinicalForm, {
        target: { value: 'Completed clinical assessment' }
      })
      fireEvent.click(screen.getByRole('button', { name: /submit validation/i }))

      // Progress to technical review
      expect(screen.getByText(/technical review/i)).toBeInTheDocument()
      
      // Complete deal
      const completeBtn = screen.getByRole('button', { name: /complete deal/i })
      fireEvent.click(completeBtn)
      expect(screen.getByText(/closed won/i)).toBeInTheDocument()
    })
  })

  it('enforces healthcare compliance requirements', async () => {
    const deal = createDeal({
      stage: DealStage.CLINICAL_VALIDATION,
      department: Department.CARDIOLOGY
    })

    render(<DealWorkflow deal={deal} />)

    await waitFor(() => {
      // Try to progress without compliance
      const nextBtn = screen.getByRole('button', { name: /next stage/i })
      fireEvent.click(nextBtn)
      expect(screen.getByText(/compliance required/i)).toBeInTheDocument()

      // Complete compliance requirements
      const complianceForm = screen.getByTestId('compliance-checklist')
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => fireEvent.click(checkbox))

      // Should now allow progression
      fireEvent.click(nextBtn)
      expect(screen.getByText(/technical review/i)).toBeInTheDocument()
    })
  })

  it('manages department-specific requirements', async () => {
    const departments = [
      Department.CARDIOLOGY,
      Department.ONCOLOGY,
      Department.NEUROLOGY
    ]

    for (const dept of departments) {
      const deal = createDeal({ department: dept })
      const { rerender } = render(<DealWorkflow deal={deal} />)

      await waitFor(() => {
        // Check department-specific forms
        const deptForm = screen.getByTestId(`${dept.toLowerCase()}-requirements`)
        expect(deptForm).toBeInTheDocument()

        // Verify required documents
        const documents = screen.getByTestId('required-documents')
        if (dept === Department.CARDIOLOGY) {
          expect(documents).toHaveTextContent(/device certification/i)
        } else if (dept === Department.ONCOLOGY) {
          expect(documents).toHaveTextContent(/clinical trials/i)
        }

        rerender(<DealWorkflow deal={deal} />)
      })
    }
  })

  it('validates clinical requirements by department', async () => {
    const deal = createDeal({
      stage: DealStage.CLINICAL_VALIDATION,
      department: Department.ONCOLOGY
    })

    render(<DealWorkflow deal={deal} />)

    await waitFor(() => {
      // Check oncology-specific validation
      const trialForm = screen.getByTestId('clinical-trial-form')
      expect(trialForm).toBeInTheDocument()

      // Fill trial data
      fireEvent.change(trialForm, {
        target: { value: 'Phase 3 Trial Results' }
      })

      // Submit validation
      const submitBtn = screen.getByRole('button', { name: /submit trials/i })
      fireEvent.click(submitBtn)

      // Should show success
      expect(screen.getByText(/trials validated/i)).toBeInTheDocument()
    })
  })

  it('handles compliance validation failures', async () => {
    const deal = createCompliantDeal({
      stage: DealStage.TECHNICAL_VALIDATION
    })

    render(<DealWorkflow deal={deal} />)

    await waitFor(() => {
      // Trigger validation failure
      const validateBtn = screen.getByRole('button', { name: /validate/i })
      fireEvent.click(validateBtn)

      // Check error handling
      expect(screen.getByText(/validation failed/i)).toBeInTheDocument()
      expect(screen.getByText(/retry validation/i)).toBeInTheDocument()

      // Should not allow progression
      const nextBtn = screen.getByRole('button', { name: /next stage/i })
      expect(nextBtn).toBeDisabled()
    })
  })
}) 