import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Spinner from '../components/common/Spinner';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ============ LOAD USER ON APP MOUNT ============
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('🔄 Loading user session...');
        const res = await api.get('/profile');
        console.log('✅ User loaded successfully:', res.data);
        // ✅ FIXED: Access data property from standardized response
        setUser(res.data.data);
      } catch (err) {
        console.log('❌ No valid session:', err.response?.status || err.message);
        console.log('🔍 Error details:', {
          status: err.response?.status,
          data: err.response?.data,
          headers: err.response?.headers,
        });
        setUser(null);
      } finally {
        setLoading(false);
        console.log('🏁 Auth loading complete');
      }
    };
    loadUser();
  }, []);

  // ============ LISTEN FOR UNAUTHORIZED EVENTS ============
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('🔒 Session expired - logging out');
      setUser(null);
      navigate('/login');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [navigate]);

  // ============ LOGIN ============
  const login = async (email, password) => {
    try {
      console.log('🔑 Logging in user:', email);
      const res = await api.post('/auth/login', { email, password });
      // ✅ FIXED: Access data property from standardized response
      const user = res.data.data;
      console.log('✅ Login successful:', user);
      setUser(user);
      return user;
    } catch (err) {
      console.error('❌ Login failed:', err.response?.data || err.message);
      throw err;
    }
  };

  // ============ LOGOUT ============
  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      await api.post('/auth/logout');
      console.log('✅ Logout successful');
    } catch (err) {
      console.error('❌ Logout error:', err.message);
    } finally {
      setUser(null);
      navigate('/login');
    }
  };

  // ============ UPDATE USER ============
  const updateUser = (updatedUser) => {
    console.log('🔄 Updating user:', updatedUser);
    setUser(updatedUser);
  };

  // Show loading spinner during initial auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1120]">
        <Spinner size="lg" color="blue" label="Loading your session...">
          <p className="text-gray-400 mt-4">Please wait</p>
        </Spinner>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};