import { Suspense } from "react";
import { Navigate, Route, Routes, useRoutes } from "react-router-dom";
import routes from "tempo-routes";
import LoginForm from "./components/auth/LoginForm";
import SignUpForm from "./components/auth/SignUpForm";
import ForgotPasswordForm from "./components/auth/ForgotPasswordForm";
import ResetPasswordForm from "./components/auth/ResetPasswordForm";
import Dashboard from "./components/pages/dashboard";
import Products from "./components/pages/products";
import Orders from "./components/pages/orders";
import Suppliers from "./components/pages/suppliers";
import Shops from "./components/pages/shops";
import Invoices from "./components/pages/invoices";
import InvoiceDetailPage from "./components/pages/invoice-detail";
import SellProduct from "./components/pages/sell-product";
import Success from "./components/pages/success";
import Home from "./components/pages/home";
import Profile from "./components/pages/profile";
import Employees from "./components/pages/employees";
import Costs from "./components/pages/costs";
import { AuthProvider, useAuth } from "../supabase/auth";
import { Toaster } from "./components/ui/toaster";
import { LoadingScreen, LoadingSpinner } from "./components/ui/loading-spinner";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen text="Authenticating..." />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen text="Authenticating..." />;
  }

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginForm />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <SignUpForm />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordForm />
            </PublicRoute>
          }
        />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/products"
          element={
            <PrivateRoute>
              <Products />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/shops"
          element={
            <PrivateRoute>
              <Shops />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/suppliers"
          element={
            <PrivateRoute>
              <Suppliers />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/orders"
          element={
            <PrivateRoute>
              <Orders />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/invoices"
          element={
            <PrivateRoute>
              <Invoices />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/invoices/:id"
          element={
            <PrivateRoute>
              <InvoiceDetailPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/dashboard/sell-product"
          element={
            <PrivateRoute>
              <SellProduct />
            </PrivateRoute>
          }
        />
        <Route path="/success" element={<Success />} />

        {/* Profile route */}
        <Route
          path="/dashboard/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />

        {/* Employee management route */}
        <Route
          path="/dashboard/employees"
          element={
            <PrivateRoute>
              <Employees />
            </PrivateRoute>
          }
        />

        {/* Other costs route */}
        <Route
          path="/dashboard/costs"
          element={
            <PrivateRoute>
              <Costs />
            </PrivateRoute>
          }
        />

        {/* Add this before any catchall route */}
        {import.meta.env.VITE_TEMPO && <Route path="/tempobook/*" />}

        {/* Catch-all route for dashboard paths */}
        <Route
          path="/dashboard/*"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
      </Routes>
      {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen text="Loading application..." />}>
        <AppRoutes />
      </Suspense>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
