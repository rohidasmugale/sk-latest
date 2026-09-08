import { useState, useEffect } from "react";
import { BackButton } from "@/components/shared/BackButton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useRole } from "@/context/RoleContext";
import { DashboardHeader } from "@/components/shared/DashboardHeader";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const apiClient = axios.create({ baseURL: API_URL });
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('sk_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function ShiftDeployment() {
  const { user: currentUser } = useRole();
  const [todayShift, setTodayShift] = useState("");
  const [tomorrowShift, setTomorrowShift] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteId, setSiteId] = useState<string>("");
  const [siteName, setSiteName] = useState<string>("");

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // ✅ CHANGED: Fetch siteId from auth endpoint
  const fetchSupervisorSite = async () => {
    try {
      const res = await apiClient.get('/auth/supervisor-site');
      if (res.data.success && res.data.siteId) {
        setSiteId(res.data.siteId);
        setSiteName(res.data.siteName);
        return res.data.siteId;
      }
      return null;
    } catch (error) {
      console.error("Error fetching supervisor site:", error);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      const siteIdFromResponse = await fetchSupervisorSite();
      if (!siteIdFromResponse) {
        toast.error("No site found for this supervisor. Please contact admin.");
        setLoading(false);
        return;
      }
      await fetchShiftDeployment(siteIdFromResponse);
    };
    init();
  }, []);

  // ✅ CHANGED: Use siteId in API calls
  const fetchShiftDeployment = async (siteIdParam: string) => {
    try {
      const [todayRes, tomorrowRes] = await Promise.all([
        apiClient.get('/shifts/site-deployment', { params: { siteId: siteIdParam, date: today } }),
        apiClient.get('/shifts/site-deployment', { params: { siteId: siteIdParam, date: tomorrow } })
      ]);
      setTodayShift(todayRes.data?.data?.text || "");
      setTomorrowShift(tomorrowRes.data?.data?.text || "");
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load shift deployment");
    } finally {
      setLoading(false);
    }
  };

  // ✅ CHANGED: Use siteId in save
  const saveShiftDeployment = async () => {
    if (!siteId) {
      toast.error("No site selected");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/shifts/site-deployment', { siteId, date: today, text: todayShift });
      await apiClient.post('/shifts/site-deployment', { siteId, date: tomorrow, text: tomorrowShift });
      toast.success("Shift deployment saved");
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="p-4 space-y-4">
      <DashboardHeader 
        title="Shift-wise Deployment" 
        subtitle={siteName ? `Site: ${siteName}` : "Loading..."}
        onMenuClick={() => {}}
      />
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Today ({today})</h3>
              <Textarea
                placeholder="Write today's shift deployment..."
                value={todayShift}
                onChange={(e) => setTodayShift(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Tomorrow ({tomorrow})</h3>
              <Textarea
                placeholder="Write tomorrow's shift deployment..."
                value={tomorrowShift}
                onChange={(e) => setTomorrowShift(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <Button onClick={saveShiftDeployment} disabled={saving} className="w-full">
            {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Save Shift Deployment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}