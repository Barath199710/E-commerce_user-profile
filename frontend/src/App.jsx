import React, { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MyOrders } from './pages/MyOrders';
import { ProfilePage } from './pages/ProfilePage';
import { AdminOrders } from './pages/admin/AdminOrders';
import { ProductForm } from './components/ProductForm';
import { ProductDetail } from './components/ProductDetail';
import { ShieldAlert } from 'lucide-react';
import api from './api/client';
import { useToast } from './hooks/useToast';

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiCallCount, setApiCallCount] = useState(0);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const { showToast } = useToast();

  const incrementApiCounter = useCallback(() => {
    setApiCallCount((prev) => prev + 1);
  }, []);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleOpenDetailModal = (product) => {
    setDetailProduct(product);
    setIsDetailOpen(true);
  };

  const handleOrderFromModal = async (product) => {
    if (!isAuthenticated) {
      showToast('Please log in to place an order.', 'error');
      setActiveTab('login');
      return;
    }

    try {
      await api.post('/api/orders', {
        product_id: product.id,
        items_count: 1,
      });
      showToast(`Order placed for "${product.name}"!`, 'success');
      setActiveTab('my_orders');
    } catch (err) {
      console.error('Order error:', err);
      showToast(err.response?.data?.error || 'Failed to place order.', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', color: '#64748b' }}>
        <p style={{ fontSize: '16px', fontWeight: '500' }}>Initializing JWT Auth session...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'login':
        return <Login onSuccessRedirect={(targetTab) => setActiveTab(targetTab)} />;
      case 'register':
        return <Register onSuccessRedirect={(targetTab) => setActiveTab(targetTab)} />;
      case 'profile':
        if (!isAuthenticated) {
          return <Login onSuccessRedirect={() => setActiveTab('profile')} />;
        }
        return <ProfilePage />;
      case 'my_orders':
        if (!isAuthenticated) {
          return <Login onSuccessRedirect={() => setActiveTab('my_orders')} />;
        }
        return <MyOrders />;
      case 'admin':
        if (!isAuthenticated) {
          return <Login onSuccessRedirect={() => setActiveTab('admin')} />;
        }
        if (!isAdmin) {
          return (
            <div style={{ maxWidth: '600px', margin: '60px auto', padding: '32px', background: '#fff', borderRadius: '16px', border: '1px solid #fee2e2', textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#fef2f2', color: '#dc2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <ShieldAlert size={30} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#991b1b', margin: '0 0 8px' }}>
                403 — Access Denied (Admin Required)
              </h2>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px' }}>
                Your current JWT token role is <strong>"{user?.role}"</strong>. Admin credentials (e.g. <code>admin@example.com</code>) are required to access this dashboard.
              </p>
              <button
                onClick={() => setActiveTab('login')}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                Switch to Admin Account
              </button>
            </div>
          );
        }
        return <AdminOrders onIncrementApiCounter={incrementApiCounter} />;
      case 'home':
      default:
        return (
          <Home
            searchQuery={searchQuery}
            onOpenAddModal={handleOpenAddModal}
            onOpenEditModal={handleOpenEditModal}
            onOpenDetailModal={handleOpenDetailModal}
            onIncrementApiCounter={incrementApiCounter}
            onNavigateToOrders={() => setActiveTab('my_orders')}
            onNavigateToLogin={() => setActiveTab('login')}
          />
        );
    }
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={handleOpenAddModal}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        apiCallCount={apiCallCount}
      />

      <main style={{ marginTop: '24px' }}>
        {renderContent()}
      </main>

      {/* Product Modals */}
      {isAdmin && (
        <ProductForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onProductSaved={() => {
            window.dispatchEvent(new Event('product-saved'));
          }}
          initialData={editingProduct}
        />
      )}

      <ProductDetail
        product={detailProduct}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onOrder={handleOrderFromModal}
      />

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
