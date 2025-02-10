import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DragDropZone } from '@/app/(protected)/dashboard/documents/components/drag-drop-zone'
import { mockFiles } from '../fixtures/mock-files'

describe('DragDropZone', () => {
  const onFilesDrop = jest.fn()

  beforeEach(() => {
    onFilesDrop.mockClear()
  })

  it('renders initial state correctly', () => {
    render(<DragDropZone onFilesDrop={onFilesDrop} />)
    
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
    expect(screen.getByText(/supported formats/i)).toBeInTheDocument()
  })

  it('shows active state when dragging', () => {
    render(<DragDropZone onFilesDrop={onFilesDrop} />)
    
    const dropzone = screen.getByText(/drag and drop/i).parentElement!
    
    fireEvent.dragEnter(dropzone)
    expect(screen.getByText(/drop files here/i)).toBeInTheDocument()
    expect(dropzone).toHaveClass('border-blue-500')
    
    fireEvent.dragLeave(dropzone)
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
    expect(dropzone).not.toHaveClass('border-blue-500')
  })

  it('handles valid file drops', async () => {
    render(<DragDropZone onFilesDrop={onFilesDrop} />)
    
    const dropzone = screen.getByText(/drag and drop/i).parentElement!
    
    const files = [mockFiles.validPdf]
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files
      }
    })
    
    expect(onFilesDrop).toHaveBeenCalledWith(files)
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
  })

  it('shows error for invalid files', () => {
    render(<DragDropZone onFilesDrop={onFilesDrop} />)
    
    const dropzone = screen.getByText(/drag and drop/i).parentElement!
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [mockFiles.invalidType]
      }
    })
    
    expect(onFilesDrop).not.toHaveBeenCalled()
    expect(screen.getByText(/file type not supported/i)).toBeInTheDocument()
  })
}) 