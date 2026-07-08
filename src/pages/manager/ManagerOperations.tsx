// src/pages/ManagerOperations/ManagerOperations.tsx
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, ClipboardList, ChevronDown, ChevronUp, Calendar } from "lucide-react";
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
import ServicesSection from "./components/ServicesSection";
import AlertsSection from "./components/AlertsSection";
// ✅ CORRECT IMPORT - Use the fully working component
import TrainingBriefingSectionManager from "./components/TrainingBriefingSectionManager";
import { initialTasks, initialSites } from "./data";

// Mobile responsive tab selector
const MobileTabSelector = ({
  activeTab,
  onTabChange,
  tabs
}: {
  activeTab: string;
  onTabChange: (value: string) => void;
  tabs: { value: string; label: string; icon?: React.ReactNode }[];
}) => {
  const [open, setOpen] = useState(false);
  const currentTab = tabs.find(t => t.value === activeTab);

  return (
    <div className="lg:hidden mb-4">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center">
              {currentTab?.icon}
              <span className="ml-2">{currentTab?.label || 'Select Tab'}</span>
            </span>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[calc(100vw-2rem)] sm:w-[400px]">
          {tabs.map((tab) => (
            <DropdownMenuItem
              key={tab.value}
              onClick={() => {
                onTabChange(tab.value);
                setOpen(false);
              }}
              className={activeTab === tab.value ? "bg-muted" : ""}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
              {activeTab === tab.value && (
                <Badge variant="secondary" className="ml-auto">Active</Badge>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const ManagerOperations = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks] = useState(initialTasks);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Define tabs - changed "calculator" to "training"
  const tabs = [
    { value: "tasks", label: "All Tasks", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "sites", label: "Sites", icon: <Building className="h-4 w-4" /> },
    
    { value: "training", label: "Training & Briefing", icon: <Calendar className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        title="Operations & Task Management" 
        onMenuClick={onMenuClick}
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 md:p-6 space-y-4 md:space-y-6"
      >
        <StatsCards tasks={tasks} sites={initialSites} />
        
        <MobileTabSelector
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          {/* Desktop Tabs - 5 columns */}
          <TabsList className="hidden lg:grid w-full grid-cols-5">
            <TabsTrigger value="tasks" className="text-sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              All Tasks
            </TabsTrigger>
            <TabsTrigger value="sites" className="text-sm">
              <Building className="h-4 w-4 mr-2" />
              Sites
            </TabsTrigger>
          
            <TabsTrigger value="training" className="text-sm">
              <Calendar className="h-4 w-4 mr-2" />
              Training & Briefing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4 md:space-y-6">
            <TasksSection />
          </TabsContent>

          <TabsContent value="sites">
            <SitesSection />
          </TabsContent>

          
          {/* ✅ CORRECT - Using TrainingBriefingSectionManager */}
          <TabsContent value="training">
            <TrainingBriefingSectionManager />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default ManagerOperations;