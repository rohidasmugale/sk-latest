import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoleProvider, useRole } from "@/context/RoleContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Auth Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Layouts
import SuperAdminLayout from "./layouts/SuperAdminLayout";
import AdminLayout from "./layouts/AdminLayout";
import ManagerLayout from "./layouts/ManagerLayout";
import SupervisorLayout from "./layouts/SupervisorLayout";
import EmployeeLayout from "./layouts/EmployeeLayout";

// Dashboards
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import SupervisorDashboard from "./pages/supervisor/SupervisorDashboard";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";

// Super Admin Pages
import UsersRoles from "./pages/superadmin/UsersRoles";
import UsersRolesManagement from "./pages/superadmin/UsersRolesManagement";
import Managers from "./pages/superadmin/Managers";
import Supervisors from "./pages/superadmin/Supervisors";
import Employees from "./pages/superadmin/Employees";
import Documents from "./pages/superadmin/Documents";
import Operations from "./pages/superadmin/Operations";
import Notifications from "./pages/superadmin/Notifications";
import HRMS from "./pages/superadmin/HRMS";
import CRM from "./pages/superadmin/CRM";
import ERP from "./pages/superadmin/ERP";
import Reports from "./pages/superadmin/Reports";
import Settings from "./pages/superadmin/Settings";
import AttendanceTab from "./pages/superadmin/AttendanceTab";

// Admin Pages
import AdminProfile from "./pages/admin/Profile";
import AdminTeam from "./pages/admin/Team";
import AdminTasks from "./pages/admin/Tasks";
import AdminReports from "./pages/admin/AdminReports";
import AdminCRM from "./pages/admin/AdminCRM";
import AdminERP from "./pages/admin/AdminERP";
import Billing from "./components/shared/Billing";


import AdminOperations from "./pages/admin/AdminOperations";
import AdminDocuments from "./pages/admin/AdminDocuments";
import AdminLeave from "./pages/admin/Leave";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminSettings from "./pages/admin/AdminSettings";

// Manager Pages
import ManagerProfile from "./pages/manager/Profile";
import ManagerSupervisors from "./pages/manager/Supervisors";
import ManagerTasks from "./pages/manager/ManagerTasks";
import ManagerReports from "./pages/manager/ManagerReports";
import ManagerLeave from "./pages/manager/Leave";

import ManagerOperations from "./pages/manager/ManagerOperations";
import ManagerNotifications from "./pages/manager/ManagerNotifications";
import ManagerSettings from "./pages/manager/ManagerSettings";
// import ManagerNotifications from "./pages/manager/ManagerNotifications";

// Supervisor Pages
import SupervisorProfile from "./pages/supervisor/Profile";
import SupervisorReports from "./pages/supervisor/SupervisorReports";
import SupervisorLeave from "./pages/supervisor/Leave";
import Tasks from "./pages/supervisor/Tasks";
import Attendance from "./pages/supervisor/Attendance";
import SupervisorSettings from "./pages/supervisor/SupervisorSettings";
import InventoryPage from "./pages/supervisor/InventoryPage"; // ADD THIS IMPORT
import MachineStatus from "./pages/supervisor/MachineStatus";
import GroomingStatus from "./pages/supervisor/GroomingStatus";
import IncidentReports from "./pages/supervisor/IncidentReports";
import CleaningPhotos from "./pages/supervisor/CleaningPhotos";
import ShiftDeployment from "./pages/supervisor/ShiftDeployment";
import SalarySlip from "./pages/supervisor/SalarySlip";
// Employee Pages
import EmployeeTasks from "./pages/employee/EmployeeTasks";
import EmployeeDocuments from "./pages/employee/EmployeeDocuments";

import ApplyLeave from "./pages/employee/ApplyLeave";
import EmployeeAttendance from "./pages/employee/EmployeeAttendance";

