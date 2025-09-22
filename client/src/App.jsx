import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import TeacherDashboard from './components/TeacherDashboard';
import JoinClassroom from './components/JoinClassroom';
import StudentDashboard from "./components/StudentDashboard";
import StudentProgress from "./components/StudentProgress";
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import SettingsDropdown from './components/SettingsDropdown';
import './App.css';

// Global console error capture
window.consoleErrors = [];

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }
        } else {
          setCurrentUser(null);
          setUserRole('');
        }
      } catch (error) {
        console.error("Error in onAuthStateChanged:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/signin" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Dashboard Layout Component
const DashboardLayout = ({ children, userRole, currentUser, onLogout }) => {
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserName = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const displayName = userData.displayName || userData.firstName || userData.email?.split('@')[0] || 'User';
          setUserName(displayName);
        } else {
          setUserName(currentUser.email?.split('@')[0] || 'User');
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        setUserName(currentUser.email?.split('@')[0] || 'User');
      } finally {
        setLoading(false);
      }
    };

    fetchUserName();
  }, [currentUser]);

  if (!currentUser || loading) {
    return <div className="loading">Loading user...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-role">({userRole})</span>
          </div>
          <div className="header-actions">
            <SettingsDropdown currentUser={currentUser} />
            <button className="btn-logout" onClick={onLogout}>Log Out</button>
          </div>
        </div>
      </header>
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
};

