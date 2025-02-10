import { performance } from 'perf_hooks'
import { encrypt, decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { createDebug } from '@/lib/utils/debug'

const debug = createDebug('perf:profile')

async function runProfile(): Promise<void> {
  debug('Starting performance profiling')

  // Profile encryption
  debug('Profiling encryption...')
  const encryptStart = performance.now()

  for (let i = 0; i < 1000; i++) {
    await encrypt({ test: 'data' })
  }

  debug(
    'Encryption time: %dms',
    performance.now() - encryptStart
  )

  // Profile database queries
  debug('Profiling database queries...')
  const queryStart = performance.now()

  for (let i = 0; i < 1000; i++) {
    await prisma.phiRecord.findMany({
      take: 10,
      select: { id: true }
    })
  }

  debug(
    'Query time: %dms',
    performance.now() - queryStart
  )
}
