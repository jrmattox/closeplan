import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import { formatHealthcareMetrics } from './utils'
import { prisma } from '@/lib/prisma'
import { generateTestKey } from '@/tests/utils/key-generation'
import { clearTestData } from '@/tests/utils/cleanup'

// Extend Vitest's expect method with Testing Library matchers
expect.extend(matchers)

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Global mocks
vi.mock('@/lib/utils', () => ({
  formatCurrency: (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value),
  ...formatHealthcareMetrics
}))

// Mock date for consistent testing
vi.setSystemTime(new Date('2024-02-15'))

// Mock IntersectionObserver (used by shadcn/ui)
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
})
window.IntersectionObserver = mockIntersectionObserver

// Mock ResizeObserver
window.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock window.matchMedia (used by shadcn/ui)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

beforeAll(async () => {
  // Generate test encryption key
  await generateTestKey()

  // Clear any existing test data
  await clearTestData()
})

afterAll(async () => {
  await prisma.$disconnect()
})

afterEach(async () => {
  // Clear tenant context
  await prisma.$executeRaw`SELECT set_tenant_context(NULL)`

  // Clear test data created during test
  await clearTestData()
})
