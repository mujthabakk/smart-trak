import { createBrowserRouter, Navigate } from 'react-router-dom'

// Auth
import SplashScreen from '@/pages/auth/SplashScreen'
import Login from '@/pages/auth/Login'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import OTPVerification from '@/pages/auth/OTPVerification'
import ResetPassword from '@/pages/auth/ResetPassword'

// Public
import Landing from '@/pages/public/Landing'
import Pricing from '@/pages/public/Pricing'
import FAQ from '@/pages/public/FAQ'
import Contact from '@/pages/public/Contact'
import Onboarding from '@/pages/public/Onboarding'
import Confirmation from '@/pages/public/Confirmation'

// Super Admin
import SuperAdminDashboard from '@/pages/super-admin/Dashboard'
import Schools from '@/pages/super-admin/Schools'
import AddSchool from '@/pages/super-admin/AddSchool'
import SchoolProfile from '@/pages/super-admin/SchoolProfile'
import Subscriptions from '@/pages/super-admin/Subscriptions'
import Plans from '@/pages/super-admin/Plans'
import BulkMessaging from '@/pages/super-admin/BulkMessaging'
import SupportTickets from '@/pages/super-admin/SupportTickets'
import UserManagement from '@/pages/super-admin/UserManagement'
import Training from '@/pages/super-admin/Training'
import SuperAdminReports from '@/pages/super-admin/Reports'
import SuperAdminSettings from '@/pages/super-admin/Settings'

// School Admin
import SchoolAdminDashboard from '@/pages/school-admin/Dashboard'
import Students from '@/pages/school-admin/Students'
import AddEditStudent from '@/pages/school-admin/AddEditStudent'
import StudentProfile from '@/pages/school-admin/StudentProfile'
import Drivers from '@/pages/school-admin/Drivers'
import Buses from '@/pages/school-admin/Buses'
import Routes from '@/pages/school-admin/Routes'
import LiveMap from '@/pages/school-admin/LiveMap'
import Attendance from '@/pages/school-admin/Attendance'
import Leave from '@/pages/school-admin/Leave'
import Notifications from '@/pages/school-admin/Notifications'
import LostFound from '@/pages/school-admin/LostFound'
import BusTransfer from '@/pages/school-admin/BusTransfer'
import GuestDrivers from '@/pages/school-admin/GuestDrivers'
import Support from '@/pages/school-admin/Support'
import SchoolReports from '@/pages/school-admin/Reports'
import SchoolAdminSettings from '@/pages/school-admin/Settings'

// Shared
import Profile from '@/pages/shared/Profile'
import AuditLogs from '@/pages/shared/AuditLogs'
import HelpCenter from '@/pages/shared/HelpCenter'
import NotFound from '@/pages/shared/NotFound'

export const router = createBrowserRouter([
  // Public / marketing
  { path: '/', element: <Landing /> },
  { path: '/splash', element: <SplashScreen /> },
  { path: '/pricing', element: <Pricing /> },
  { path: '/faq', element: <FAQ /> },
  { path: '/contact', element: <Contact /> },
  { path: '/onboarding', element: <Onboarding /> },
  { path: '/confirmation', element: <Confirmation /> },

  // Auth
  { path: '/login', element: <Login /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/otp', element: <OTPVerification /> },
  { path: '/reset-password', element: <ResetPassword /> },

  // Super Admin
  { path: '/super-admin', element: <Navigate to="/super-admin/dashboard" replace /> },
  { path: '/super-admin/dashboard', element: <SuperAdminDashboard /> },
  { path: '/super-admin/schools', element: <Schools /> },
  { path: '/super-admin/schools/add', element: <AddSchool /> },
  { path: '/super-admin/schools/:id', element: <SchoolProfile /> },
  { path: '/super-admin/subscriptions', element: <Subscriptions /> },
  { path: '/super-admin/plans', element: <Plans /> },
  { path: '/super-admin/bulk-messaging', element: <BulkMessaging /> },
  { path: '/super-admin/support', element: <SupportTickets /> },
  { path: '/super-admin/users', element: <UserManagement /> },
  { path: '/super-admin/training', element: <Training /> },
  { path: '/super-admin/reports', element: <SuperAdminReports /> },
  { path: '/super-admin/settings', element: <SuperAdminSettings /> },
  { path: '/super-admin/audit-logs', element: <AuditLogs /> },
  { path: '/super-admin/profile', element: <Profile /> },

  // School Admin
  { path: '/school-admin', element: <Navigate to="/school-admin/dashboard" replace /> },
  { path: '/school-admin/dashboard', element: <SchoolAdminDashboard /> },
  { path: '/school-admin/students', element: <Students /> },
  { path: '/school-admin/students/add', element: <AddEditStudent /> },
  { path: '/school-admin/students/:id', element: <StudentProfile /> },
  { path: '/school-admin/drivers', element: <Drivers /> },
  { path: '/school-admin/buses', element: <Buses /> },
  { path: '/school-admin/routes', element: <Routes /> },
  { path: '/school-admin/live-map', element: <LiveMap /> },
  { path: '/school-admin/attendance', element: <Attendance /> },
  { path: '/school-admin/leave', element: <Leave /> },
  { path: '/school-admin/notifications', element: <Notifications /> },
  { path: '/school-admin/lost-found', element: <LostFound /> },
  { path: '/school-admin/bus-transfer', element: <BusTransfer /> },
  { path: '/school-admin/guest-drivers', element: <GuestDrivers /> },
  { path: '/school-admin/support', element: <Support /> },
  { path: '/school-admin/reports', element: <SchoolReports /> },
  { path: '/school-admin/settings', element: <SchoolAdminSettings /> },
  { path: '/school-admin/profile', element: <Profile /> },
  { path: '/school-admin/help', element: <HelpCenter /> },

  // 404
  { path: '*', element: <NotFound /> },
])

export default router
