import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Reusable Error Boundary Component
 * Catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a friendly fallback UI instead of crashing the whole portal.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log the error and component stack in dev / runtime
    console.error(`[ErrorBoundary] Caught error in ${this.props.sectionName || 'Component'}:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div 
          className="portal-card" 
          style={{ 
            padding: '32px 24px', 
            borderRadius: '12px', 
            border: '1px solid #FECACA', 
            background: '#FEF2F2',
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            textAlign: 'center',
            gap: '16px',
            margin: '16px 0'
          }}
          role="alert"
          aria-live="assertive"
        >
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            background: '#FEE2E2', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#DC2626'
          }}>
            <AlertTriangle style={{ width: '24px', height: '24px' }} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#991B1B', margin: '0 0 6px 0' }}>
              {this.props.sectionName ? `${this.props.sectionName} Encountered an Error` : 'Section Render Error'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#B91C1C', margin: 0, maxWidth: '520px' }}>
              An unexpected issue occurred while rendering this module. The rest of the VARSHA AI portal remains fully operational.
            </p>
          </div>

          {this.state.error && (
            <div style={{ 
              background: '#FFFFFF', 
              border: '1px solid #FCA5A5', 
              borderRadius: '6px', 
              padding: '10px 14px', 
              fontSize: '0.75rem', 
              fontFamily: 'var(--font-mono)', 
              color: '#7F1D1D',
              maxWidth: '600px',
              width: '100%',
              textAlign: 'left',
              overflowX: 'auto'
            }}>
              <strong>Error:</strong> {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={this.handleReset}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#DC2626',
                borderColor: '#DC2626',
                color: '#FFFFFF',
                padding: '8px 18px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw style={{ width: '14px', height: '14px' }} />
              Reload Section
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
