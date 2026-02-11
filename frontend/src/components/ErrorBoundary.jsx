import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '2rem',
                    background: '#500000', // Dark red for visibility
                    color: 'white',
                    height: '100vh',
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    zIndex: 999999, // Ensure it's on top
                    position: 'relative'
                }}>
                    <h1>⚠️ Something went wrong.</h1>
                    <h2 style={{ color: '#ff4444' }}>{this.state.error && this.state.error.toString()}</h2>
                    <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '2rem',
                            padding: '10px 20px',
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
