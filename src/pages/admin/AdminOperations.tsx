import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Calculator, ClipboardList, ChevronDown, ChevronUp, Filter, Menu } from "lucide-react";
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
import { toast } from "sonner"; // ✅ added

import { StatsCards } from "./components/StatsCardsA";
import SitesSection from "./components/SitesSectionA";
import ServicesSection from "./components/ServicesSectionA";
import AlertsSection from "./components/AlertsSectionA";
import PriceCalculator from "./components/PriceCalculatorA";
import AssignTaskSection from "../superadmin/components/AssignTaskSection";
import { Task, Site } from "./datas";
import axios from "axios";

// Mobile responsive tab selector (unchanged)
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
  const [activeTab, setActiveTab] = useState("assign"); // changed from "tasks"
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tasksRes, sitesRes] = await Promise.all([
          axios.get(`${API_URL}/tasks`),
          axios.get(`${API_URL}/sites`)
        ]);
        setTasks(tasksRes.data.data || tasksRes.data || []);
        setSites(sitesRes.data.data || sitesRes.data || []);
      } catch (error) {
        console.error("Failed to fetch operations data:", error);
        toast.error("Could not load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Tabs for mobile selector (no "tasks" tab)
  const tabs = [
    { value: "assign", label: "Assign Task", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "sites", label: "Sites", icon: <Building className="h-4 w-4" /> },
    { value: "services", label: "Services", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "alerts", label: "Alerts & Issues", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "calculator", label: "Calculator", icon: <Calculator className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Operations & Task Management" onMenuClick={onMenuClick} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 md:p-6 space-y-4 md:space-y-6"
      >
        <MobileTabSelector
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          {/* Desktop Tabs – removed "tasks" and adjusted grid-cols */}
          <TabsList className="hidden lg:grid w-full grid-cols-5">
            <TabsTrigger value="assign" className="text-sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Assign Task
            </TabsTrigger>
            <TabsTrigger value="sites" className="text-sm">
              <Building className="h-4 w-4 mr-2" />
              Sites
            </TabsTrigger>
            <TabsTrigger value="services" className="text-sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-sm">
              <ClipboardList className="h-4 w-4 mr-2" />
              Alerts & Issues
            </TabsTrigger>
            <TabsTrigger value="calculator" className="text-sm">
              <Calculator className="h-4 w-4 mr-2" />
              Calculator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assign">
            <AssignTaskSection />
          </TabsContent>

          <TabsContent value="sites">
            <SitesSection />
          </TabsContent>

          <TabsContent value="services">
            <ServicesSection />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsSection />
          </TabsContent>

          <TabsContent value="calculator">
            <PriceCalculator />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Operations;