import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedLayout } from './components/layout/ProtectedLayout';
import { Layout } from './components/layout/Layout';
import { Training } from './pages/Training';
import { Community } from './pages/Community';
import { Wars } from './pages/Wars';
import { Profile } from './pages/Profile';
import { Activities } from './pages/Activities';
import { ActivityDetail } from './pages/ActivityDetail';
import { Challenges } from './pages/Challenges';
import { Notifications } from './pages/Notifications';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { StravaCallback } from './pages/StravaCallback';
import { LiveWorkout } from './pages/LiveWorkout';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route element={<ProtectedLayout />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Training />} />
              <Route path="/activities" element={<Activities />} />
              <Route path="/activities/:id" element={<ActivityDetail />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/community" element={<Community />} />
              <Route path="/wars" element={<Wars />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/strava/callback" element={<StravaCallback />} />
              <Route path="/workout" element={<LiveWorkout />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
