import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Plus, Eye, Trash2, Edit, MapPin, Building, DollarSign, Square,
  Search, Users, Filter, BarChart, Calendar, RefreshCw, User, Briefcase,
  Loader2, AlertCircle, ChevronDown, Phone, Mail, Upload, Download, FileText,
  CheckCircle, XCircle, UploadCloud
} from "lucide-react";
import { toast } from "sonner";
import { FormField } from "./shared";
import { siteService, Site, Client, SiteStats, CreateSiteRequest, ShiftDefinition } from "@/services/SiteService";
import { crmService } from "@/services/crmService";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Constants
const ServicesList = [
  "Housekeeping", "Security", "Parking", "Waste Management", "Consumables", "Technician", "Other"
];

const StaffRoles = [
  "Manager", "Supervisor", "Housekeeping Staff", "Security Guard", "Parking Attendant", "Waste Collector", "Technician"
];

const SHIFT_COLORS = [
  { name: 'Green', value: '#4CAF50' }, { name: 'Blue', value: '#2196F3' },
  { name: 'Orange', value: '#FF9800' }, { name: 'Red', value: '#F44336' },
  { name: 'Purple', value: '#9C27B0' }, { name: 'Teal', value: '#009688' },
  { name: 'Yellow', value: '#FFC107' }, { name: 'Pink', value: '#E91E63' },
];

interface SitesSectionProps {
  refreshTrigger?: number;
}

class ClientService {
  async getAllClients(searchTerm?: string): Promise<Client[]> {
    try {
      const crmClients = await crmService.clients.getAll(searchTerm);
      return crmClients.map(client => ({
        _id: client._id, name: client.name, company: client.company,
        email: client.email, phone: client.phone, city: client.city || "", state: ""
      }));
    } catch (error) {
      console.error('❌ Failed to fetch from CRM, falling back to site service:', error);
      try {
        if (searchTerm) return await siteService.searchClients(searchTerm);
        else return await siteService.getAllClients();
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return [];
      }
    }
  }
  async searchClients(query: string): Promise<Client[]> { return this.getAllClients(query); }
}

