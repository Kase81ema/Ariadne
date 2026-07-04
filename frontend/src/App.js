import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import CoursesPage from "./pages/CoursesPage";
import RepositoryPage from "./pages/RepositoryPage";
import CommunityDashboardPage from "./pages/CommunityDashboardPage";
import FeedPage from "./pages/FeedPage";
import UsersAdminPage from "./pages/UsersAdminPage";
import BannersAdminPage from "./pages/BannersAdminPage";
import CommunityEventsPage from "./pages/CommunityEventsPage";
import InboxPage from "./pages/InboxPage";
import RoutingRulesPage from "./pages/RoutingRulesPage";
import EmailTemplatesPage from "./pages/EmailTemplatesPage";
import CohortsAdminPage from "./pages/CohortsAdminPage";
import MaterialsPage from "./pages/MaterialsPage";
import MyJourneyPage from "./pages/MyJourneyPage";
import AssistantPage from "./pages/AssistantPage";
import WelcomePage from "./pages/WelcomePage";
import CourseDetailPage from "./pages/CourseDetailPage";
import TrainingCoursesPage from "./pages/TrainingCoursesPage";
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

function DefaultRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/community" replace />;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Scuola e community (tutti i ruoli) */}
      <Route path="/community" element={<ProtectedRoute><CommunityDashboardPage /></ProtectedRoute>} />
      <Route path="/welcome" element={<ProtectedRoute><WelcomePage /></ProtectedRoute>} />
      <Route path="/course/:courseId" element={<ProtectedRoute><CourseDetailPage /></ProtectedRoute>} />
      <Route path="/training-courses" element={<ProtectedRoute><TrainingCoursesPage /></ProtectedRoute>} />
      <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
      <Route path="/community/events" element={<ProtectedRoute><CommunityEventsPage /></ProtectedRoute>} />
      <Route path="/my-journey" element={<ProtectedRoute><MyJourneyPage /></ProtectedRoute>} />
      <Route path="/materials" element={<ProtectedRoute><MaterialsPage /></ProtectedRoute>} />
      <Route path="/assistant" element={<ProtectedRoute><AssistantPage /></ProtectedRoute>} />

      {/* Admin only */}
      <Route path="/courses" element={<ProtectedRoute requiredRole="admin"><CoursesPage /></ProtectedRoute>} />
      <Route path="/repository" element={<ProtectedRoute requiredRole="admin"><RepositoryPage /></ProtectedRoute>} />
      <Route path="/inbox" element={<ProtectedRoute requiredRole="admin"><InboxPage /></ProtectedRoute>} />
      <Route path="/routing-rules" element={<ProtectedRoute requiredRole="admin"><RoutingRulesPage /></ProtectedRoute>} />
      <Route path="/email-templates" element={<ProtectedRoute requiredRole="admin"><EmailTemplatesPage /></ProtectedRoute>} />
      <Route path="/users-admin" element={<ProtectedRoute requiredRole="admin"><UsersAdminPage /></ProtectedRoute>} />
      <Route path="/cohorts-admin" element={<ProtectedRoute requiredRole="admin"><CohortsAdminPage /></ProtectedRoute>} />
      <Route path="/banners-admin" element={<ProtectedRoute requiredRole="admin"><BannersAdminPage /></ProtectedRoute>} />

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
