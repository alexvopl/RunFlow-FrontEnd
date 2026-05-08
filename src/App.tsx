import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedLayout } from './components/layout/ProtectedLayout';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { AuthCallback } from './pages/auth/AuthCallback';

const Training       = lazy(() => import('./pages/Training').then(m => ({ default: m.Training })));
const Activities     = lazy(() => import('./pages/Activities').then(m => ({ default: m.Activities })));
const ActivityDetail = lazy(() => import('./pages/ActivityDetail').then(m => ({ default: m.ActivityDetail })));
const Challenges     = lazy(() => import('./pages/Challenges').then(m => ({ default: m.Challenges })));
const Community      = lazy(() => import('./pages/Community').then(m => ({ default: m.Community })));
const Wars           = lazy(() => import('./pages/Wars').then(m => ({ default: m.Wars })));
const Profile        = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Notifications  = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const StravaCallback = lazy(() => import('./pages/StravaCallback').then(m => ({ default: m.StravaCallback })));
const LiveWorkout    = lazy(() => import('./pages/LiveWorkout').then(m => ({ default: m.LiveWorkout })));
const TrainingZones  = lazy(() => import('./pages/TrainingZones').then(m => ({ default: m.TrainingZones })));
const Equipment      = lazy(() => import('./pages/Equipment').then(m => ({ default: m.Equipment })));
const Admin          = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={null}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected */}
            <Route element={<ProtectedLayout />}>
              <Route path="/admin" element={<Admin />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Training />} />
                <Route path="/activities" element={<Activities />} />
                <Route path="/activities/:id" element={<ActivityDetail />} />
                <Route path="/challenges" element={<Challenges />} />
                <Route path="/challenges/:challengeId" element={<Challenges />} />
                <Route path="/challenge/:challengeId" element={<Challenges />} />
                <Route path="/community" element={<Community />} />
                <Route path="/clans/:clanId" element={<Community />} />
                <Route path="/clan/:clanId" element={<Community />} />
                <Route path="/wars" element={<Wars />} />
                <Route path="/wars/:warId" element={<Wars />} />
                <Route path="/wars/:warId/battles/:battleId" element={<Wars />} />
                <Route path="/war/:warId" element={<Wars />} />
                <Route path="/battle/:battleId" element={<Wars />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/notifications/:notificationId" element={<Notifications />} />
                <Route path="/notification/:notificationId" element={<Notifications />} />
                <Route path="/strava/callback" element={<StravaCallback />} />
                <Route path="/workout" element={<LiveWorkout />} />
                <Route path="/zones" element={<TrainingZones />} />
                <Route path="/equipment" element={<Equipment />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
