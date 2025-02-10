import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@/components/theme-provider'

interface ProvidersProps {
  children: ReactNode;
}

const Providers = ({ children }: ProvidersProps) => {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { route, ...rest } = options || {}

  if (route) {
    window.history.pushState({}, 'Test page', route)
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Providers, ...rest })
  }
}

export * from '@testing-library/react'
export { customRender as render } 