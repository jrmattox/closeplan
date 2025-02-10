import { validateFile, formatFileSize, uploadFile } from '@/app/(protected)/dashboard/documents/lib/upload-utils'
import { mockFiles } from '../fixtures/mock-files'

describe('validateFile', () => {
  it('should accept valid PDF files', () => {
    const result = validateFile(mockFiles.validPdf)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should accept valid DOCX files', () => {
    const result = validateFile(mockFiles.validDoc)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject files that are too large', () => {
    const result = validateFile(mockFiles.largeFile)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('size exceeds')
  })

  it('should reject files with invalid types', () => {
    const result = validateFile(mockFiles.invalidType)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('type not supported')
  })
})

describe('formatFileSize', () => {
  it('should format bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500.0 B')
  })

  it('should format kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
  })

  it('should format megabytes correctly', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
  })

  it('should format gigabytes correctly', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
  })

  it('should handle decimal places correctly', () => {
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
  })
})

describe('uploadFile', () => {
  it('should call progress callback with increasing values', async () => {
    const onProgress = jest.fn()
    const promise = uploadFile(mockFiles.validPdf, onProgress)
    
    await promise

    expect(onProgress).toHaveBeenCalledTimes(10) // 0% to 100% in 10% increments
    expect(onProgress).toHaveBeenCalledWith(expect.any(Number))
    expect(onProgress).toHaveBeenNthCalledWith(1, 10)
    expect(onProgress).toHaveBeenLastCalledWith(100)
  })

  it('should resolve with a mock URL', async () => {
    const result = await uploadFile(mockFiles.validPdf, () => {})
    expect(result).toBe('mock-file-url')
  })
}) 