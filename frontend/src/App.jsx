import React, { createContext, useState, useEffect, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ConfigProvider, theme, Layout, Button, Space, Typography } from 'antd';
import { LogoutOutlined, FolderOpenOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CaseDetail from './pages/CaseDetail';
import Register from './pages/Register';

const { Header, Content, Footer } = Layout;
const { Text, Title } = Typography;

// Configure Axios Default URL
// In development, it points to local port 5000, in production it falls back to Render backend API
axios.defaults.baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://case-tracker-evo3.onrender.com/api' : 'http://localhost:5000/api');

// Request interceptor to automatically attach authorization header
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication Context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Route wrapper for authenticated users
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null; // Avoid redirecting during state rehydration
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Main Layout Wrapper
const MainLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0 24px',
          height: '64px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderOpenOutlined style={{ fontSize: '24px', color: '#6366f1' }} />
          <Title level={4} style={{ margin: 0, color: '#f8fafc', fontWeight: 600 }}>
            Case<span style={{ color: '#6366f1' }}>Tracker</span>
          </Title>
        </Link>

        {user && (
          <Space size="middle">
            <Space style={{ marginRight: '16px' }}>
              <UserOutlined style={{ color: '#94a3b8' }} />
              <Text strong style={{ color: '#cbd5e1' }}>
                {user.fullName}
              </Text>
              <Text
                style={{
                  fontSize: '11px',
                  background: user.role === 'Manager' ? '#b45309' : '#0369a1',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {user.role}
              </Text>
            </Space>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={logout}
              style={{ color: '#f1f5f9' }}
            >
              Logout
            </Button>
          </Space>
        )}
      </Header>

      <Content style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {children}
      </Content>

      <Footer
        style={{
          textAlign: 'center',
          background: 'transparent',
          color: '#64748b',
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          padding: '20px',
        }}
      >
        CaseTracker ©2026 Operations Case Portal
      </Footer>
    </Layout>
  );
};

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1', // sleek indigo
          colorBgBase: '#0f172a',  // slate 900
          borderRadius: 8,
          fontFamily: "'Inter', sans-serif",
        },
        components: {
          Card: {
            colorBgContainer: 'rgba(30, 41, 59, 0.7)',
          },
          Table: {
            colorBgContainer: 'transparent',
          },
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/signup" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cases/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CaseDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
