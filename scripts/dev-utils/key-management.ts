import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/encryption'
import { generateKey } from '@/lib/utils/key-generation'
import chalk from 'chalk'

interface KeyOperation {
  action: 'CREATE' | 'ROTATE' | 'VERIFY' | 'LIST'
  version?: number
  purpose?: string
}

export async function manageKeys(operation: KeyOperation): Promise<void> {
  try {
    switch (operation.action) {
      case 'CREATE':
        await createDevKey(operation.purpose || 'development')
        break
      case 'ROTATE':
        await rotateDevKey(operation.version)
        break
      case 'VERIFY':
        await verifyKeys()
        break
      case 'LIST':
        await listKeys()
        break
    }
  } catch (error) {
    console.error(chalk.red('Key management error:'), error)
    process.exit(1)
  }
}

async function createDevKey(purpose: string): Promise<void> {
  const key = await generateKey()

  await prisma.encryptionKeys.create({
    data: {
      version: 1,
      purpose,
      keyValue: await encrypt(key),
      active: true,
      metadata: {
        environment: 'development',
        createdBy: process.env.USER
      }
    }
  })

  console.log(chalk.green('✓ Development key created'))
}

async function verifyKeys(): Promise<void> {
  const keys = await prisma.encryptionKeys.findMany({
    where: { active: true }
  })

  for (const key of keys) {
    try {
      // Test encryption/decryption
      const testData = { test: 'data' }
      const encrypted = await encrypt(testData, key.id)
      const decrypted = await decrypt(encrypted, key.id)

      console.log(chalk.green(`✓ Key ${key.id} verified`))
    } catch (error) {
      console.error(chalk.red(`✗ Key ${key.id} verification failed`), error)
    }
  }
}