const SitesSection = ({ refreshTrigger = 0 }: SitesSectionProps) => {
  const [sites, setSites] = useState<Site[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [staffDeployment, setStaffDeployment] = useState<Array<{ role: string; count: number }>>([]);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stats, setStats] = useState<SiteStats>(siteService.getDefaultStats());
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [clientSearch, setClientSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<{ valid: any[]; invalid: any[]; missingClients: string[] }>({ valid: [], invalid: [], missingClients: [] });

  // Shift & Geofence states
  const [siteShifts, setSiteShifts] = useState<ShiftDefinition[]>([]);
  const [siteLatitude, setSiteLatitude] = useState<string>("");
  const [siteLongitude, setSiteLongitude] = useState<string>("");
  const [geofenceRadius, setGeofenceRadius] = useState<string>("0.5");
  const [locating, setLocating] = useState(false);
  const [editingShiftIndex, setEditingShiftIndex] = useState<number | null>(null);
  const [shiftFormData, setShiftFormData] = useState<Partial<ShiftDefinition>>({});

  const clientService = new ClientService();

  // --- LAYER 3: DEFENSIVE UI HELPERS ---
  const sanitizeDisplayText = (text: string | undefined, fallback: string) => {
    if (!text) return fallback;
    const trimmed = text.trim();
    // If it's purely symbols or starts with symbols, flag it
    if (/^[^a-zA-Z0-9]+$/.test(trimmed)) return `⚠️ Invalid ${fallback}`;
    const cleaned = trimmed.replace(/^[^a-zA-Z0-9]+/, '');
    return cleaned || `⚠️ Invalid ${fallback}`;
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (!amount || isNaN(amount) || amount > 10000000000) return "Invalid Value";
    return siteService.formatCurrency(amount);
  };

  const formatNumber = (num: number | undefined): string => {
    if (!num || isNaN(num) || num > 100000000) return "Invalid Area";
    return siteService.formatNumber(num);
  };

  const getTotalStaff = (site: Site): number => siteService.getTotalStaff(site);

  // --- LAYER 1 & 2: VALIDATION LOGIC ---
  const validateSiteDataStrictly = (name: string, location: string, area: number, value: number) => {
    const nameRegex = /^[a-zA-Z0-9\s\-_,]+$/;

    if (!nameRegex.test(name)) return "Site Name can only contain letters, numbers, spaces, and hyphens.";
    if (!nameRegex.test(location)) return "Location can only contain letters, numbers, spaces, and hyphens.";
    if (isNaN(area) || area <= 0 || area > 100000000) return "Area must be between 1 and 100,000,000 sqft.";
    if (isNaN(value) || value < 0 || value > 10000000000) return "Contract Value must be between 0 and 10,000,000,000.";

    return null; // No errors
  };

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchSites(); fetchStats(); fetchClients();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    const handleRefresh = (event: CustomEvent) => {
      if (event.detail?.sites) {
        setSites(event.detail.sites);
        toast.success('Sites updated');
        fetchStats();
      } else {
        fetchSites(); fetchStats(); fetchClients();
      }
    };
    window.addEventListener('refreshOperations', handleRefresh as EventListener);
    return () => window.removeEventListener('refreshOperations', handleRefresh as EventListener);
  }, []);

  useEffect(() => {
    fetchSites(); fetchStats(); fetchClients();
  }, []);

  const fetchSites = async () => {
    try {
      setIsLoading(true); setError(null);
      const sitesData = await siteService.getAllSites();
      setSites(sitesData || []);
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      setError(error.message || "Failed to load sites");
      toast.error(error.message || "Failed to load sites");
      setSites([]);
    } finally { setIsLoading(false); }
  };

  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const clientsData = await clientService.getAllClients();
      setClients(clientsData || []);
      if (clientsData && clientsData.length > 0 && !selectedClient) {
        setSelectedClient(clientsData[0]._id);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      setClients([]);
    } finally { setIsLoadingClients(false); }
  };

  const searchClients = async (searchTerm: string) => {
    try {
      setIsLoadingClients(true);
      const clientsData = await clientService.searchClients(searchTerm);
      setClients(clientsData || []);
    } catch (error) {
      console.error("Error searching clients:", error);
      setClients([]);
    } finally { setIsLoadingClients(false); }
  };

  const fetchStats = async () => {
    try {
      const statsData = await siteService.getSiteStats();
      setStats(statsData || siteService.getDefaultStats());
    } catch (error) {
      console.error("Error fetching stats:", error);
      const safeSites = sites || [];
      const statusCounts = siteService.getSiteStatusCounts(safeSites);
      setStats({
        totalSites: safeSites.length,
        totalStaff: siteService.getTotalStaffAcrossSites(safeSites),
        activeSites: statusCounts.active,
        inactiveSites: statusCounts.inactive,
        totalContractValue: siteService.getTotalContractValue(safeSites)
      });
    }
  };

  const searchSites = async () => {
    try {
      setIsLoading(true); setError(null);
      const searchResults = await siteService.searchSites({ query: searchQuery, status: statusFilter });
      setSites(searchResults || []);
    } catch (error: any) {
      console.error("Error searching sites:", error);
      setError(error.message || "Failed to search sites");
      toast.error(error.message || "Failed to search sites");
    } finally { setIsLoading(false); }
  };

  const toggleService = (service: string) => {
    setSelectedServices(prev => prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]);
  };

  // ✅ FIX: Cap staff count to prevent 1e+262
  const updateStaffCount = (role: string, count: number) => {
    const safeCount = Math.min(Math.max(0, count), 10000); // Cap at 10,000
    setStaffDeployment(prev => {
      const existing = prev.find(item => item.role === role);
      if (existing) {
        return prev.map(item => item.role === role ? { ...item, count: safeCount } : item);
      }
      return [...prev, { role, count: safeCount }];
    });
  };

  const resetForm = () => {
    setSelectedServices([]); setStaffDeployment([]); setSiteShifts([]);
    setEditMode(false); setEditingSiteId(null); setSelectedClient("");
    setClientSearch(""); setSiteLatitude(""); setSiteLongitude(""); setGeofenceRadius("0.5");
  };

  const resetImport = () => {
    setImportFile(null); setImportPreview([]); setShowPreview(false);
    setImportErrors([]); setValidationResults({ valid: [], invalid: [], missingClients: [] });
  };

  const handleViewSite = (site: Site) => { setSelectedSite(site); setViewDialogOpen(true); };

  const handleEditSite = (site: Site) => {
    setEditMode(true); setEditingSiteId(site._id);
    setSelectedServices(site.services || []); setStaffDeployment(site.staffDeployment || []);
    setSiteShifts(site.shifts || []);
    setSiteLatitude(site.latitude != null && site.latitude !== 0 ? String(site.latitude) : "");
    setSiteLongitude(site.longitude != null && site.longitude !== 0 ? String(site.longitude) : "");
    setGeofenceRadius(site.geofenceRadius != null ? String(site.geofenceRadius) : "0.5");

    if (site.clientId) {
      const client = clients.find(c => c._id === site.clientId);
      if (client) setSelectedClient(client._id);
    } else {
      const client = clients.find(c => c.name === site.clientName);
      if (client) setSelectedClient(client._id); else setSelectedClient("");
    }

    setTimeout(() => {
      const form = document.getElementById('site-form') as HTMLFormElement;
      if (form) {
        // ✅ FIX: Clean up bad data before filling the form so user can easily overwrite it
        const safeName = site.name && !/^[^a-zA-Z0-9]+$/.test(site.name) ? site.name : '';
        const safeLocation = site.location && !/^[^a-zA-Z0-9]+$/.test(site.location) ? site.location : '';
        const safeArea = (site.areaSqft && site.areaSqft <= 100000000) ? site.areaSqft : 1000;
        const safeValue = (site.contractValue && site.contractValue <= 10000000000) ? site.contractValue : 100000;
        const safeContractDate = site.contractEndDate ? new Date(site.contractEndDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        (form.elements.namedItem('site-name') as HTMLInputElement).value = safeName;
        (form.elements.namedItem('location') as HTMLInputElement).value = safeLocation;
        (form.elements.namedItem('area-sqft') as HTMLInputElement).value = safeArea.toString();
        (form.elements.namedItem('contract-value') as HTMLInputElement).value = safeValue.toString();
        (form.elements.namedItem('contract-end-date') as HTMLInputElement).value = safeContractDate;
      }
    }, 0);
    setDialogOpen(true);
  };

  const handleAddOrUpdateSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const siteName = (formData.get("site-name") as string).trim();
    const location = (formData.get("location") as string).trim();
    const areaSqft = Number(formData.get("area-sqft"));
    const contractValue = Number(formData.get("contract-value"));

    // Apply strict validation
    const validationError = validateSiteDataStrictly(siteName, location, areaSqft, contractValue);
    if (validationError) { toast.error(validationError); return; }

    let clientName = "No Client"; let clientId = undefined;
    if (selectedClient) {
      const client = clients.find(c => c._id === selectedClient);
      if (client) { clientName = client.name; clientId = client._id; }
    }

    const latNum = siteLatitude.trim() !== "" ? Number(siteLatitude) : undefined;
    const lngNum = siteLongitude.trim() !== "" ? Number(siteLongitude) : undefined;
    const radiusNum = geofenceRadius.trim() !== "" ? Number(geofenceRadius) : undefined;

    const siteData: CreateSiteRequest = {
      name: siteName, clientName: clientName, clientId: clientId || undefined,
      location: location, areaSqft: areaSqft, contractValue: contractValue,
      contractEndDate: formData.get("contract-end-date") as string,
      services: selectedServices, staffDeployment: staffDeployment.filter(item => item.count > 0),
      shifts: siteShifts.filter(s => s.name && s.startTime && s.endTime),
      status: 'active', latitude: latNum, longitude: lngNum, geofenceRadius: radiusNum,
    };

    const serviceErrors = siteService.validateSiteData(siteData);
    if (serviceErrors.length > 0) { serviceErrors.forEach(err => toast.error(err)); return; }

    try {
      if (editMode && editingSiteId) {
        const updatedSite = await siteService.updateSite(editingSiteId, siteData);
        if (updatedSite) { toast.success("Site updated successfully!"); window.dispatchEvent(new CustomEvent('siteUpdated')); }
      } else {
        const newSite = await siteService.createSite(siteData);
        if (newSite) { toast.success("Site added successfully!"); window.dispatchEvent(new CustomEvent('siteUpdated')); }
      }
      setDialogOpen(false); resetForm(); (e.target as HTMLFormElement).reset();
      await fetchSites(); await fetchStats();
    } catch (error: any) {
      console.error("Error saving site:", error);
      if (error.message?.includes('Duplicate entry') || error.message?.includes('duplicate')) {
        toast.error("Site name might already exist. Please try a different name.");
      } else if (error.message?.includes('id')) {
        toast.error("There was an issue with the site ID. Please try again.");
      } else {
        toast.error(error.message || "Failed to save site");
      }
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm("Are you sure you want to delete this site?")) return;
    try {
      const result = await siteService.deleteSite(siteId);
      if (result?.success) toast.success("Site deleted successfully!"); else toast.error("Failed to delete site");
      await fetchSites(); await fetchStats();
    } catch (error: any) { console.error("Error deleting site:", error); toast.error(error.message || "Failed to delete site"); }
  };

  const handleToggleStatus = async (siteId: string) => {
    try {
      const updatedSite = await siteService.toggleSiteStatus(siteId);
      if (updatedSite) toast.success("Site status updated!");
      await fetchSites(); await fetchStats();
    } catch (error: any) { console.error("Error toggling site status:", error); toast.error(error.message || "Failed to update site status"); }
  };

  const handleDialogClose = (open: boolean) => { if (!open) resetForm(); setDialogOpen(open); };
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); searchSites(); };
  const handleResetFilters = () => { setSearchQuery(""); setStatusFilter("all"); fetchSites(); };
  const calculateAverageArea = (): string => Math.round(siteService.calculateAverageArea(sites) / 1000).toString();
  const getSafeStats = () => stats || siteService.getDefaultStats();

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation is not supported by this browser"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setSiteLatitude(pos.coords.latitude.toFixed(6)); setSiteLongitude(pos.coords.longitude.toFixed(6)); toast.success(`Location captured (±${Math.round(pos.coords.accuracy)}m)`); setLocating(false); },
      (err) => { toast.error(`Could not get location: ${err.message}`); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // --- LAYER 4: EXCEL IMPORT SANITIZATION ---
  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
          if (jsonData.length < 2) { resolve([]); return; }
          const headers = (jsonData[0] as string[]).map(h => h?.toString().trim() || '');
          const formattedData = jsonData.slice(1).filter(row => row.some((cell: any) => cell !== null && cell !== undefined && cell.toString().trim() !== '')).map(row => {
            const obj: any = {}; headers.forEach((header, index) => { obj[header] = row[index]?.toString().trim() || ''; }); return obj;
          });
          resolve(formattedData);
        } catch (error) { reject(error); }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  const validateImportedSites = async (importedData: any[]) => {
    const validSites: any[] = []; const invalidSites: any[] = []; const missingClients: string[] = []; const errors: string[] = [];
    await fetchClients();

    for (let index = 0; index < importedData.length; index++) {
      const row = importedData[index]; const rowNumber = index + 2;
      const siteName = row['Site Name'] || row['SITE NAME'] || row['site name'] || '';
      const clientName = row['Client Name'] || row['CLIENT NAME'] || row['client name'] || '';
      const location = row['Location'] || row['LOCATION'] || row['location'] || '';
      const areaSqft = row['Area (sqft)'] || row['AREA'] || row['area'] || row['Area Sqft'] || '';
      const contractValue = row['Contract Value'] || row['CONTRACT VALUE'] || row['contract value'] || row['Value'] || '';
      const contractEndDate = row['Contract End Date'] || row['CONTRACT END DATE'] || row['contract end date'] || row['End Date'] || '';

      // Apply strict validation to imported rows
      const validationError = validateSiteDataStrictly(siteName, location, parseFloat(areaSqft) || 0, parseFloat(contractValue.toString().replace(/[^0-9.-]+/g, '')) || 0);
      if (validationError) { errors.push(`Row ${rowNumber}: ${validationError}`); invalidSites.push(row); continue; }
      if (!contractEndDate) { errors.push(`Row ${rowNumber}: Missing Contract End Date`); invalidSites.push(row); continue; }

      const clientExists = clients.some(client => client.name.toLowerCase() === clientName.toLowerCase() || client.company.toLowerCase() === clientName.toLowerCase());
      if (!clientExists) { missingClients.push(`${clientName} (Row ${rowNumber})`); invalidSites.push(row); continue; }

      let services: string[] = [];
      const servicesStr = row['Services'] || row['SERVICES'] || row['services'] || '';
      if (servicesStr) services = servicesStr.split(',').map((s: string) => s.trim()).filter((s: string) => ServicesList.includes(s));

      const staffDeployment: Array<{ role: string; count: number }> = [];
      StaffRoles.forEach(role => {
        const roleKey = role.replace(/\s+/g, '');
        const count = parseInt(row[role] || row[roleKey] || row[role.toUpperCase()] || 0) || 0;
        if (count > 0) staffDeployment.push({ role, count: Math.min(count, 10000) }); // Cap import staff count
      });

      validSites.push({
        name: siteName, clientName: clientName, location: location,
        areaSqft: parseFloat(areaSqft) || 0,
        contractValue: parseFloat(contractValue.toString().replace(/[^0-9.-]+/g, '')) || 0,
        contractEndDate: new Date(contractEndDate).toISOString().split('T')[0],
        services: services, staffDeployment: staffDeployment,
        managerCount: staffDeployment.filter(i => i.role === 'Manager').reduce((s, i) => s + i.count, 0),
        supervisorCount: staffDeployment.filter(i => i.role === 'Supervisor').reduce((s, i) => s + i.count, 0),
        status: 'active'
      });
    }
    setImportErrors(errors);
    return { valid: validSites, invalid: invalidSites, missingClients };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImportFile(file); setImportLoading(true); setImportErrors([]); setValidationResults({ valid: [], invalid: [], missingClients: [] });
    try {
      const importedData = await readExcelFile(file);
      setImportPreview(importedData);
      const results = await validateImportedSites(importedData);
      setValidationResults(results); setShowPreview(true);
      if (results.valid.length > 0) toast.success(`${results.valid.length} valid sites ready for import`);
      if (results.missingClients.length > 0) toast.warning(`${results.missingClients.length} sites have clients not in CRM`);
    } catch (error) { console.error("Error reading file:", error); toast.error("Failed to read file. Please check the format."); }
    finally { setImportLoading(false); }
  };

  const handleImportSites = async () => {
    if (validationResults.valid.length === 0) { toast.error("No valid sites to import"); return; }
    setImportLoading(true); let successCount = 0; let errorCount = 0; const errors: string[] = [];
    for (const siteData of validationResults.valid) {
      try {
        const client = clients.find(c => c.name.toLowerCase() === siteData.clientName.toLowerCase() || c.company.toLowerCase() === siteData.clientName.toLowerCase());
        await siteService.createSite({ ...siteData, clientId: client?._id, staffDeployment: siteData.staffDeployment, status: 'active' });
        successCount++;
      } catch (error: any) { console.error(`Failed to import site ${siteData.name}:`, error); errors.push(`${siteData.name}: ${error.message || 'Unknown error'}`); errorCount++; }
    }
    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} sites${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      if (errors.length > 0) console.error('Import errors:', errors);
      await fetchSites(); await fetchStats(); setImportDialogOpen(false); resetImport();
    } else { toast.error(`Failed to import any sites. ${errors[0] || 'Check the data format.'}`); }
    setImportLoading(false);
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Site Name*', 'Client Name*', 'Location*', 'Area (sqft)*', 'Contract Value*', 'Contract End Date*', 'Services', 'Manager', 'Supervisor', 'Housekeeping Staff', 'Security Guard', 'Parking Attendant', 'Waste Collector', 'Technician'],
      ['Phoenix Mall', 'PHOENIX MALL', 'Wakad, Pune', '50000', '5000000', '2025-12-31', 'Housekeeping,Security', '1', '2', '10', '5', '3', '2'],
      ['Highstreet Mall', 'HIGHSTREET MALL', 'Hinjewadi, Pune', '75000', '7500000', '2025-06-30', 'Security,Parking,Waste Management', '1', '3', '0', '8', '4', '3'],
      ['', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['*Required fields: Site Name, Client Name, Location, Area, Contract Value, Contract End Date'],
      ['Services: Separate multiple services with commas (Housekeeping, Security, Parking, Waste Management)'],
      ['Staff Counts: Enter numbers for each role (0 if not applicable)'],
      ['Contract End Date format: YYYY-MM-DD'],
      ['Note: Client Name must match exactly with client name in CRM']
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Site Import Template'); XLSX.writeFile(wb, 'Site_Import_Template.xlsx');
  };

  const renderClientsDropdown = () => {
    if (isLoadingClients) return <div className="flex items-center space-x-2 p-2"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Loading clients...</span></div>;
    const safeClients = clients || [];
    const filteredClients = safeClients.filter(client => client.name.toLowerCase().includes(clientSearch.toLowerCase()) || client.company.toLowerCase().includes(clientSearch.toLowerCase()));

    return (
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); setIsClientDropdownOpen(true); }} onFocus={() => setIsClientDropdownOpen(true)} onBlur={() => setTimeout(() => setIsClientDropdownOpen(false), 200)} className="pl-10" />
        </div>
        {isClientDropdownOpen && clientSearch.trim().length > 0 && (
          <div className="border rounded-md max-h-60 overflow-y-auto">
            {filteredClients.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">No clients found.</div> : (
              <div className="space-y-1 p-1">
                {filteredClients.map((client) => (
                  <div key={client._id} className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${selectedClient === client._id ? 'bg-blue-50 border border-blue-200' : ''}`} onClick={() => { setSelectedClient(client._id); setClientSearch(client.name); setIsClientDropdownOpen(false); }}>
                    <div className="flex justify-between items-start">
                      <div><div className="font-medium text-sm">{client.name}</div><div className="text-xs text-muted-foreground">{client.company}</div></div>
                      {selectedClient === client._id && <Badge variant="outline" className="text-xs">Selected</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {selectedClient && !isClientDropdownOpen && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex justify-between items-center">
              <div><span className="text-xs font-medium text-muted-foreground">Selected:</span><span className="ml-2 text-sm font-medium">{safeClients.find(c => c._id === selectedClient)?.name}</span></div>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(""); setClientSearch(""); }} className="h-6 text-xs">Clear</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Shift Management Helpers
  const addShift = () => { setSiteShifts([...siteShifts, { id: `shift_${Date.now()}`, name: 'New Shift', label: 'Shift', startTime: '09:00', endTime: '18:00', graceMinutes: 15, color: '#4CAF50', appliesTo: [], isOvernight: false }]); };
  const updateShift = (index: number, field: keyof ShiftDefinition, value: any) => {
    const updated = [...siteShifts]; updated[index] = { ...updated[index], [field]: value };
    if (field === 'startTime' || field === 'endTime') {
      const start = updated[index].startTime || '09:00'; const end = updated[index].endTime || '18:00';
      updated[index].isOvernight = end < start;
    }
    setSiteShifts(updated);
  };
  const removeShift = (index: number) => { setSiteShifts(siteShifts.filter((_, i) => i !== index)); };

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6">
      {error && (
        <Card className="border-red-200 bg-red-50"><CardContent className="p-3 sm:p-4"><div className="flex items-center text-red-700"><AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" /><span className="text-sm sm:text-base">{error}</span><Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto flex-shrink-0">Dismiss</Button></div></CardContent></Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Sites</p><p className="text-xl sm:text-2xl font-bold">{getSafeStats().totalSites}</p></div><Building className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" /></div><div className="mt-2 text-xs sm:text-sm"><span className="text-green-600 font-medium">{getSafeStats().activeSites} active</span><span className="mx-2">•</span><span className="text-gray-600">{getSafeStats().inactiveSites} inactive</span></div></CardContent></Card>
        <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Staff</p><p className="text-xl sm:text-2xl font-bold">{getSafeStats().totalStaff}</p></div><Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Contract Value</p><p className="text-xl sm:text-2xl font-bold">{formatCurrency(getSafeStats().totalContractValue)}</p></div><DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm font-medium text-muted-foreground">Average Area</p><p className="text-xl sm:text-2xl font-bold">{calculateAverageArea()}K sqft</p></div><BarChart className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" /></div></CardContent></Card>
      </div>

      {/* Search and Filter Bar */}
      <Card><CardContent className="p-4 sm:p-6"><form onSubmit={handleSearch} className="space-y-3 sm:space-y-4"><div className="flex flex-col sm:flex-row gap-3 sm:gap-4"><div className="flex-1"><div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search sites..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 text-sm sm:text-base" /></div></div><div className="w-full sm:w-48"><div className="relative"><Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full h-9 sm:h-10 pl-10 pr-4 rounded-md border border-input bg-background text-xs sm:text-sm"><option value="all">All Status</option><option value="active">Active Only</option><option value="inactive">Inactive Only</option></select></div></div><div className="flex flex-wrap gap-2"><Button type="submit" size="sm" className="flex-1 sm:flex-none"><Search className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Search</span></Button><Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>Reset</Button><Button type="button" variant="outline" size="sm" onClick={() => { fetchSites(); fetchStats(); fetchClients(); }}><RefreshCw className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Refresh</span></Button></div></div></form></CardContent></Card>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Site Management</CardTitle>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">

            {/* Import Button */}
            <Dialog open={importDialogOpen} onOpenChange={(open) => { setImportDialogOpen(open); if (!open) resetImport(); }}>
              <DialogTrigger asChild><Button variant="outline" size="sm" className="flex-1 sm:flex-none"><Upload className="h-4 w-4 sm:mr-2" /><span className="text-xs sm:text-sm">Import</span></Button></DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader><DialogTitle className="text-lg sm:text-xl">Import Sites from Excel</DialogTitle><DialogDescription className="text-xs sm:text-sm">Upload an Excel file with site data. Client names must match exactly with clients in CRM.</DialogDescription></DialogHeader>
                <div className="space-y-4 sm:space-y-6">
                  <div className="space-y-2"><Label htmlFor="site-excel-file" className="text-xs sm:text-sm font-medium">Upload Excel File</Label><div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-8 text-center hover:border-blue-400 transition-colors bg-gray-50"><Input id="site-excel-file" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" disabled={importLoading} /><Label htmlFor="site-excel-file" className="cursor-pointer"><UploadCloud className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-gray-400" /><p className="text-xs sm:text-sm font-medium text-gray-700">{importLoading ? 'Processing...' : 'Drag & drop or click to upload'}</p><p className="text-xs text-gray-500 mt-1">Supports .xlsx, .xls, .csv files</p></Label>{importFile && (<div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-100"><p className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-500 flex-shrink-0" /><span className="truncate">{importFile.name}</span></p></div>)}</div></div>
                  <div className="flex justify-center"><Button onClick={downloadTemplate} variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"><Download className="mr-2 h-4 w-4" />Download Template</Button></div>
                  {showPreview && validationResults.valid.length > 0 && (<div className="border rounded-lg p-3 sm:p-4 bg-green-50"><div className="flex items-center gap-2 mb-2 sm:mb-3"><CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" /><h3 className="font-semibold text-green-800 text-xs sm:text-sm">Valid Sites ({validationResults.valid.length})</h3></div><div className="max-h-32 sm:max-h-40 overflow-y-auto text-xs">{validationResults.valid.map((site, idx) => (<div key={idx} className="py-1 border-b border-green-200 last:border-0">{site.name} - {site.clientName}</div>))}</div></div>)}
                  {validationResults.missingClients.length > 0 && (<div className="border rounded-lg p-3 sm:p-4 bg-yellow-50"><div className="flex items-center gap-2 mb-2 sm:mb-3"><AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0" /><h3 className="font-semibold text-yellow-800 text-xs sm:text-sm">Clients Not Found in CRM ({validationResults.missingClients.length})</h3></div><p className="text-xs text-yellow-700 mb-2">Add these clients to CRM first:</p><div className="max-h-32 sm:max-h-40 overflow-y-auto text-xs">{validationResults.missingClients.map((client, idx) => (<div key={idx} className="py-1 border-b border-yellow-200 last:border-0">{client}</div>))}</div></div>)}
                  {importErrors.length > 0 && (<div className="border rounded-lg p-3 sm:p-4 bg-red-50"><div className="flex items-center gap-2 mb-2 sm:mb-3"><XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" /><h3 className="font-semibold text-red-800 text-xs sm:text-sm">Validation Errors ({importErrors.length})</h3></div><div className="max-h-32 sm:max-h-40 overflow-y-auto text-xs">{importErrors.map((error, idx) => (<div key={idx} className="py-1 border-b border-red-200 last:border-0 text-red-700">{error}</div>))}</div></div>)}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3"><Button onClick={handleImportSites} disabled={validationResults.valid.length === 0 || importLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm py-2 sm:py-2" size="sm">{importLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>) : (`Import ${validationResults.valid.length} Sites`)}</Button><Button variant="outline" onClick={() => { setImportDialogOpen(false); resetImport(); }} className="flex-1 text-xs sm:text-sm py-2 sm:py-2" size="sm">Cancel</Button></div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add/Edit Site Button */}
            <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild><Button onClick={() => resetForm()} size="sm" className="flex-1 sm:flex-none"><Plus className="h-4 w-4 sm:mr-2" /><span className="text-xs sm:text-sm">Add Site</span></Button></DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader><DialogTitle className="text-lg sm:text-xl">{editMode ? "Edit Site" : "Add New Site"}</DialogTitle><DialogDescription className="text-xs sm:text-sm">Select a client from your CRM database</DialogDescription></DialogHeader>
                <form id="site-form" onSubmit={handleAddOrUpdateSite} className="space-y-3 sm:space-y-4">

                  {/* LAYER 1: STRICT INPUT BLOCKING */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField label="Site Name" id="site-name" required>
                      <Input id="site-name" name="site-name" placeholder="Enter site name" required defaultValue="" className="text-sm"
                        onKeyDown={(e) => { if (/[^a-zA-Z0-9\s\-_,]/.test(e.key)) e.preventDefault(); }}
                        onPaste={(e) => { if (/[^a-zA-Z0-9\s\-_,]/.test(e.clipboardData.getData('text'))) { e.preventDefault(); toast.error("Invalid characters in Site Name."); } }}
                      />
                    </FormField>
                    <FormField label="Location" id="location" required>
                      <Input id="location" name="location" placeholder="Enter location" required defaultValue="" className="text-sm"
                        onKeyDown={(e) => { if (/[^a-zA-Z0-9\s\-_,]/.test(e.key)) e.preventDefault(); }}
                        onPaste={(e) => { if (/[^a-zA-Z0-9\s\-_,]/.test(e.clipboardData.getData('text'))) { e.preventDefault(); toast.error("Invalid characters in Location."); } }}
                      />
                    </FormField>
                  </div>

                  <div className="space-y-2"><Label className="text-xs sm:text-sm font-medium">Client Name <span className="text-muted-foreground">(Optional)</span></Label>{renderClientsDropdown()}</div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <FormField label="Area (sqft)" id="area-sqft" required>
                      <Input id="area-sqft" name="area-sqft" type="number" placeholder="Area" required min="1" max="100000000" defaultValue="1000" className="text-sm"
                        onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                        onPaste={(e) => { if (/[eE+-]/.test(e.clipboardData.getData('text'))) { e.preventDefault(); toast.error("Scientific notation is not allowed."); } }}
                      />
                    </FormField>
                    <FormField label="Contract Value (₹)" id="contract-value" required>
                      <Input id="contract-value" name="contract-value" type="number" placeholder="Value" required min="0" max="10000000000" defaultValue="100000" className="text-sm"
                        onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }}
                        onPaste={(e) => { if (/[eE+-]/.test(e.clipboardData.getData('text'))) { e.preventDefault(); toast.error("Scientific notation is not allowed."); } }}
                      />
                    </FormField>
                    <FormField label="Contract End Date" id="contract-end-date" required><Input id="contract-end-date" name="contract-end-date" type="date" required min={new Date().toISOString().split('T')[0]} defaultValue={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} className="text-sm" /></FormField>
                  </div>

                  {/* Geofence */}
                  <div className="border p-3 sm:p-4 rounded-md space-y-3">
                    <div className="flex items-center justify-between"><p className="font-medium text-sm">Site Location (Geofence)</p><Button type="button" variant="outline" size="sm" onClick={handleUseMyLocation} disabled={locating}>{locating ? (<><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Locating...</>) : (<><MapPin className="h-4 w-4 mr-1" /> Use my current location</>)}</Button></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-2"><Label className="text-xs sm:text-sm">Latitude</Label><Input type="number" step="any" value={siteLatitude} onChange={(e) => setSiteLatitude(e.target.value)} placeholder="e.g. 19.076090" className="text-sm" /></div>
                      <div className="space-y-2"><Label className="text-xs sm:text-sm">Longitude</Label><Input type="number" step="any" value={siteLongitude} onChange={(e) => setSiteLongitude(e.target.value)} placeholder="e.g. 72.877426" className="text-sm" /></div>
                      <div className="space-y-2"><Label className="text-xs sm:text-sm">Geofence Radius (km)</Label><Input type="number" step="0.1" min="0.1" value={geofenceRadius} onChange={(e) => setGeofenceRadius(e.target.value)} placeholder="0.5" className="text-sm" /></div>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="border p-3 sm:p-4 rounded-md"><p className="font-medium mb-2 sm:mb-3 text-sm">Services for this Site</p><div className="grid grid-cols-2 gap-2">{ServicesList.map((service) => (<div key={service} className="flex items-center space-x-2"><Checkbox id={`service-${service}`} checked={selectedServices.includes(service)} onCheckedChange={() => toggleService(service)} /><label htmlFor={`service-${service}`} className="cursor-pointer text-xs sm:text-sm">{service}</label></div>))}</div></div>

                  {/* Shifts */}
                  <div className="border p-3 sm:p-4 rounded-md">
                    <div className="flex items-center justify-between mb-2 sm:mb-3"><p className="font-medium text-sm">Shift Timings for this Site</p><Button type="button" variant="outline" size="sm" onClick={addShift}><Plus className="h-4 w-4 mr-1" /> Add Shift</Button></div>
                    {siteShifts.length === 0 ? <div className="text-center py-4 text-sm text-muted-foreground border rounded bg-gray-50">No shifts defined. Click "Add Shift" to configure.</div> : (
                      <div className="space-y-2">{siteShifts.map((shift, index) => (
                        <div key={shift.id || index} className="flex flex-col gap-2 p-2 border rounded bg-gray-50">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: shift.color }} /><Input placeholder="Shift Name" value={shift.name} onChange={(e) => updateShift(index, 'name', e.target.value)} className="h-8 text-sm flex-1" /><Input placeholder="Label" value={shift.label} onChange={(e) => updateShift(index, 'label', e.target.value)} className="h-8 text-sm w-24" /><Button type="button" variant="ghost" size="sm" onClick={() => removeShift(index)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="h-4 w-4" /></Button></div>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            <div className="space-y-0.5"><Label className="text-[10px] text-muted-foreground">Start</Label><Input type="time" value={shift.startTime} onChange={(e) => updateShift(index, 'startTime', e.target.value)} className="h-7 text-sm" /></div>
                            <div className="space-y-0.5"><Label className="text-[10px] text-muted-foreground">End</Label><Input type="time" value={shift.endTime} onChange={(e) => updateShift(index, 'endTime', e.target.value)} className="h-7 text-sm" /></div>
                            <div className="space-y-0.5"><Label className="text-[10px] text-muted-foreground">Grace (min)</Label><Input type="number" min="0" max="60" value={shift.graceMinutes} onChange={(e) => updateShift(index, 'graceMinutes', parseInt(e.target.value) || 0)} className="h-7 text-sm" /></div>
                            <div className="space-y-0.5"><Label className="text-[10px] text-muted-foreground">Color</Label><Select value={shift.color} onValueChange={(value) => updateShift(index, 'color', value)}><SelectTrigger className="h-7 text-sm"><div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }} /></div></SelectTrigger><SelectContent>{SHIFT_COLORS.map(c => (<SelectItem key={c.value} value={c.value}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} /><span>{c.name}</span></div></SelectItem>))}</SelectContent></Select></div>
                            <div className="space-y-0.5 flex items-center">{shift.isOvernight && (<Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">🌙 Overnight</Badge>)}</div>
                          </div>
                        </div>
                      ))}</div>
                    )}
                  </div>

                  {/* Staff Deployment */}
                  <div className="border p-3 sm:p-4 rounded-md">
                    <p className="font-medium mb-2 sm:mb-3 text-sm">Staff Deployment</p>
                    <div className="space-y-2 sm:space-y-3">{StaffRoles.map((role) => {
                      const deployment = staffDeployment.find(item => item.role === role); const count = deployment?.count || 0;
                      return (<div key={role} className="flex items-center justify-between"><span className="text-xs sm:text-sm">{role}</span><div className="flex items-center space-x-1 sm:space-x-2"><Button type="button" variant="outline" size="sm" onClick={() => updateStaffCount(role, count - 1)} disabled={count <= 0} className="h-7 w-7 sm:h-8 sm:w-8 p-0">-</Button><Input type="number" value={count} onChange={(e) => updateStaffCount(role, parseInt(e.target.value) || 0)} className="w-12 sm:w-16 text-center h-7 sm:h-8 text-sm" min="0" max="10000" onKeyDown={(e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); }} /><Button type="button" variant="outline" size="sm" onClick={() => updateStaffCount(role, count + 1)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">+</Button></div></div>);
                    })}</div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 pt-2"><Button type="submit" className="flex-1 text-sm py-2" size="sm">{editMode ? "Update Site" : "Add Site"}</Button><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="text-sm py-2" size="sm">Cancel</Button></div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        {/* LAYER 3: DEFENSIVE TABLE RENDERING */}
        <CardContent className="p-0 sm:p-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8 sm:py-12"><Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" /><span className="ml-2 sm:ml-3 text-sm sm:text-base">Loading sites...</span></div>
          ) : !sites || sites.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4"><Building className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" /><h3 className="text-base sm:text-lg font-semibold mb-2">No Sites Found</h3><p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{searchQuery || statusFilter !== 'all' ? 'Try adjusting your search filters' : 'Get started by adding your first site'}</p><div className="flex flex-col sm:flex-row gap-2 justify-center"><Button onClick={() => setDialogOpen(true)} size="sm" className="text-xs sm:text-sm"><Plus className="h-4 w-4 mr-2" />Add First Site</Button><Button variant="outline" onClick={() => setImportDialogOpen(true)} size="sm" className="text-xs sm:text-sm"><Upload className="h-4 w-4 mr-2" />Import Sites</Button></div></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead className="text-xs sm:text-sm whitespace-nowrap">Site Name</TableHead><TableHead className="text-xs sm:text-sm whitespace-nowrap">Client</TableHead><TableHead className="text-xs sm:text-sm whitespace-nowrap">Location</TableHead><TableHead className="text-xs sm:text-sm whitespace-nowrap">Services</TableHead><TableHead className="text-xs sm:text-sm whitespace-nowrap">Staff</TableHead><TableHead className="text-xs sm:text-sm whitespace-nowrap">Area</TableHead><TableHead className="text-xs sm:text-sm whitespace-nowrap">Value</TableHead><TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead><TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sites.map((site) => {
                    const safeAreaSqft = site.areaSqft || 0;
                    const safeContractValue = site.contractValue || 0;
                    const safeServices = Array.isArray(site.services) ? site.services : [];

                    const isInvalidName = sanitizeDisplayText(site.name, 'Site Name').startsWith('⚠️');
                    const isInvalidLocation = sanitizeDisplayText(site.location, 'Location').startsWith('⚠️');

                    return (
                      <TableRow key={site._id}>
                        <TableCell className="text-xs sm:text-sm"><div><div className="font-medium">{isInvalidName ? (<span className="text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Invalid Site Name</span>) : (sanitizeDisplayText(site.name, 'Unnamed'))}</div><div className="text-xs text-muted-foreground">{siteService.formatDate(site.createdAt)}</div></div></TableCell>
                        <TableCell className="text-xs sm:text-sm"><div>{site.clientName && site.clientName !== "No Client" ? (site.clientName) : (<span className="text-amber-600 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> No Client</span>)}</div></TableCell>
                        <TableCell className="text-xs sm:text-sm">{isInvalidLocation ? (<span className="text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Invalid Location</span>) : (sanitizeDisplayText(site.location, 'Unknown'))}</TableCell>
                        <TableCell className="max-w-[120px] sm:max-w-[160px]"><div className="flex flex-wrap gap-1">{safeServices.slice(0, 2).map((srv, i) => (<Badge key={i} variant="secondary" className="text-[10px] sm:text-xs">{srv}</Badge>))}{safeServices.length > 2 && (<Badge variant="outline" className="text-[10px] sm:text-xs">+{safeServices.length - 2}</Badge>)}{safeServices.length === 0 && (<span className="text-xs text-muted-foreground">None</span>)}</div></TableCell>
                        <TableCell className="text-xs sm:text-sm"><Badge variant="outline" className="text-[10px] sm:text-xs">{getTotalStaff(site)}</Badge></TableCell>
                        <TableCell className="text-xs sm:text-sm">{safeAreaSqft > 100000000 ? (<span className="text-red-500">Invalid Area</span>) : (formatNumber(safeAreaSqft))}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{safeContractValue > 10000000000 ? (<span className="text-red-500">Invalid Value</span>) : (formatCurrency(safeContractValue))}</TableCell>
                        <TableCell><Badge variant={site.status === "active" ? "default" : "secondary"} className="text-[10px] sm:text-xs">{site.status || 'active'}</Badge></TableCell>
                        <TableCell><div className="flex justify-end gap-1 sm:gap-2"><Button variant="ghost" size="sm" onClick={() => handleViewSite(site)} className="h-7 w-7 sm:h-8 sm:w-8 p-0"><Eye className="h-3 w-3 sm:h-4 sm:w-4" /></Button><Button variant="ghost" size="sm" onClick={() => handleEditSite(site)} className="h-7 w-7 sm:h-8 sm:w-8 p-0"><Edit className="h-3 w-3 sm:h-4 sm:w-4" /></Button><Button variant="ghost" size="sm" onClick={() => handleToggleStatus(site._id)} className="h-7 w-7 sm:h-8 sm:w-8 p-0">{site.status === "active" ? "D" : "A"}</Button><Button variant="destructive" size="sm" onClick={() => handleDeleteSite(site._id)} className="h-7 w-7 sm:h-8 sm:w-8 p-0"><Trash2 className="h-3 w-3 sm:h-4 sm:w-4" /></Button></div></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Site Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle className="text-lg sm:text-xl">Site Details</DialogTitle></DialogHeader>
          {selectedSite && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3 sm:space-y-4">
                  <div><h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Site Name</h3><p className="text-base sm:text-lg font-semibold">{sanitizeDisplayText(selectedSite.name, 'Unnamed')}</p></div>
                  <div><h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Client</h3><p className="text-base sm:text-lg font-semibold">{selectedSite.clientName || 'Unknown'}</p></div>
                  <div><h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Location</h3><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" /><p className="text-base sm:text-lg font-semibold">{sanitizeDisplayText(selectedSite.location, 'Unknown')}</p></div></div>
                  <div><h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Area</h3><div className="flex items-center gap-2"><Square className="h-4 w-4 text-muted-foreground flex-shrink-0" /><p className="text-base sm:text-lg font-semibold">{formatNumber(selectedSite.areaSqft)} sqft</p></div></div>
                </div>
                <div className="space-y-3 sm:space-y-4">
                  <div><h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Contract Value</h3><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" /><p className="text-base sm:text-lg font-semibold">{formatCurrency(selectedSite.contractValue)}</p></div></div>
                  <div><h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Contract End Date</h3><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" /><p className="text-base sm:text-lg font-semibold">{siteService.formatDate(selectedSite.contractEndDate)}</p></div></div>
                  <div><h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Status</h3><Badge variant={selectedSite.status === "active" ? "default" : "secondary"} className="text-xs sm:text-sm">{selectedSite.status?.toUpperCase() || 'ACTIVE'}</Badge></div>
                  <div><h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Created</h3><p className="text-sm">{siteService.formatDate(selectedSite.createdAt)}</p></div>
                </div>
              </div>
              <div className="border rounded-lg p-3 sm:p-4"><h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">Services</h3><div className="flex flex-wrap gap-1 sm:gap-2">{Array.isArray(selectedSite.services) && selectedSite.services.length > 0 ? (selectedSite.services.map((service, index) => (<Badge key={index} variant="secondary" className="text-[10px] sm:text-xs">{service}</Badge>))) : (<p className="text-xs sm:text-sm text-muted-foreground">No services assigned</p>)}</div></div>
              <div className="border rounded-lg p-3 sm:p-4"><h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">Staff Deployment</h3><div className="space-y-2 sm:space-y-3">{Array.isArray(selectedSite.staffDeployment) && selectedSite.staffDeployment.length > 0 ? (<><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">{selectedSite.staffDeployment.map((deploy, index) => (<div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded"><span className="text-xs sm:text-sm font-medium">{deploy.role}</span><Badge variant="outline" className="text-[10px] sm:text-xs">{deploy.count}</Badge></div>))}</div><div className="pt-2 sm:pt-3 border-t"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground flex-shrink-0" /><span className="text-xs sm:text-sm font-medium">Total Staff:</span><span className="text-base sm:text-lg font-bold">{getTotalStaff(selectedSite)}</span></div></div></>) : (<p className="text-xs sm:text-sm text-muted-foreground">No staff deployed</p>)}</div></div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-3 sm:pt-4 border-t"><Button variant="outline" onClick={() => { setViewDialogOpen(false); handleEditSite(selectedSite); }} size="sm" className="text-xs sm:text-sm"><Edit className="h-4 w-4 mr-2" />Edit</Button><Button variant="outline" onClick={() => handleToggleStatus(selectedSite._id)} size="sm" className="text-xs sm:text-sm">{selectedSite.status === "active" ? "Deactivate" : "Activate"}</Button><Button variant="destructive" onClick={() => { setViewDialogOpen(false); handleDeleteSite(selectedSite._id); }} size="sm" className="text-xs sm:text-sm"><Trash2 className="h-4 w-4 mr-2" />Delete</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SitesSection;