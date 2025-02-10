import { render, screen, waitFor } from '@/tests/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { DealCard } from '@/components/deals/deal-card'
import { mockDeals } from '@/tests/utils/mock-deals'
import { mockStakeholders } from '@/tests/utils/mock-stakeholders'
import { mockDocuments } from '@/tests/utils/mock-documents'
import { vi } from 'vitest'

describe('DealCard', () => {
  const onStatusChange = vi.fn(() => Promise.resolve())
  const onEdit = vi.fn()
  
  const defaultProps = {
    deal: mockDeals[0], // EMR Integration Platform deal
    onStatusChange,
    onEdit
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('displays basic deal information correctly', () => {
      render(<DealCard {...defaultProps} />)

      expect(screen.getByText('EMR Integration Platform')).toBeInTheDocument()
      expect(screen.getByText('$750,000')).toBeInTheDocument()
      expect(screen.getByText('City Hospital')).toBeInTheDocument()
      expect(screen.getByText('Technical Review')).toBeInTheDocument()
    })

    it('shows correct stakeholder count', () => {
      const relevantStakeholders = mockStakeholders.filter(s => 
        defaultProps.deal.stakeholders.includes(s.id)
      )
      
      render(<DealCard {...defaultProps} />)

      expect(screen.getByText(`${relevantStakeholders.length} Stakeholders`))
        .toBeInTheDocument()
    })

    it('displays correct document count', () => {
      const dealDocs = mockDocuments.filter(d => d.dealId === defaultProps.deal.id)
      
      render(<DealCard {...defaultProps} />)

      expect(screen.getByText(`${dealDocs.length} Documents`))
        .toBeInTheDocument()
    })

    it('shows deal progress and probability', () => {
      render(<DealCard {...defaultProps} />)

      expect(screen.getByText('60%')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60')
    })
  })

  describe('Interactions', () => {
    it('handles status change correctly', async () => {
      render(<DealCard {...defaultProps} />)

      const statusButton = screen.getByRole('button', { name: /change status/i })
      await userEvent.click(statusButton)

      const newStatus = screen.getByRole('option', { name: /clinical validation/i })
      await userEvent.click(newStatus)

      expect(onStatusChange).toHaveBeenCalledWith(
        defaultProps.deal.id,
        'CLINICAL_VALIDATION'
      )
    })

    it('shows loading state during status update', async () => {
      onStatusChange.mockImplementationOnce(() => new Promise(resolve => {
        setTimeout(resolve, 100)
      }))

      render(<DealCard {...defaultProps} />)

      const statusButton = screen.getByRole('button', { name: /change status/i })
      await userEvent.click(statusButton)
      
      const newStatus = screen.getByRole('option', { name: /clinical validation/i })
      await userEvent.click(newStatus)

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText(/updating/i)).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument()
      })
    })

    it('shows error state when status update fails', async () => {
      onStatusChange.mockRejectedValueOnce(new Error('Update failed'))

      render(<DealCard {...defaultProps} />)

      const statusButton = screen.getByRole('button', { name: /change status/i })
      await userEvent.click(statusButton)
      
      const newStatus = screen.getByRole('option', { name: /clinical validation/i })
      await userEvent.click(newStatus)

      await waitFor(() => {
        expect(screen.getByText(/failed to update status/i)).toBeInTheDocument()
      })
    })

    it('calls onEdit when edit button is clicked', async () => {
      render(<DealCard {...defaultProps} />)

      const editButton = screen.getByRole('button', { name: /edit deal/i })
      await userEvent.click(editButton)

      expect(onEdit).toHaveBeenCalledWith(defaultProps.deal.id)
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA labels', () => {
      render(<DealCard {...defaultProps} />)

      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        expect.stringContaining('EMR Integration Platform')
      )
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '0')
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100')
    })

    it('supports keyboard navigation', async () => {
      render(<DealCard {...defaultProps} />)

      const card = screen.getByRole('article')
      card.focus()

      await userEvent.keyboard('{Tab}')
      expect(screen.getByRole('button', { name: /change status/i }))
        .toHaveFocus()

      await userEvent.keyboard('{Tab}')
      expect(screen.getByRole('button', { name: /edit deal/i }))
        .toHaveFocus()
    })

    it('announces status changes to screen readers', async () => {
      render(<DealCard {...defaultProps} />)

      const statusButton = screen.getByRole('button', { name: /change status/i })
      await userEvent.click(statusButton)
      
      const newStatus = screen.getByRole('option', { name: /clinical validation/i })
      await userEvent.click(newStatus)

      expect(screen.getByRole('alert')).toHaveTextContent(
        /status updated to clinical validation/i
      )
    })
  })
}) 