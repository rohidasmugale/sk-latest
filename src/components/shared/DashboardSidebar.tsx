import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  Settings,
  LogOut,
  Building2,
  ClipboardList,
  UserCog,
  Shield,
  Briefcase,
  BarChart3,
  DollarSign,
  Bell,
  Menu,
  X,
  Workflow,
  Package,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  RotateCwSquareIcon,
  icons,
  User2Icon
} from "lucide-react";
import { useRole, UserRole } from "@/context/RoleContext";
import { motion, AnimatePresence } from "framer-motion";
import SKLogo from "@/assets/images/SKLogo.ico";


// Separate component for Inventory button
const InventoryNavItem = ({
  collapsed,
  mobileOpen,
  basePath
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  basePath: string;
}) => {
  const location = useLocation();
  const isActive = location.pathname.includes('/inventory');

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      <NavLink
        to={`${basePath}/inventory`}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
          "hover:bg-sidebar-accent/20",
          "hover:shadow-sm hover:border-l-4 hover:border-l-sidebar-accent",
          isActive
            ? "bg-sidebar-accent/20 text-sidebar-accent-foreground shadow-sm border-l-4 border-l-sidebar-accent"
            : "text-sidebar-foreground/80"
        )}
      >
        <div className={cn(
          "p-2 rounded-lg transition-all duration-200",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "bg-sidebar-accent/10 group-hover:bg-sidebar-accent/20"
        )}>
          <Package className="h-4 w-4" />
        </div>
        {(!collapsed || mobileOpen) && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            className="flex-1 flex items-center justify-between"
          >
            <span className="text-sm font-medium">Inventory</span>
            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        )}
        {isActive && !collapsed && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-accent rounded-r-full"
          />
        )}
      </NavLink>
    </motion.div>
  );
};

const getSidebarItems = (role: UserRole) => {
  const baseItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "dashboard" },
  ];

  switch (role) {
    case "superadmin":
      return [
        ...baseItems,


        { name: "Operations", icon: ClipboardList, path: "operations" },
        { name: "Machine Invetory", icon: ClipboardList, path: "erp" },
        { name: "Billing & Finance", icon: DollarSign, path: "billing" },
        { name: "Site Visits", icon: Calendar, path: "site-visits" },
        { name: "Users & Roles", icon: UserCog, path: "users" },
        { name: "HRMS", icon: Users, path: "hrms" },

      ];

    case "admin":
      return [
        ...baseItems,



        { name: "Machine Inventory", icon: ClipboardList, path: "erp" },
        // Inside getSidebarItems for each role, add:
        { name: "HRMS", icon: Users, path: "hrms" },

        { name: "Billing & Finance", icon: DollarSign, path: "billing" },
        { name: "Operations", icon: ClipboardList, path: "operations" },



      ];

    case "manager":
      return [
        ...baseItems,


        { name: "Assign Task", icon: ClipboardList, path: "assigntask" },
        { name: "Operations", icon: Workflow, path: "operations" },
        { name: "My Sites", icon: Building2, path: "sites" },  // ADD THIS

        { name: "Leave", icon: Calendar, path: "leave" },

      ];

    case "supervisor":
      return [
        ...baseItems,

        { name: "My Tasks", icon: ClipboardList, path: "tasks" },

        { name: "Assigned task", icon: ClipboardList, path: "assigntask" },

        { name: "Leave", icon: Calendar, path: "leave" },
        { name: "Training & Briefing", icon: User2Icon, path: "supervisortraining" },
      ];

    case "employee":
      return [
        ...baseItems,
        { name: "My Tasks", icon: ClipboardList, path: "tasks" },
        { name: "Attendance", icon: Calendar, path: "attendance" },
        { name: "Apply Leave", icon: Calendar, path: "leave" },

      ];

    default:
      return baseItems;
  }
};

