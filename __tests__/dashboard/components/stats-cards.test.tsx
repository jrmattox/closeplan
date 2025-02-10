import { render, screen } from '@testing-library/react'
import { StatsCards } from '@/app/(protected)/dashboard/components/stats-cards'
import { mockDeals, mockActivities } from '../../utils/mock-dashboard-data'

describe('StatsCards', () => {
  it('calculates and displays correct metrics', () => {
    render(
      <StatsCards 
        deals={mockDeals}
        activities={mockActivities}
        meetings={[]}
      />
    )

    expect(screen.getByText('2')).toBeInTheDocument() // Active deals
    expect(screen.getByText('$750.0k')).toBeInTheDocument() // Pipeline value
    expect(screen.getByText(/from last month/i)).toBeInTheDocument()
  })

  it('shows loading state when data is undefined', () => {
    render(
      <StatsCards 
        deals={undefined}
        activities={undefined}
        meetings={undefined}
      />
    )

    expect(screen.getByTestId('stats-loading')).toBeInTheDocument()
  })

  it('formats currency values correctly', () => {
    render(
      <StatsCards 
        deals={[{ ...mockDeals[0], value: 1500000 }]}
        activities={[]}
        meetings={[]}
      />
    )

    expect(screen.getByText('$1.5M')).toBeInTheDocument()
  })
}) 