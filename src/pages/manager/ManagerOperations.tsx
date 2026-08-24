// src/pages/ManagerOperations/ManagerOperations.tsx
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, ClipboardList, ChevronDown, ChevronUp, Calendar, Users, Settings, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { StatsCards } from "./components/StatsCards";
import TasksSection from "./components/TasksSection";
import SitesSection from "./components/SitesSection";
import RosterSection from "./components/RosterSection";
import ServicesSection from "./components/ServicesSection";
import TrainingBriefingSectionManager from "./components/TrainingBriefingSectionManager";
import { initialTasks, initialSites } from "./data";

// ✅ NEW IMPORTS
import { useRole } from "@/context/RoleContext";
import { WorkQueryList} from "@/components/shared/WorkQueryList"

// Mobile responsive tab selector (unchanged)
const MobileTabSelector = ({ activeTab, onTabChange, tabs }) => { /* ... */ };

const ManagerOperations = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const { user } = useRole(); // <-- get user
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks] = useState(initialTasks);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ Updated tabs – changed "alerts" to "work-queries"
  const tabs = [
    { value: "tasks", label: "All Tasks", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "sites", label: "Sites", icon: <Building className="h-4 w-4" /> },
    { value: "roster", label: "Roster", icon: <Users className="h-4 w-4" /> },
    { value: "services", label: "Services", icon: <Settings className="h-4 w-4" /> },
    { value: "work-queries", label: "Work Queries", icon: <Bell className="h-4 w-4" /> },
    { value: "training", label: "Training & Briefing", icon: <Calendar className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Operations & Task Management" onMenuClick={onMenuClick} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 md:p-6 space-y-4 md:space-y-6">
        <StatsCards tasks={tasks} sites={initialSites} />
        <MobileTabSelector activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="hidden lg:grid w-full grid-cols-6">
            <TabsTrigger value="tasks" className="text-sm"><ClipboardList className="h-4 w-4 mr-2" />All Tasks</TabsTrigger>
            <TabsTrigger value="sites" className="text-sm"><Building className="h-4 w-4 mr-2" />Sites</TabsTrigger>
            <TabsTrigger value="roster" className="text-sm"><Users className="h-4 w-4 mr-2" />Roster</TabsTrigger>
            <TabsTrigger value="services" className="text-sm"><Settings className="h-4 w-4 mr-2" />Services</TabsTrigger>
            <TabsTrigger value="work-queries" className="text-sm"><Bell className="h-4 w-4 mr-2" />Work Queries</TabsTrigger>
            <TabsTrigger value="training" className="text-sm"><Calendar className="h-4 w-4 mr-2" />Training & Briefing</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks"><TasksSection /></TabsContent>
          <TabsContent value="sites"><SitesSection /></TabsContent>
          <TabsContent value="roster"><RosterSection /></TabsContent>
          <TabsContent value="services"><ServicesSection /></TabsContent>
          <TabsContent value="work-queries">
            <WorkQueryList mode="manager" supervisorInfo={user} />
          </TabsContent>
          <TabsContent value="training"><TrainingBriefingSectionManager /></TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default ManagerOperations;