import NotFound from "./pages/NotFound";
import ManagerAttendance from "./pages/manager/ManagerAttendance";
import SuperAdminWorkIssues from "./pages/superadmin/SuperAdminWorkIssues";
import AdminAttendanceView from "./pages/admin/AdminAttendanceView";
import AdminHRMS from "./pages/admin/AdminHRMS";
import SupervisorAssignTask from "./pages/supervisor/SupervisorAssignTask";
import ManagerAssignTask from "./pages/manager/ManagerAssignTask";
import SuperAdminReports from "./pages/superadmin/SuperAdminReports";
import ManagerSites from "./pages/manager/ManagerSites";

import SupervisorTrainingBriefing from "./pages/supervisor/SupervisorTrainingBriefing";
import SiteMachinesView from "./pages/superadmin/SiteMachinesView";
//import { AuthProvider } from "./contexts/AuthContext";
// import AdminCRM from "./pages/admin/AdminCRM";


import ManagerMachineStatus from '@/pages/manager/ManagerMachineStatus';
import ManagerGrooming from '@/pages/manager/ManagerGrooming';
import ManagerIncidents from '@/pages/manager/ManagerIncidents';
import ManagerCleaningPhotos from '@/pages/manager/ManagerCleaningPhotos';
import ManagerShiftDeployment from '@/pages/manager/ManagerShiftDeployment';
import ManagerTraining from '@/pages/manager/ManagerTraining';
import ManagerBriefing from '@/pages/manager/ManagerBriefing';

import { NotificationProvider } from '@/context/NotificationContext';
import SupervisorNotification from "./pages/supervisor/SupervisorNotification";
import SuperAdminProfile from "./pages/superadmin/Profile";

