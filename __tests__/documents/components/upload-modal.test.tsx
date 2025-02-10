import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadModal } from '@/app/(protected)/dashboard/documents/components/upload-modal'
import { mockFiles } from '../fixtures/mock-files'

describe('UploadModal', () => {
  const onUploadComplete = jest.fn()

  beforeEach(() => {
    onUploadComplete.mockClear()
  })

  it('opens when trigger is clicked', async () => {
    render(<UploadModal onUploadComplete={onUploadComplete} />)
    
    await userEvent.click(screen.getByText(/upload files/i))
    
    expect(screen.getByText(/upload documents/i)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('allows folder selection', async () => {
    render(<UploadModal onUploadComplete={onUploadComplete} />)
    
    await userEvent.click(screen.getByText(/upload files/i))
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByText(/technical/i))
    
    expect(screen.getByRole('combobox')).toHaveTextContent(/technical/i)
  })

  it('shows upload progress', async () => {
    render(<UploadModal onUploadComplete={onUploadComplete} />)
    
    await userEvent.click(screen.getByText(/upload files/i))
    
    const dropzone = screen.getByText(/drag and drop/i).parentElement!
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [mockFiles.validPdf]
      }
    })
    
    await userEvent.click(screen.getByText(/^upload/i))
    
    await waitFor(() => {
      expect(screen.getByText(/100%/i)).toBeInTheDocument()
    })
  })

  it('handles multiple files', async () => {
    render(<UploadModal onUploadComplete={onUploadComplete} />)
    
    await userEvent.click(screen.getByText(/upload files/i))
    
    const dropzone = screen.getByText(/drag and drop/i).parentElement!
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [mockFiles.validPdf, mockFiles.validDoc]
      }
    })
    
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
}) 