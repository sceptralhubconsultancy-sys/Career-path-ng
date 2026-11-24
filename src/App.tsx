import { Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import Assessment from './pages/Assessment';
import Results from './pages/Results';
import Offer from './pages/Offer';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PathShift render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAF7] text-[#1C1917] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E8E6E0] rounded-[16px] p-8 text-center shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-sm text-[#6B6A65] mb-6">
              Please reload the page to continue your PathShift assessment.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-3 rounded-[12px] bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-sm cursor-pointer"
            >
              Reload PathShift
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/assess" element={<Assessment />} />
          <Route path="/results" element={<Results />} />
          <Route path="/offer" element={<Offer />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
