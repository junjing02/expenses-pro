import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="cyber-card rounded-3xl p-6 border border-rose-500/20 bg-rose-950/5 text-center space-y-4 my-6">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-455">Dashboard Widget Fault</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              An error occurred while rendering this section:
            </p>
            <div className="mt-2.5 p-3 bg-slate-900/60 border border-white/5 rounded-xl text-left text-[10px] font-mono text-rose-400 overflow-x-auto max-w-sm mx-auto">
              {this.state.error?.toString() || 'Unknown Runtime Error'}
            </div>
          </div>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-slate-900 border border-white/5 hover:bg-slate-850 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 mx-auto transition-colors active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Portal</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
