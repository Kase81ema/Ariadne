import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import DashboardPage from "./pages/DashboardPage";
import ProfilesPage from "./pages/ProfilesPage";
import CoursesPage from "./pages/CoursesPage";
import EditorialPage from "./pages/EditorialPage";
import RulesPage from "./pages/RulesPage";
import WorkflowPage from "./pages/WorkflowPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import ExportPage from "./pages/ExportPage";
import RepositoryPage from "./pages/RepositoryPage";
import AgentsPage from "./pages/AgentsPage";
import StartCampaignPage from "./pages/StartCampaignPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-[#7B61FF] flex items-center justify-center mx-auto mb-4 animate-pulse" />
          <p className="text-sm text-gray-400">Caricamento...</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/profiles" element={<ProtectedRoute><ProfilesPage /></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
      <Route path="/editorial" element={<ProtectedRoute><EditorialPage /></ProtectedRoute>} />
      <Route path="/rules" element={<ProtectedRoute><RulesPage /></ProtectedRoute>} />
      <Route path="/workflow" element={<ProtectedRoute><WorkflowPage /></ProtectedRoute>} />
      <Route path="/approvals" element={<ProtectedRoute><ApprovalsPage /></ProtectedRoute>} />
      <Route path="/export" element={<ProtectedRoute><ExportPage /></ProtectedRoute>} />
      <Route path="/repository" element={<ProtectedRoute><RepositoryPage /></ProtectedRoute>} />
      <Route path="/agents" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
      <Route path="/start" element={<ProtectedRoute><StartCampaignPage /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
