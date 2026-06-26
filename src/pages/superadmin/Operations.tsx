import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Calculator, ClipboardList, ChevronDown, ChevronUp, Filter, Menu, Loader2 } from "lucide-react";
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
import { toast } from 'sonner';
import { StatsCards } from "./components/StatsCards";
import TasksSection from "./components/TasksSection";
import AssignTaskSection from "./components/AssignTaskSection";
import SitesSection from "./components/SitesSection";


import AlertsSection from "./components/AlertsSection";
import PriceCalculator from "./components/PriceCalculator";
import axios from "axios";
import AssignTaskPage from "./components/AssignTaskPage";
import {Task , Site} from "./data";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
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

const Operations = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const [activeTab, setActiveTab] = useState("tasks");
 const [tasks, setTasks] = useState<Task[]>([]);
const [sites, setSites] = useState<Site[]>([]);
const [loading, setLoading] = useState(true);
  
  // Mobile responsive state
  const [isMobileView, setIsMobileView] = useState(false);
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch tasks (adjust endpoint as needed)
      const tasksRes = await axios.get(`${API_URL}/tasks`);
      const sitesRes = await axios.get(`${API_URL}/sites`);
      
      setTasks(tasksRes.data.data || tasksRes.data || []);
      setSites(sitesRes.data.data || sitesRes.data || []);
    } catch (error) {
      console.error("Error fetching operations data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
  // Check for mobile view on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Define tabs for mobile selector
  const tabs = [
     { value: "assign", label: "Assign Task", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "sites", label: "Sites", icon: <Building className="h-4 w-4" /> },
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
        {/* Mobile Tab Selector */}
        <MobileTabSelector
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />

        {/* Desktop Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="hidden lg:grid w-full grid-cols-7">
           
           <TabsTrigger value="assign" className="text-sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Assign Task
            </TabsTrigger>
            <TabsTrigger value="sites" className="text-sm">
              <Building className="h-4 w-4 mr-2" />
              Sites
            </TabsTrigger>
          
           
          </TabsList>

         {/* Assign Task Tab */}
          <TabsContent value="assign">
            <AssignTaskPage />
          </TabsContent> 

          {/* Sites Tab */}
          <TabsContent value="sites">
            <SitesSection />
          </TabsContent>
          
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Operations;