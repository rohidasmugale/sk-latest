// pages/supervisor/WorkQueryPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Home, Users, ClipboardList, MessageCircle, User, BarChart3, Settings, LogOut, Building2, MapPin } from "lucide-react";
import { useRole } from "@/context/RoleContext";
import { WorkQueryList } from "@/components/shared/WorkQueryList";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

const DashboardHeader = ({ title, subtitle, onMenuClick }: DashboardHeaderProps) => (
  <motion.header
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4 sticky top-0 z-40 shadow-sm"
  >
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
        <Menu className="h-5 w-5" />
      </Button>
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  </motion.header>
);

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  userName: string;
}

const MobileNavDrawer = ({ isOpen, onClose, onNavigate, userName }: MobileNavDrawerProps) => {
  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/supervisor' },
    { icon: Users, label: 'Employees', path: '/supervisor/employees' },
    { icon: ClipboardList, label: 'Tasks', path: '/supervisor/tasks' },
    { icon: MessageCircle, label: 'Work Queries', path: '/supervisor/work-queries' },
    { icon: User, label: 'Profile', path: '/supervisor/profile' },
    { icon: BarChart3, label: 'Reports', path: '/supervisor/reports' },
    { icon: Settings, label: 'Settings', path: '/supervisor/settings' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/50 z-50 lg:hidden" />
          <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl z-50 lg:hidden">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <nav className="space-y-2">
                  {navItems.map((item) => (
                    <Button key={item.path} variant="ghost" className="w-full justify-start gap-3"
                      onClick={() => { onNavigate(item.path); onClose(); }}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Button>
                  ))}
                </nav>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <Button variant="ghost" className="w-full justify-start gap-3 text-red-600"
                  onClick={() => { localStorage.removeItem('sk_user'); window.location.href = '/login'; }}>
                  <LogOut className="h-4 w-4" /><span>Logout</span>
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const WorkQueryPage = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ onMenuClick?: () => void }>();
  const { user: authUser, role, isAuthenticated, loading: authLoading } = useRole();

  const [supervisorInfo, setSupervisorInfo] = useState({
    id: "", name: "", email: "", department: "", site: ""
  });
  const [loadingSupervisor, setLoadingSupervisor] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    if (authUser) {
      setSupervisorInfo({
        id: authUser._id || authUser.id || "",
        name: authUser.name || "Supervisor",
        email: authUser.email || "",
        department: authUser.department || "",
        site: authUser.site || ""
      });
    } else {
      try {
        const storedUser = localStorage.getItem('sk_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setSupervisorInfo({
            id: parsed._id || parsed.id || "",
            name: parsed.name || "Supervisor User",
            email: parsed.email || "",
            department: parsed.department || "",
            site: parsed.site || ""
          });
        }
      } catch (e) {
        console.error("Error loading supervisor from storage:", e);
      }
    }
    setLoadingSupervisor(false);
  }, [authUser, isAuthenticated, authLoading]);

  const handleMenuClick = () => {
    if (outletContext?.onMenuClick) outletContext.onMenuClick();
    else setMobileMenuOpen(true);
  };

  if (authLoading || loadingSupervisor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading supervisor data...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || role !== 'supervisor') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>Only supervisors can access the Work Query Management page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')} className="w-full">Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Work Query Management"
        subtitle="Report and track issues with facility services"
        onMenuClick={handleMenuClick}
      />
      <MobileNavDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onNavigate={navigate}
        userName={supervisorInfo.name}
      />
      <div className="p-4 md:p-6">
        <WorkQueryList mode="supervisor" supervisorInfo={supervisorInfo} />
      </div>
    </div>
  );
};

export default WorkQueryPage;