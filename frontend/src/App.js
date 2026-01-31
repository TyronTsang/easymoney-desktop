import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import MasterPasswordScreen from "./pages/MasterPasswordScreen";
import LoginScreen from "./pages/LoginScreen";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CreateLoan from "./pages/CreateLoan";
import LoanList from "./pages/LoanList";
import LoanDetails from "./pages/LoanDetails";
import FraudAlerts from "./pages/FraudAlerts";
import Export from "./pages/Export";
import AdminPanel from "./pages/AdminPanel";
import AuditLogs from "./pages/AuditLogs";
import Layout from "./components/Layout";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isAppUnlocked } = useAuth();
  
  if (!isAppUnlocked) {
    return <Navigate to="/unlock" replace />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isAppUnlocked } = useAuth();
  
  if (!isAppUnlocked) {
    return <Navigate to="/unlock" replace />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

const UnlockRoute = ({ children }) => {
  const { isAppUnlocked, isAuthenticated } = useAuth();
  
  if (isAppUnlocked && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (isAppUnlocked) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/unlock" element={<UnlockRoute><MasterPasswordScreen /></UnlockRoute>} />
      <Route path="/login" element={<PublicRoute><LoginScreen /></PublicRoute>} />
      
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/loans/new" element={<ProtectedRoute><CreateLoan /></ProtectedRoute>} />
      <Route path="/loans" element={<ProtectedRoute><LoanList /></ProtectedRoute>} />
      <Route path="/loans/:loanId" element={<ProtectedRoute><LoanDetails /></ProtectedRoute>} />
      <Route path="/fraud-alerts" element={<ProtectedRoute><FraudAlerts /></ProtectedRoute>} />
      <Route path="/export" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><Export /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
      
      <Route path="/" element={<Navigate to="/unlock" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
