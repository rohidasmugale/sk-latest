// pages/superadmin/SuperadminWorkQueries.tsx
import { useNavigate, useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
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
      {onMenuClick && (
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      )}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  </motion.header>
);

const SuperadminWorkQueries = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext<{ onMenuClick?: () => void }>();
  const { isAuthenticated, role } = useRole();

  if (!isAuthenticated || role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>Only Superadmins can access this page.</CardDescription>
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
        subtitle="View and manage all work queries from all supervisors"
        onMenuClick={outletContext?.onMenuClick}
      />
      <div className="p-4 md:p-6">
        <WorkQueryList mode="superadmin" />
      </div>
    </div>
  );
};

export default SuperadminWorkQueries;