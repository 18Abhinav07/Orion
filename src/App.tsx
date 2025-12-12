import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { ping } from "./api/authApi";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Marketplace from "./pages/marketplace/marketplace";
import NewMarketplace from "./pages/marketplace/NewMarketplace";
import Admin from "./pages/admin/admin";
import Issuer from "./pages/Issuer/issuer";
import NewIssuerDashboard from "./pages/Issuer/newIssuerDashboard";
import About from "./pages/about/about";
import Dashboard from "./pages/dashboard/dashboard";
import Login from "./pages/login/login";
import ManagerDashboard from "./pages/managerdashboard/managerDashboard";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
// Import debug utilities to make them available globally
import "./utils/metadataDebugUtils";
import "./utils/ipfsTestScript";
import "./utils/dummyDataUtils";
import "./utils/cacheCleanupScript";
import OrderBookPage from "./pages/orderbook/OrderBookPage";
import TradingPage from "./pages/trading/TradingPage";
import TestMinting from "./pages/TestMinting";
import LicenseAttachment from "./pages/LicenseAttachment";
import "./styles/HeroBackground.css";

const App = () => {

  return (
  <TooltipProvider>
    <BrowserRouter>
      <AuthProvider>
        <div className="relative min-h-screen">
          <div className="content">
            <Toaster />
            <Sonner />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes */}
              <Route
                path="/"
                element={
                    <Index />
                }
              />
              <Route
                path="/about"
                element={
                 
                    <About />
                }
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Admin />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/issuer" 
                element={
                    <NewIssuerDashboard />
                } 
              />
             
              <Route 
                path="/dashboard" 
                element={
                    <Dashboard />
                } 
              />
              <Route 
                path="/marketplace" 
                element={
                    <NewMarketplace />
                } 
              />
              
              <Route 
                path="/orderbook" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'issuer', 'manager', 'user']}>
                    <OrderBookPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/trading/:tokenId" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'issuer', 'manager', 'user']}>
                    <TradingPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/test-minting" 
                element={<TestMinting />} 
              />
              <Route 
                path="/license-attachment" 
                element={<LicenseAttachment />} 
              />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
  );
};

export default App;