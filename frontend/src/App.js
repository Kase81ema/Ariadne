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
import CommunityDashboardPage from "./pages/CommunityDashboardPage";
import FeedPage from "./pages/FeedPage";
import UsersAdminPage from "./pages/UsersAdminPage";
import BannersAdminPage from "./pages/BannersAdminPage";
import CommunityEventsPage from "./pages/CommunityEventsPage";
import PlaceholderPage from "./pages/PlaceholderPage";

function ProtectedRoute({ children, requiredRole }) {
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
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/community" replace />;
  }
  return <Layout>{children}</Layout>;
}

function AdminEditorRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin' && user.role !== 'editor') return <Navigate to="/community" replace />;
  return <Layout>{children}</Layout>;
}

function DefaultRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'user') return <Navigate to="/community" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Studio comunicazione (admin/editor) */}
      <Route path="/dashboard" element={<AdminEditorRoute><DashboardPage /></AdminEditorRoute>} />
      <Route path="/profiles" element={<AdminEditorRoute><ProfilesPage /></AdminEditorRoute>} />
      <Route path="/courses" element={<AdminEditorRoute><CoursesPage /></AdminEditorRoute>} />
      <Route path="/editorial" element={<AdminEditorRoute><EditorialPage /></AdminEditorRoute>} />
      <Route path="/rules" element={<AdminEditorRoute><RulesPage /></AdminEditorRoute>} />
      <Route path="/workflow" element={<AdminEditorRoute><WorkflowPage /></AdminEditorRoute>} />
      <Route path="/approvals" element={<AdminEditorRoute><ApprovalsPage /></AdminEditorRoute>} />
      <Route path="/export" element={<AdminEditorRoute><ExportPage /></AdminEditorRoute>} />
      <Route path="/repository" element={<AdminEditorRoute><RepositoryPage /></AdminEditorRoute>} />
      <Route path="/agents" element={<AdminEditorRoute><AgentsPage /></AdminEditorRoute>} />
      <Route path="/start" element={<AdminEditorRoute><StartCampaignPage /></AdminEditorRoute>} />

      {/* Scuola e community (tutti i ruoli) */}
      <Route path="/community" element={<ProtectedRoute><CommunityDashboardPage /></ProtectedRoute>} />
      <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
      <Route path="/community/events" element={<ProtectedRoute><CommunityEventsPage /></ProtectedRoute>} />
      <Route path="/my-journey" element={<ProtectedRoute><PlaceholderPage title="Il mio percorso" description="Formazione, credenziale e business" backTo="/community" /></ProtectedRoute>} />
      <Route path="/materials" element={<ProtectedRoute><PlaceholderPage title="Materiali" description="Materiali per percorso ed edizione" backTo="/community" /></ProtectedRoute>} />
      <Route path="/assistant" element={<ProtectedRoute><PlaceholderPage title="Assistente" description="Chiedi informazioni su corsi e servizi" backTo="/community" /></ProtectedRoute>} />

      {/* Admin/Editor only - Scuola e community management */}
      <Route path="/inbox" element={<AdminEditorRoute><PlaceholderPage title="Inbox" description="Gestione richieste in ingresso" backTo="/community" /></AdminEditorRoute>} />
      <Route path="/routing-rules" element={<AdminEditorRoute><PlaceholderPage title="Regole smistamento" description="Configurazione regole di assegnazione automatica" backTo="/community" /></AdminEditorRoute>} />
      <Route path="/email-templates" element={<AdminEditorRoute><PlaceholderPage title="Template email" description="Modelli per risposte rapide" backTo="/community" /></AdminEditorRoute>} />
      <Route path="/users-admin" element={<AdminEditorRoute><UsersAdminPage /></AdminEditorRoute>} />
      <Route path="/cohorts-admin" element={<AdminEditorRoute><PlaceholderPage title="Cohort e materiali" description="Gestione percorsi, edizioni e materiali" backTo="/community" /></AdminEditorRoute>} />
      <Route path="/banners-admin" element={<AdminEditorRoute><BannersAdminPage /></AdminEditorRoute>} />

      <Route path="/" element={<DefaultRedirect />} />
      <Route path="*" element={<DefaultRedirect />} />
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
