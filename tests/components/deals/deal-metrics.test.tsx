import { render, screen, within } from '@/tests/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { DealMetrics } from '@/components/deals'
import { mockDeals } from '@/tests/utils'
import { formatCurrency, formatHealthcareMetrics } from '@/lib/utils'
import type { Deal, DealStage } from '@/types/deals'

describe('DealMetrics', () => {
  const defaultProps = {
    deals: mockDeals,
    timeframe: 'month' as const,
  }

  describe('Pipeline Calculations', () => {
    it('calculates total pipeline value correctly', () => {
      render(<DealMetrics {...defaultProps} />)

      const totalValue = mockDeals.reduce((sum, deal) => sum + deal.value, 0)
      expect(screen.getByTestId('total-pipeline'))
        .toHaveTextContent(formatCurrency(totalValue))
    })

    it('shows win rate percentage', () => {
      const dealsWithWon = [
        ...mockDeals,
        {
          ...mockDeals[0],
          id: 'deal_3',
          stage: 'CLOSED_WON',
          value: 300000
        }
      ]

      render(<DealMetrics {...defaultProps} deals={dealsWithWon} />)

      // 1 won out of 3 total = 33.33%
      expect(screen.getByTestId('win-rate'))
        .toHaveTextContent('33.33%')
    })

    it('displays deal count by stage', () => {
      render(<DealMetrics {...defaultProps} />)

      const stageBreakdown = screen.getByTestId('stage-breakdown')
      expect(within(stageBreakdown).getByText('Technical Review')).toHaveTextContent('1')
      expect(within(stageBreakdown).getByText('Clinical Validation')).toHaveTextContent('1')
    })

    it('calculates average deal size', () => {
      render(<DealMetrics {...defaultProps} />)

      const avgValue = mockDeals.reduce((sum, deal) => sum + deal.value, 0) / mockDeals.length
      expect(screen.getByTestId('avg-deal-size'))
        .toHaveTextContent(formatCurrency(avgValue))
    })
  })

  describe('Timeframe Filtering', () => {
    it('shows weekly metrics', () => {
      render(<DealMetrics {...defaultProps} timeframe="week" />)

      const weeklyDeals = mockDeals.filter(deal => {
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        return new Date(deal.lastActivity) >= oneWeekAgo
      })

      const weeklyValue = weeklyDeals.reduce((sum, deal) => sum + deal.value, 0)
      expect(screen.getByTestId('timeframe-pipeline'))
        .toHaveTextContent(formatCurrency(weeklyValue))
    })

    it('displays quarterly comparison', () => {
      render(<DealMetrics {...defaultProps} timeframe="quarter" />)

      expect(screen.getByTestId('quarter-growth')).toBeInTheDocument()
      expect(screen.getByTestId('quarter-comparison')).toHaveTextContent(/vs last quarter/i)
    })

    it('handles date range calculations', () => {
      render(<DealMetrics {...defaultProps} />)

      const dateRange = screen.getByTestId('date-range')
      expect(dateRange).toHaveTextContent(/last 30 days/i)
    })
  })

  describe('Department Filtering', () => {
    it('shows radiology department metrics', () => {
      render(<DealMetrics {...defaultProps} department="RADIOLOGY" />)

      const radiologyDeals = mockDeals.filter(deal => 
        deal.name.toLowerCase().includes('radiology') ||
        deal.name.toLowerCase().includes('pacs')
      )

      const deptValue = radiologyDeals.reduce((sum, deal) => sum + deal.value, 0)
      expect(screen.getByTestId('department-pipeline'))
        .toHaveTextContent(formatCurrency(deptValue))
    })

    it('displays department-specific KPIs', () => {
      render(<DealMetrics {...defaultProps} department="RADIOLOGY" />)

      expect(screen.getByTestId('dept-implementation-time'))
        .toHaveTextContent(/avg implementation: 45 days/i)
      expect(screen.getByTestId('dept-satisfaction-score'))
        .toHaveTextContent(/satisfaction: 4.5\/5/i)
    })

    it('shows cross-department comparisons', () => {
      render(<DealMetrics {...defaultProps} />)

      const comparison = screen.getByTestId('dept-comparison')
      expect(comparison).toHaveTextContent(/radiology leads by 25%/i)
    })
  })

  describe('Healthcare Analytics', () => {
    it('shows clinical validation metrics', () => {
      render(<DealMetrics {...defaultProps} />)

      const validation = screen.getByTestId('clinical-validation')
      expect(validation).toHaveTextContent(/avg validation: 14 days/i)
      expect(validation).toHaveTextContent(/success rate: 85%/i)
    })

    it('displays compliance approval rates', () => {
      render(<DealMetrics {...defaultProps} />)

      const compliance = screen.getByTestId('compliance-metrics')
      expect(compliance).toHaveTextContent(/hipaa compliance: 100%/i)
      expect(compliance).toHaveTextContent(/avg approval time: 7 days/i)
    })

    it('shows implementation timeline analysis', () => {
      render(<DealMetrics {...defaultProps} />)

      const timeline = screen.getByTestId('implementation-timeline')
      expect(timeline).toHaveTextContent(/technical setup: 21 days/i)
      expect(timeline).toHaveTextContent(/clinical training: 14 days/i)
    })

    it('displays stakeholder engagement metrics', () => {
      render(<DealMetrics {...defaultProps} />)

      const engagement = screen.getByTestId('stakeholder-engagement')
      expect(engagement).toHaveTextContent(/key stakeholder meetings: 8/i)
      expect(engagement).toHaveTextContent(/clinical champion status: active/i)
    })
  })

  describe('Display States', () => {
    it('shows loading skeleton', () => {
      render(<DealMetrics {...defaultProps} deals={undefined} />)

      expect(screen.getByTestId('metrics-skeleton')).toBeInTheDocument()
      expect(screen.queryByTestId('total-pipeline')).not.toBeInTheDocument()
    })

    it('handles empty department data', () => {
      render(<DealMetrics {...defaultProps} department="CARDIOLOGY" />)

      expect(screen.getByText(/no deals in cardiology/i)).toBeInTheDocument()
      expect(screen.getByText(/start tracking cardiology deals/i)).toBeInTheDocument()
    })

    it('displays zero state metrics properly', () => {
      render(<DealMetrics {...defaultProps} deals={[]} />)

      expect(screen.getByTestId('total-pipeline')).toHaveTextContent('$0')
      expect(screen.getByTestId('win-rate')).toHaveTextContent('0%')
    })

    it('shows error state', () => {
      render(<DealMetrics {...defaultProps} deals={null} />)

      expect(screen.getByText(/error loading metrics/i)).toBeInTheDocument()
      expect(screen.getByText(/try refreshing the page/i)).toBeInTheDocument()
    })
  })
}) 