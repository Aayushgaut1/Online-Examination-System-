import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { CreateExamPage } from './pages/CreateExamPage';
import { ExamInterfacePage } from './pages/ExamInterfacePage';
import { ResultPage } from './pages/ResultPage';
import { StudentAnalyticsPage } from './pages/StudentAnalyticsPage';

function AppContent() {
  const { user, isAuthenticated, isTeacher, isStudent, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('landing');
  const [viewParams, setViewParams] = useState<any>({});

  // Router navigation helper
  const handleNavigate = (view: string, params: any = {}) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentView(view);
    setViewParams(params);
  };

  // If user signs in on landing, auto-direct to their appropriate dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && currentView === 'landing') {
      setCurrentView(isTeacher ? 'teacher-dashboard' : 'student-dashboard');
    }
  }, [isAuthenticated, isTeacher, isLoading, currentView]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm font-bold font-['Outfit'] tracking-wide">NexusExam Online Examination System</p>
          <p className="text-xs text-slate-400 font-mono">Initializing secure connection & schema verification...</p>
        </div>
      </div>
    );
  }

  const isExamMode = currentView === 'exam-interface';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Hide standard navbar in full-screen exam mode to prevent distraction */}
      {!isExamMode && <Navbar currentView={currentView} onNavigate={handleNavigate} />}

      {/* Main Routed Page Content */}
      <main className="flex-1 flex flex-col">
        {currentView === 'landing' && <LandingPage onNavigate={handleNavigate} />}

        {currentView === 'auth' && (
          <AuthPage initialTab={viewParams?.tab || 'login'} onNavigate={handleNavigate} />
        )}

        {currentView === 'student-dashboard' && (
          <StudentDashboard onNavigate={handleNavigate} />
        )}

        {currentView === 'teacher-dashboard' && (
          <TeacherDashboard onNavigate={handleNavigate} />
        )}

        {currentView === 'create-exam' && (
          <CreateExamPage onNavigate={handleNavigate} />
        )}

        {currentView === 'exam-interface' && (
          <ExamInterfacePage attemptId={viewParams.attemptId} onNavigate={handleNavigate} />
        )}

        {currentView === 'result-analysis' && (
          <ResultPage resultId={viewParams.resultId} onNavigate={handleNavigate} />
        )}

        {currentView === 'student-analytics' && (
          <StudentAnalyticsPage onNavigate={handleNavigate} />
        )}
      </main>

      {/* Hide footer in exam mode */}
      {!isExamMode && <Footer onNavigate={handleNavigate} />}
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
