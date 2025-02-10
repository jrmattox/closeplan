import { render, screen, fireEvent } from '@testing-library/react'
import { StakeholderTable } from '@/app/(protected)/dashboard/stakeholders/components/stakeholder-table'
import { mockStakeholders } from '../../utils/mock-stakeholders'

describe('StakeholderTable', () => {
  it('renders stakeholder data correctly', () => {
    render(<StakeholderTable stakeholders={mockStakeholders} />)

    expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument()
    expect(screen.getByText('City Hospital')).toBeInTheDocument()
    expect(screen.getByText('ECONOMIC_BUYER')).toBeInTheDocument()
  })

  it('filters stakeholders by role', async () => {
    render(<StakeholderTable stakeholders={mockStakeholders} />)

    fireEvent.click(screen.getByText('Filter'))
    fireEvent.click(screen.getByText('IT'))

    expect(screen.getByText('James Wilson')).toBeInTheDocument()
    expect(screen.queryByText('Dr. Sarah Chen')).not.toBeInTheDocument()
  })

  it('makes email addresses clickable', () => {
    render(<StakeholderTable stakeholders={mockStakeholders} />)

    const emailLink = screen.getByText('schen@cityhospital.com')
    expect(emailLink.tagName).toBe('A')
    expect(emailLink).toHaveAttribute('href', 'mailto:schen@cityhospital.com')
  })
}) 