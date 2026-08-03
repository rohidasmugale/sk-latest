// src/pages/SuperAdmin/Operations.tsx
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, ClipboardList, ChevronDown, ChevronUp, Calendar, Loader2, RefreshCw, AlertCircle } from "lucide-react";
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
import AssignTaskPage from "./components/AssignTaskPage";
import SitesSection from "./components/SitesSection"; // superadmin version
import TrainingBriefingSectionManager from "@/pages/manager/components/TrainingBriefingSectionManager";
import { PullToRefreshWrapper } from '@/components/shared/PullToRefreshWrapper';
import axios from "axios";

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

const SuperAdminOperations = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const [activeTab, setActiveTab] = useState("assign");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isMobileView, setIsMobileView] = useState(false);

  // ✅ Site filter state
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [allSites, setAllSites] = useState<any[]>([]);

  const tabs = [
    { value: "assign", label: "Assign Task", icon: <ClipboardList className="h-4 w-4" /> },
    { value: "sites", label: "Sites", icon: <Building className="h-4 w-4" /> },
    { value: "training", label: "Training & Briefing", icon: <Calendar className="h-4 w-4" /> },
  ];

  const fetchAllData = async (showToast: boolean = false) => {
    try {
      setError(null);
      if (showToast) {
        setRefreshing(true);
        toast.loading('Refreshing operations data...');
      } else {
        setLoading(true);
      }

      const [tasksRes, sitesRes] = await Promise.all([
        axios.get(`${API_URL}/tasks`),
        axios.get(`${API_URL}/sites`)
      ]);

      const sitesData = sitesRes.data.data || sitesRes.data || [];
      setAllSites(sitesData);

      window.dispatchEvent(new CustomEvent('refreshOperations', {
        detail: {
          tasks: tasksRes.data.data || tasksRes.data || [],
          sites: sitesData
        }
      }));

      setRefreshTrigger(prev => prev + 1);

      if (showToast) {
        toast.dismiss();
        toast.success('Data refreshed successfully');
      }
    } catch (error: any) {
      console.error("Error fetching operations data:", error);
      setError(error.message || "Failed to load data");

      if (showToast) {
        toast.dismiss();
        toast.error('Failed to refresh data');
      } else {
        toast.error('Failed to load data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData(false);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <PullToRefreshWrapper
      pageName="Operations"
      onRefresh={async () => {
        await fetchAllData(true);
      }}
      className="min-h-screen bg-background relative overflow-y-auto"
    >
      <DashboardHeader
        title="Operations & Task Management"
        onMenuClick={onMenuClick}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 md:p-6 space-y-4 md:space-y-6"
      >
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="text-red-700 hover:text-red-900"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* ✅ Site Filter */}
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-500" />
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white text-sm min-w-[180px]"
            >
              <option value="all">🏢 All Sites</option>
              {allSites.map((site) => (
                <option key={site._id} value={site._id}>
                  {site.name}
                </option>
              ))}
            </select>
            {selectedSite !== 'all' && (
              <Badge variant="outline" className="bg-blue-50">
                Filtered: {allSites.find(s => s._id === selectedSite)?.name || 'Unknown'}
              </Badge>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-4 text-muted-foreground">Loading operations data...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <MobileTabSelector
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabs={tabs}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
              <TabsList className="hidden lg:grid w-full grid-cols-3">
                <TabsTrigger value="assign" className="text-sm">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Assign Task
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

              <TabsContent value="assign">
                <AssignTaskPage
                  refreshTrigger={refreshTrigger}
                  selectedSite={selectedSite}
                  sites={allSites}
                />
              </TabsContent>

              <TabsContent value="sites">
                <SitesSection
                  refreshTrigger={refreshTrigger}
                  selectedSite={selectedSite}
                  sites={allSites}
                />
              </TabsContent>

              <TabsContent value="training">
                <TrainingBriefingSectionManager
                  selectedSite={selectedSite}
                  sites={allSites}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </motion.div>
    </PullToRefreshWrapper>
  );
};

export default SuperAdminOperations;