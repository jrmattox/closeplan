export const createMockFile = (
  name: string,
  type: string,
  size: number
): File => {
  const file = new File([''], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

export const mockFiles = {
  validPdf: createMockFile('test.pdf', 'application/pdf', 1024 * 1024), // 1MB
  validDoc: createMockFile('test.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 2 * 1024 * 1024), // 2MB
  largeFile: createMockFile('large.pdf', 'application/pdf', 15 * 1024 * 1024), // 15MB
  invalidType: createMockFile('test.exe', 'application/x-msdownload', 1024 * 1024),
}

export const mockUploadProgress = {
  start: { progress: 0, status: 'uploading' as const },
  middle: { progress: 50, status: 'uploading' as const },
  complete: { progress: 100, status: 'success' as const },
  error: { progress: 30, status: 'error' as const, error: 'Upload failed' },
} 