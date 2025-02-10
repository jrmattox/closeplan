import { render, screen, within } from '@/tests/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { DealTable } from '@/components/deals'
import { mockDeals, mockStakeholders } from '@/tests/utils'
import { formatCurrency } from '@/lib/utils'

describe('DealTable', () => {
  const defaultProps = {
    deals: mockDeals,
    stakeholders: mockStakeholders,
    onDealSelect: vi.fn(),
    isLoading: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('displays deals in a table format', () => {
      render(<DealTable {...defaultProps} />)

      const table = screen.getByRole('table')
      const rows = within(table).getAllByRole('row')
      
      // Header + 2 deals
      expect(rows).toHaveLength(3)
      expect(screen.getByText('EMR Integration Platform')).toBeInTheDocument()
      expect(screen.getByText('Radiology PACS Upgrade')).toBeInTheDocument()
    })

    it('formats deal values correctly', () => {
      render(<DealTable {...defaultProps} />)

      mockDeals.forEach(deal => {
        expect(screen.getByText(formatCurrency(deal.value))).toBeInTheDocument()
      })
    })

    it('displays stakeholder avatars with tooltips', () => {
      render(<DealTable {...defaultProps} />)

      const firstDeal = mockDeals[0]
      const dealStakeholders = mockStakeholders.filter(s => 
        firstDeal.stakeholders.includes(s.id)
      )

      const stakeholderCell = screen.getByTestId(`stakeholders-${firstDeal.id}`)
      dealStakeholders.forEach(stakeholder => {
        expect(within(stakeholderCell).getByTitle(stakeholder.name)).toBeInTheDocument()
      })
    })

    it('shows correct deal stages with appropriate styling', () => {
      render(<DealTable {...defaultProps} />)

      const technicalStage = screen.getByText('Technical Review')
      const clinicalStage = screen.getByText('Clinical Validation')

      expect(technicalStage).toHaveClass('bg-blue-100 text-blue-800')
      expect(clinicalStage).toHaveClass('bg-green-100 text-green-800')
    })

    it('handles empty state', () => {
      render(<DealTable {...defaultProps} deals={[]} />)

      expect(screen.getByText(/no deals found/i)).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('sorts deals by value when clicking header', async () => {
      render(<DealTable {...defaultProps} />)
      
      const valueHeader = screen.getByRole('columnheader', { name: /value/i })
      await userEvent.click(valueHeader)

      const rows = screen.getAllByRole('row')
      const firstValue = within(rows[1]).getByText(/\$/)
      const secondValue = within(rows[2]).getByText(/\$/)
      
      expect(Number(firstValue.textContent?.replace(/[^0-9.-]+/g, '')))
        .toBeGreaterThan(Number(secondValue.textContent?.replace(/[^0-9.-]+/g, '')))
    })

    it('filters deals by type', async () => {
      render(<DealTable {...defaultProps} />)

      const filterButton = screen.getByRole('button', { name: /filter/i })
      await userEvent.click(filterButton)
      
      const emrFilter = screen.getByRole('checkbox', { name: /emr/i })
      await userEvent.click(emrFilter)

      expect(screen.getByText('EMR Integration Platform')).toBeInTheDocument()
      expect(screen.queryByText('Radiology PACS Upgrade')).not.toBeInTheDocument()
    })

    it('calls onDealSelect when row is clicked', async () => {
      render(<DealTable {...defaultProps} />)

      const firstRow = screen.getAllByRole('row')[1]
      await userEvent.click(firstRow)

      expect(defaultProps.onDealSelect).toHaveBeenCalledWith(mockDeals[0].id)
    })

    it('shows loading skeleton', () => {
      render(<DealTable {...defaultProps} isLoading={true} />)

      expect(screen.getByTestId('deal-table-skeleton')).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('Healthcare-specific Features', () => {
    it('displays clinical validation stages correctly', () => {
      render(<DealTable {...defaultProps} />)

      const clinicalStage = screen.getByText('Clinical Validation')
      expect(clinicalStage).toHaveAttribute('title', 'Pending clinical workflow validation')
    })

    it('shows department information', () => {
      render(<DealTable {...defaultProps} />)

      expect(screen.getByText('Radiology')).toBeInTheDocument()
      expect(screen.getByText('Information Technology')).toBeInTheDocument()
    })

    it('indicates compliance status', () => {
      render(<DealTable {...defaultProps} />)

      const complianceBadges = screen.getAllByTestId('compliance-status')
      expect(complianceBadges[0]).toHaveAttribute('title', 'HIPAA Compliance Verified')
    })

    it('displays approval workflow status', () => {
      render(<DealTable {...defaultProps} />)

      const approvalCell = screen.getByTestId(`approval-${mockDeals[0].id}`)
      expect(within(approvalCell).getByText(/pending cmo approval/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has correct table ARIA roles', () => {
      render(<DealTable {...defaultProps} />)

      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Deals')
      expect(screen.getAllByRole('columnheader')).toHaveLength(6)
      expect(screen.getAllByRole('row')[0]).toHaveAttribute('aria-rowindex', '1')
    })

    it('has accessible sort buttons', () => {
      render(<DealTable {...defaultProps} />)

      const sortButton = screen.getByRole('button', { name: /sort by value/i })
      expect(sortButton).toHaveAttribute('aria-sort', 'none')
    })

    it('supports keyboard navigation', async () => {
      render(<DealTable {...defaultProps} />)

      const rows = screen.getAllByRole('row')
      rows[1].focus()

      await userEvent.keyboard('{Enter}')
      expect(defaultProps.onDealSelect).toHaveBeenCalledWith(mockDeals[0].id)

      await userEvent.keyboard('{ArrowDown}')
      expect(rows[2]).toHaveFocus()
    })

    it('announces sort changes to screen readers', async () => {
      render(<DealTable {...defaultProps} />)

      const valueHeader = screen.getByRole('columnheader', { name: /value/i })
      await userEvent.click(valueHeader)

      expect(screen.getByRole('alert')).toHaveTextContent(
        /sorted by value in descending order/i
      )
    })
  })
}) 