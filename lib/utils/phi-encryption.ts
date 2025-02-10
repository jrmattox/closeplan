import { prisma } from '@/lib/prisma'

export async function searchPhi(searchTerm: string) {
  const results = await prisma.$queryRaw`
    SELECT * FROM search_phi(${searchTerm})
  `
  return results
}

export async function rotateEncryptionKey() {
  // Start transaction
  return await prisma.$transaction(async (tx) => {
    // Generate new key
    await tx.$executeRaw`SELECT rotate_encryption_key()`
    
    // Re-encrypt all PHI data
    await tx.$executeRaw`SELECT reencrypt_phi_data()`
  })
}

export async function getPhiWithAudit(dealId: string, userId: string) {
  return await prisma.$transaction(async (tx) => {
    // Log access
    await tx.accessLog.create({
      data: {
        dealId,
        userId,
        action: 'PHI_ACCESS',
        accessType: 'READ',
        resourceType: 'PHI',
        success: true
      }
    })

    // Fetch and decrypt PHI
    const deal = await tx.deal.findUnique({
      where: { id: dealId },
      select: { phi: true }
    })

    return deal?.phi
  })
} 