interface DashboardSidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const DashboardSidebar = ({
  collapsed: initialCollapsed = false,
  mobileOpen = false,
  onMobileClose
}: DashboardSidebarProps) => {
  const { role, user, logout } = useRole();
  const location = useLocation();
  const sidebarItems = getSidebarItems(role);
  const basePath = `/${role}`;

  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored ? JSON.parse(stored) : initialCollapsed;
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{
          x: mobileOpen ? 0 : (window.innerWidth < 1024 ? -280 : 0),
          opacity: 1,
          width: collapsed && window.innerWidth >= 1024 ? "5rem" : "18rem"
        }}
        transition={{
          duration: 0.3,
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        className={cn(
          "h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          "flex flex-col relative z-50 shadow-xl",
          "fixed lg:sticky top-0 left-0 backdrop-blur-sm",
          !mobileOpen && "hidden lg:flex"
        )}
      >
        {/* Toggle Button */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className={cn(
            "absolute -right-3 top-6 z-50 hidden lg:flex",
            collapsed ? "justify-center" : "justify-end"
          )}
        >
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              "h-7 w-7 rounded-full border border-sidebar-border",
              "bg-sidebar shadow-lg hover:shadow-xl hover:scale-105",
              "transition-all duration-300 hover:bg-sidebar-accent",
              "backdrop-blur-sm"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </Button>
        </motion.div>

        {/* Header */}
        <div className="p-4 md:p-6 border-b border-sidebar-border">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <div className="relative">
              <div className="w-12 h-12 bg-sidebar-accent rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                {/* Logo Image - Updated Option A */}
                <img
                  src={SKLogo}
                  alt="SK PROJECT Logo"
                  className="h-8 w-8 object-contain"
                />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-1 border border-sidebar-accent/20 rounded-xl"
              />
            </div>
            {(!collapsed || mobileOpen) && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: 0.1 }}
                className="flex-1 overflow-hidden"
              >
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg text-sidebar-foreground">
                    SK PROJECT
                  </h2>
                  <Sparkles className="h-3 w-3 text-sidebar-accent animate-pulse" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs text-sidebar-foreground/60 font-medium px-2 py-0.5 bg-sidebar-accent/10 rounded-full capitalize">
                    {role}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            <AnimatePresence>
              {sidebarItems.map((item, index) => {
                const isActive = location.pathname === `${basePath}/${item.path}`;

                if (role === "supervisor" && item.path === "query") {
                  return (
                    <div key="supervisor-navigation-group">
                      {/* Work Query item */}
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 2 }}
                      >
                        <NavLink
                          to={`${basePath}/${item.path}`}
                          onClick={onMobileClose}
                          className={cn(
                            "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                            "hover:bg-sidebar-accent/20",
                            "hover:shadow-sm hover:border-l-4 hover:border-l-sidebar-accent",
                            isActive
                              ? "bg-sidebar-accent/20 text-sidebar-accent-foreground shadow-sm border-l-4 border-l-sidebar-accent"
                              : "text-sidebar-foreground/80"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-lg transition-all duration-200",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                              : "bg-sidebar-accent/10 group-hover:bg-sidebar-accent/20"
                          )}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          {(!collapsed || mobileOpen) && (
                            <motion.div
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              className="flex-1 flex items-center justify-between"
                            >
                              <span className="text-sm font-medium">{item.name}</span>
                              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </motion.div>
                          )}
                          {isActive && !collapsed && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-accent rounded-r-full"
                            />
                          )}
                        </NavLink>
                      </motion.div>

                      {/* Inventory button */}
                      <InventoryNavItem
                        collapsed={collapsed}
                        mobileOpen={mobileOpen}
                        basePath={basePath}
                      />
                    </div>
                  );
                }

                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 2 }}
                  >
                    <NavLink
                      to={`${basePath}/${item.path}`}
                      onClick={onMobileClose}
                      className={cn(
                        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                        "hover:bg-sidebar-accent/20",
                        "hover:shadow-sm hover:border-l-4 hover:border-l-sidebar-accent",
                        isActive
                          ? "bg-sidebar-accent/20 text-sidebar-accent-foreground shadow-sm border-l-4 border-l-sidebar-accent"
                          : "text-sidebar-foreground/80"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                          : "bg-sidebar-accent/10 group-hover:bg-sidebar-accent/20"
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      {(!collapsed || mobileOpen) && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          className="flex-1 flex items-center justify-between"
                        >
                          <span className="text-sm font-medium">{item.name}</span>
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                      )}
                      {isActive && !collapsed && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-accent rounded-r-full"
                        />
                      )}
                    </NavLink>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </nav>
        </ScrollArea>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          {(!collapsed || mobileOpen) && user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <NavLink
                to={`${basePath}/profile`}
                onClick={onMobileClose}
                className="block px-3 py-3 rounded-xl bg-sidebar-accent/5 backdrop-blur-sm hover:bg-sidebar-accent/10 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-sidebar-accent/10 flex items-center justify-center border border-sidebar-accent/20">
                    <span className="font-semibold text-sm text-sidebar-foreground">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{user.name}</p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
                  </div>
                </div>
              </NavLink>
            </motion.div>
          )}

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start rounded-xl transition-all duration-200",
                "bg-sidebar-accent/5",
                "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent",
                "hover:shadow-sm border border-transparent hover:border-sidebar-accent/20",
                collapsed && "justify-center"
              )}
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              {(!collapsed || mobileOpen) && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ml-3 font-medium"
                >
                  Logout
                </motion.span>
              )}
            </Button>
          </motion.div>
        </div>
      </motion.aside>
    </>
  );
};