// Add this after your imports
const RootRedirect = () => {
  const { isAuthenticated, user, loading } = useRole();

  // 🔥 DEBUG: Check localStorage directly
  const storedUser = localStorage.getItem("sk_user");
  const storedToken = localStorage.getItem("sk_token");

  console.log('🔀 RootRedirect - DETAILED CHECK:', {
    loading,
    isAuthenticated,
    role: user?.role,
    userEmail: user?.email,
    hasStoredUser: !!storedUser,
    hasStoredToken: !!storedToken,
    storedUserData: storedUser,
  });

  if (loading) {
    console.log('⏳ Still loading...');
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>;
  }

  // 🔥 Try to set auth from localStorage if state is lost
  if (!isAuthenticated && storedUser && storedToken) {
    console.log('⚠️ isAuthenticated is false but localStorage has data!');
    // Force reload to trigger checkAuth again
    window.location.reload();
    return null;
  }

  if (isAuthenticated && user?.role) {
    const dashboardPath = `/${user.role}/dashboard`;
    console.log(`✅ Redirecting to: ${dashboardPath}`);
    return <Navigate to={dashboardPath} replace />;
  }

  console.log('🔴 Not authenticated, redirecting to login');
  return <Navigate to="/login" replace />;
};
const queryClient = new QueryClient();
const App = () => (
  <QueryClientProvider client={queryClient}>
    <RoleProvider>
      <NotificationProvider>
        {/* <AuthProvider> */}
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}

              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />


              {/* Super Admin Routes */}
              <Route
                path="/superadmin"
                element={
                  <ProtectedRoute allowedRoles={["superadmin"]}>
                    <SuperAdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<SuperAdminDashboard />} />
                <Route path="users" element={<UsersRolesManagement />} />
                <Route path="managers" element={<Managers />} />
                <Route path="supervisors" element={<Supervisors />} />
                <Route path="employees" element={<Employees />} />
                <Route path="hrms" element={<HRMS />} />
                <Route path="documents" element={<Documents />} />
                <Route path="workissue" element={<SuperAdminWorkIssues />} />
                <Route path="operations" element={<Operations />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="crm" element={<CRM />} />
                <Route path="erp" element={<ERP />} />
                <Route path="site-visits" element={<SuperAdminReports />} />
                <Route path="billing" element={<Billing />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
                <Route path="attendaceview" element={<AttendanceTab />} />
                <Route path="profile" element={<SuperAdminProfile />} />

                <Route path="/superadmin/machines/:siteId" element={<SiteMachinesView />} />
              </Route>

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="profile" element={<AdminProfile />} />
                <Route path="team" element={<AdminTeam />} />
                <Route path="attendance" element={<AdminAttendanceView />} />
                <Route path="tasks" element={<AdminTasks />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="leave" element={<AdminLeave />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="crm" element={<AdminCRM />} />
                <Route path="erp" element={<AdminERP />} />
                <Route path="billing" element={<Billing />} />
                <Route path="operations" element={<AdminOperations />} />
                <Route path="documents" element={<AdminDocuments />} />
                <Route path="hrms" element={<AdminHRMS />} />

                <Route path="notifications" element={<AdminNotifications />} />


              </Route>


              {/* Manager Routes */}
              <Route
                path="/manager"
                element={
                  <ProtectedRoute allowedRoles={["manager"]}>
                    <ManagerLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<ManagerDashboard />} />
                <Route path="profile" element={<ManagerProfile />} />
                <Route path="supervisors" element={<ManagerSupervisors />} />
                <Route path="tasks" element={<ManagerTasks />} />
                <Route path="reports" element={<ManagerReports />} />
                <Route path="leave" element={<ManagerLeave />} />
                <Route path="operations" element={<ManagerOperations />} />
                <Route path="managerattendance" element={<ManagerAttendance />} />
                <Route path="notifications" element={<ManagerNotifications />} />
                <Route path="settings" element={<ManagerSettings />} />
                <Route path="sites" element={<ManagerSites />} />
                <Route path="assigntask" element={<ManagerAssignTask />} />
                <Route path="/manager/machine-status" element={<ManagerMachineStatus />} />
                <Route path="/manager/grooming" element={<ManagerGrooming />} />
                <Route path="/manager/incidents" element={<ManagerIncidents />} />
                <Route path="/manager/cleaning-photos" element={<ManagerCleaningPhotos />} />
                <Route path="/manager/shift-deployment" element={<ManagerShiftDeployment />} />
                <Route path="/manager/training" element={<ManagerTraining />} />
                <Route path="/manager/briefing" element={<ManagerBriefing />} />

                <Route path="notifications" element={<ManagerNotifications />} />


              </Route>

              {/* Supervisor Routes */}
              <Route
                path="/supervisor"
                element={
                  <ProtectedRoute allowedRoles={["supervisor"]}>
                    <SupervisorLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<SupervisorDashboard />} />
                <Route path="profile" element={<SupervisorProfile />} />
                <Route path="tasks" element={<Tasks />} />

                <Route path="inventory" element={<InventoryPage />} /> {/* ADD THIS ROUTE */}

                <Route path="attendance" element={<Attendance />} />
                <Route path="leave" element={<SupervisorLeave />} />
                <Route path="reports" element={<SupervisorReports />} />
                <Route path="settings" element={<SupervisorSettings />} />
                <Route path="assigntask" element={<SupervisorAssignTask />} />
                <Route path="supervisortraining" element={<SupervisorTrainingBriefing />} />

                <Route path="machine-status" element={<MachineStatus />} />
                <Route path="grooming" element={<GroomingStatus />} />
                <Route path="incidents" element={<IncidentReports />} />
                <Route path="cleaning-photos" element={<CleaningPhotos />} />
                <Route path="shift-deployment" element={<ShiftDeployment />} />
                <Route path="salary-slip" element={<SalarySlip />} />
                <Route path="notifications" element={<SupervisorNotification />} />
              </Route>

              {/* Employee Routes */}
              <Route
                path="/employee"
                element={
                  <ProtectedRoute allowedRoles={["employee"]}>
                    <EmployeeLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<EmployeeDashboard />} />
                <Route path="tasks" element={<EmployeeTasks />} />
                <Route path="documents" element={<EmployeeDocuments />} />
                <Route path="salary" element={<SalarySlip />} />
                <Route path="leave" element={<ApplyLeave />} />
                <Route path="attendance" element={<EmployeeAttendance />} />
                <Route path="notifications" element={<Notifications />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </NotificationProvider>
      {/* </AuthProvider> */}
    </RoleProvider>
  </QueryClientProvider>
);

export default App;