// Teacher Routes Component
const TeacherRoutes = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }
        } else {
          setCurrentUser(null);
          setUserRole('');
        }
      } catch (error) {
        console.error("Error in onAuthStateChanged:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <DashboardLayout userRole={userRole} currentUser={currentUser} onLogout={handleLogout}>
      <Routes>
        {/* Teacher Dashboard Routes */}
        <Route path="/" element={<TeacherDashboard />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        
        {/* Classroom Management Routes */}
        <Route path="/classrooms" element={<TeacherDashboard />} />
        <Route path="/classroom/:classroomId" element={<TeacherDashboard />} />
        
        {/* Unit Management Routes */}
        <Route path="/classroom/:classroomId/units" element={<TeacherDashboard />} />
        <Route path="/classroom/:classroomId/unit/:unitId" element={<TeacherDashboard />} />
        
        {/* Lesson Management Routes */}
        <Route path="/classroom/:classroomId/unit/:unitId/lessons" element={<TeacherDashboard />} />
        <Route path="/classroom/:classroomId/unit/:unitId/lesson/:lessonId" element={<TeacherDashboard />} />
        
        {/* Analytics Routes */}
        <Route path="/classroom/:classroomId/analytics" element={<TeacherDashboard />} />
        <Route path="/classroom/:classroomId/analytics/overview" element={<TeacherDashboard />} />
        <Route path="/classroom/:classroomId/analytics/unit/:unitId" element={<TeacherDashboard />} />
        <Route path="/classroom/:classroomId/analytics/student/:studentId" element={<TeacherDashboard />} />
        
        {/* Catch all other teacher routes */}
        <Route path="*" element={<Navigate to="/teacher" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

// Student Routes Component
const StudentRoutes = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUser(user);
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          }
        } else {
          setCurrentUser(null);
          setUserRole('');
        }
      } catch (error) {
        console.error("Error in onAuthStateChanged:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <DashboardLayout userRole={userRole} currentUser={currentUser} onLogout={handleLogout}>
      <div className="student-container">
        <div className="student-sidebar">
          <JoinClassroom />
        </div>
        <div className="student-main">
          <Routes>
            {/* Student Dashboard Routes */}
            <Route path="/" element={<StudentDashboard />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            
            {/* Classroom Routes */}
            <Route path="/classrooms" element={<StudentDashboard />} />
            <Route path="/classroom/:classroomId" element={<StudentDashboard />} />
            
            {/* Unit Routes */}
            <Route path="/classroom/:classroomId/units" element={<StudentDashboard />} />
            <Route path="/classroom/:classroomId/unit/:unitId" element={<StudentDashboard />} />
            
            {/* Lesson Routes */}
            <Route path="/classroom/:classroomId/unit/:unitId/lessons" element={<StudentDashboard />} />
            <Route path="/classroom/:classroomId/unit/:unitId/lesson/:lessonId" element={<StudentDashboard />} />
            
            {/* Progress Tracking Routes */}
            <Route path="/classroom/:classroomId/progress" element={<StudentProgress />} />
            <Route path="/classroom/:classroomId/progress/overview" element={<StudentProgress />} />
            <Route path="/classroom/:classroomId/progress/unit/:unitId" element={<StudentProgress />} />
            <Route path="/classroom/:classroomId/progress/unit/:unitId/lesson/:lessonId" element={<StudentProgress />} />
            
            {/* Leaderboard Routes */}
            <Route path="/classroom/:classroomId/leaderboard" element={<StudentDashboard />} />
            
            {/* Game Assignment Routes */}
            <Route path="/classroom/:classroomId/unit/:unitId/game/:gameId" element={<StudentDashboard />} />
            
            {/* Catch all other student routes */}
            <Route path="*" element={<Navigate to="/student" replace />} />
          </Routes>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Main App Component
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Console error capture
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      window.consoleErrors.push({
        type: 'error',
        message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
        timestamp: new Date().toISOString()
      });
      originalError.apply(console, args);
    };
    
    console.warn = (...args) => {
      window.consoleErrors.push({
        type: 'warning',
        message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
        timestamp: new Date().toISOString()
      });
      originalWarn.apply(console, args);
    };

    const handleError = (event) => {
      window.consoleErrors.push({
        type: 'unhandled',
        message: event.error?.message || 'Unknown error',
        stack: event.error?.stack || '',
        timestamp: new Date().toISOString()
      });
    };

    const handleUnhandledRejection = (event) => {
      window.consoleErrors.push({
        type: 'promise',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack || '',
        timestamp: new Date().toISOString()
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        try {
          if (user) {
            setCurrentUser(user);
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const role = userDoc.data().role;
              setUserRole(role);
            } else {
              // User exists in Firebase Auth but not in Firestore
              // This could be a user from the old project - create a new user document
              console.log('User not found in Firestore, creating new user document...');
              
              // Create a basic user document
              await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                firstName: user.displayName?.split(' ')[0] || 'User',
                lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                displayName: user.displayName || user.email,
                role: 'student', // Default role
                createdAt: new Date().toISOString()
              });
              
              setUserRole('student');
            }
          } else {
            setCurrentUser(null);
            setUserRole('');
          }
        } catch (error) {
          console.error("Error in onAuthStateChanged:", error);
          // If it's an auth error, sign out the user to clear invalid tokens
          if (error.code === 'auth/user-token-expired' || error.code === 'auth/invalid-credential') {
            console.log('Auth token expired or invalid, signing out user...');
            await signOut(auth);
          }
          setError(error.message);
        } finally {
            setLoading(false);
          }
        });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      setError(error.message);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading...</h2>
        <p>Initializing authentication...</p>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            currentUser ? (
              userRole === 'teacher' ? (
                <Navigate to="/teacher" replace />
              ) : userRole === 'student' ? (
                <Navigate to="/student" replace />
              ) : (
                <div style={{ padding: '20px', color: 'white', minHeight: '100vh', background: '#0f172a' }}>
                  <h2>Loading user role...</h2>
                  <p>User: {currentUser.email}</p>
                  <p>Role: {userRole || 'Loading...'}</p>
                  {error && <p style={{ color: 'red' }}>Error: {error}</p>}
                  <div style={{ marginTop: '20px' }}>
                    <button 
                      onClick={() => window.location.reload()} 
                      style={{ marginRight: '10px', padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Refresh Page
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          await signOut(auth);
                          window.location.href = '/';
                        } catch (error) {
                          console.error('Error signing out:', error);
                          window.location.href = '/';
                        }
                      }}
                      style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )
            ) : (
              <LandingPage />
            )
          } />
          
          {/* Auth Routes */}
          <Route path="/signup" element={
            currentUser ? (
              userRole === 'teacher' ? (
                <Navigate to="/teacher" replace />
              ) : userRole === 'student' ? (
                <Navigate to="/student" replace />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <AuthPage initialMode="signup" />
            )
          } />
          <Route path="/signin" element={
            currentUser ? (
              userRole === 'teacher' ? (
                <Navigate to="/teacher" replace />
              ) : userRole === 'student' ? (
                <Navigate to="/student" replace />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <AuthPage initialMode="signin" />
            )
          } />
          
          {/* Protected Teacher Routes */}
          <Route path="/teacher/*" element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherRoutes />
            </ProtectedRoute>
          } />
          
          {/* Protected Student Routes */}
          <Route path="/student/*" element={
            <ProtectedRoute requiredRole="student">
              <StudentRoutes />
            </ProtectedRoute>
          } />
          
          {/* Catch all other routes */}
          <Route path="*" element={
            currentUser ? (
              userRole === 'teacher' ? (
                <Navigate to="/teacher" replace />
              ) : userRole === 'student' ? (
                <Navigate to="/student" replace />
              ) : (
                <Navigate to="/" replace />
              )
            ) : (
              <Navigate to="/" replace />
            )
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
