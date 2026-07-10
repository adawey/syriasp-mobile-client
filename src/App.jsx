import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import PinPage from './pages/PinPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import IdentityPage from './pages/IdentityPage';
import CardsPage from './pages/CardsPage';
import CardDetailPage from './pages/CardDetailPage';
import IssueCardPage from './pages/IssueCardPage';
import CardKycPage from './pages/CardKycPage';
import NotificationsPage from './pages/NotificationsPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyWhatsAppPage from './pages/VerifyWhatsAppPage';
import OrdersPage from './pages/OrdersPage';
import Layout from './components/Layout';

function ProtectedRoute({ children, requirePin = false }) {
    const { token, loading, pinVerified } = useAuth();
    if (loading)
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    if (!token) return <Navigate to="/login" replace />;
    if (requirePin && !pinVerified) return <Navigate to="/pin" replace />;
    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/pin"
                element={
                    <ProtectedRoute>
                        <PinPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/"
                element={
                    <ProtectedRoute requirePin>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<DashboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="identity" element={<IdentityPage />} />
                <Route path="verify-email" element={<VerifyEmailPage />} />
                <Route path="verify-whatsapp" element={<VerifyWhatsAppPage />} />
                <Route path="cards" element={<CardsPage />} />
                <Route path="cards/:id" element={<CardDetailPage />} />
                <Route path="cards/issue" element={<IssueCardPage />} />
                <Route path="cards/kyc" element={<CardKycPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}
