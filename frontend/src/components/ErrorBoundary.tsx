import React from 'react'

type ErrorBoundaryProps = {
  children: React.ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  message: string
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Unknown runtime error' }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('UI runtime error:', error, errorInfo)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full rounded-xl border border-[#30363d] bg-[#161b22] p-6">
            <h1 className="text-lg font-bold text-[#f85149] mb-3">Frontend Runtime Error</h1>
            <p className="text-sm text-[#8b949e] mb-2">The UI crashed while rendering. Integration services may still be running.</p>
            <pre className="text-xs bg-black/30 p-3 rounded border border-[#30363d] overflow-auto">{this.state.message}</pre>
            <button
              className="mt-4 px-4 py-2 text-sm font-bold rounded bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/50"
              onClick={() => window.location.reload()}
            >
              Reload UI
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
