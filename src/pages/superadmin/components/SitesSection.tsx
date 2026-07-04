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
import { siteService, Site, Client, SiteStats, CreateSiteRequest } from "@/services/SiteService";
import { crmService } from "@/services/crmService";
import * as XLSX from "xlsx";

// Define Services and Roles
const ServicesList = [
  "Housekeeping",
  "Security",
  "Parking",
  "Waste Management"
];

const StaffRoles = [
  "Manager",
  "Supervisor",
  "Housekeeping Staff",
  "Security Guard",
  "Parking Attendant",
  "Waste Collector"
];

interface SitesSectionProps {
  refreshTrigger?: number;
}
// Unified Client Service to fetch from CRM
class ClientService {
  async getAllClients(searchTerm?: string): Promise<Client[]> {
    try {
      console.log('👥 Fetching clients from CRM...');
      const crmClients = await crmService.clients.getAll(searchTerm);
      console.log('👥 CRM clients fetched:', crmClients);
      
      const transformedClients = crmClients.map(client => ({
        _id: client._id,
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        city: client.city || "",
        state: ""
      }));
      
      return transformedClients;
    } catch (error) {
      console.error('❌ Failed to fetch from CRM, falling back to site service:', error);
      
      try {
        if (searchTerm) {
          return await siteService.searchClients(searchTerm);
        } else {
          return await siteService.getAllClients();
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  async searchClients(query: string): Promise<Client[]> {
    return this.getAllClients(query);
  }
}
const SitesSection = ({ refreshTrigger = 0 }: SitesSectionProps) =>  {
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
  
  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<{
    valid: any[];
    invalid: any[];
    missingClients: string[];
  }>({ valid: [], invalid: [], missingClients: [] });

  // Initialize client service
  const clientService = new ClientService();
useEffect(() => {
    if (refreshTrigger > 0) {
      fetchSites();
      fetchStats();
      fetchClients();
    }
  }, [refreshTrigger]);
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchSites();
      fetchStats();
      fetchClients();
    }
  }, [refreshTrigger]);

  // Add this useEffect to listen for custom events
  useEffect(() => {
    const handleRefresh = (event: CustomEvent) => {
      if (event.detail?.sites) {
        setSites(event.detail.sites);
        toast.success('Sites updated');
        fetchStats();
      } else {
        // If no data provided, fetch fresh
        fetchSites();
        fetchStats();
        fetchClients();
      }
    };

    window.addEventListener('refreshOperations', handleRefresh as EventListener);
    return () => window.removeEventListener('refreshOperations', handleRefresh as EventListener);
  }, []);
  // Fetch sites, stats, and clients on component mount
  useEffect(() => {
    fetchSites();
    fetchStats();
    fetchClients();
  }, []);

  // Fetch all sites using SiteService
  const fetchSites = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const sitesData = await siteService.getAllSites();
      setSites(sitesData || []);
    } catch (error: any) {
      console.error("Error fetching sites:", error);
      setError(error.message || "Failed to load sites");
      toast.error(error.message || "Failed to load sites");
      setSites([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all clients from CRM using unified service
  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const clientsData = await clientService.getAllClients();
      setClients(clientsData || []);
      
      if (clientsData && clientsData.length > 0 && !selectedClient) {
        setSelectedClient(clientsData[0]._id);
      }
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Search clients using unified service
  const searchClients = async (searchTerm: string) => {
    try {
      setIsLoadingClients(true);
      const clientsData = await clientService.searchClients(searchTerm);
      setClients(clientsData || []);
    } catch (error) {
      console.error("Error searching clients:", error);
      setClients([]);
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Fetch site statistics using SiteService
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

  // Search sites using SiteService
  const searchSites = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const searchResults = await siteService.searchSites({
        query: searchQuery,
        status: statusFilter
      });
      setSites(searchResults || []);
    } catch (error: any) {
      console.error("Error searching sites:", error);
      setError(error.message || "Failed to search sites");
      toast.error(error.message || "Failed to search sites");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle service selection
  const toggleService = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  // Update staff deployment count
  const updateStaffCount = (role: string, count: number) => {
    setStaffDeployment(prev => {
      const existing = prev.find(item => item.role === role);
      if (existing) {
        return prev.map(item =>
          item.role === role ? { ...item, count: Math.max(0, count) } : item
        );
      }
      return [...prev, { role, count }];
    });
  };

  // Reset form to initial state
  const resetForm = () => {
    setSelectedServices([]);
    setStaffDeployment([]);
    setEditMode(false);
    setEditingSiteId(null);
    setSelectedClient("");
    setClientSearch("");
  };

  // Reset import state
  const resetImport = () => {
    setImportFile(null);
    setImportPreview([]);
    setShowPreview(false);
    setImportErrors([]);
    setValidationResults({ valid: [], invalid: [], missingClients: [] });
  };

  // View site details
  const handleViewSite = (site: Site) => {
    setSelectedSite(site);
    setViewDialogOpen(true);
  };

  // Edit site - populate form with site data
  const handleEditSite = (site: Site) => {
    setEditMode(true);
    setEditingSiteId(site._id);
    setSelectedServices(site.services || []);
    setStaffDeployment(site.staffDeployment || []);
    
    if (site.clientId) {
      const client = clients.find(c => c._id === site.clientId);
      if (client) {
        setSelectedClient(client._id);
      }
    } else {
      const client = clients.find(c => c.name === site.clientName);
      if (client) {
        setSelectedClient(client._id);
      } else {
        setSelectedClient("");
      }
    }
    
    setTimeout(() => {
      const form = document.getElementById('site-form') as HTMLFormElement;
      if (form) {
        const safeAreaSqft = site.areaSqft || 0;
        const safeContractValue = site.contractValue || 0;
        const safeContractDate = site.contractEndDate 
          ? new Date(site.contractEndDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        
        (form.elements.namedItem('site-name') as HTMLInputElement).value = site.name || '';
        (form.elements.namedItem('location') as HTMLInputElement).value = site.location || '';
        (form.elements.namedItem('area-sqft') as HTMLInputElement).value = safeAreaSqft.toString();
        (form.elements.namedItem('contract-value') as HTMLInputElement).value = safeContractValue.toString();
        (form.elements.namedItem('contract-end-date') as HTMLInputElement).value = safeContractDate;
      }
    }, 0);
    
    setDialogOpen(true);
  };

  // Add or update site using SiteService
  const handleAddOrUpdateSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);

    let clientName = "";
    let clientId = "";

    if (selectedClient) {
      const client = clients.find(c => c._id === selectedClient);
      if (client) {
        clientName = client.name;
        clientId = client._id;
      }
    } else {
      toast.error("Please select a client from the list");
      return;
    }

    if (!clientName?.trim()) {
      toast.error("Please select a valid client");
      return;
    }

    const siteData: CreateSiteRequest = {
      name: formData.get("site-name") as string,
      clientName: clientName.trim(),
      clientId: clientId || undefined,
      location: formData.get("location") as string,
      areaSqft: Number(formData.get("area-sqft")) || 0,
      contractValue: Number(formData.get("contract-value")) || 0,
      contractEndDate: formData.get("contract-end-date") as string,
      services: selectedServices,
      staffDeployment: staffDeployment.filter(item => item.count > 0),
      status: 'active'
    };

    const validationErrors = siteService.validateSiteData(siteData);
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    try {
      if (editMode && editingSiteId) {
        const updatedSite = await siteService.updateSite(editingSiteId, siteData);
        if (updatedSite) {
          toast.success("Site updated successfully!");
        }
      } else {
        const newSite = await siteService.createSite(siteData);
        if (newSite) {
          toast.success("Site added successfully!");
        }
      }

      setDialogOpen(false);
      resetForm();
      (e.target as HTMLFormElement).reset();
      
      await fetchSites();
      await fetchStats();
      
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

  // Delete site using SiteService
  const handleDeleteSite = async (siteId: string) => {
    if (!confirm("Are you sure you want to delete this site?")) {
      return;
    }

    try {
      const result = await siteService.deleteSite(siteId);
      if (result?.success) {
        toast.success("Site deleted successfully!");
      } else {
        toast.error("Failed to delete site");
      }
      
      await fetchSites();
      await fetchStats();
    } catch (error: any) {
      console.error("Error deleting site:", error);
      toast.error(error.message || "Failed to delete site");
    }
  };

  // Toggle site status using SiteService
  const handleToggleStatus = async (siteId: string) => {
    try {
      const updatedSite = await siteService.toggleSiteStatus(siteId);
      if (updatedSite) {
        toast.success("Site status updated!");
      }
      
      await fetchSites();
      await fetchStats();
    } catch (error: any) {
      console.error("Error toggling site status:", error);
      toast.error(error.message || "Failed to update site status");
    }
  };

  // Formatting helpers using service methods
  const formatCurrency = (amount: number | undefined): string => {
    return siteService.formatCurrency(amount);
  };

  const formatDate = (dateString: string | undefined): string => {
    return siteService.formatDate(dateString);
  };

  const formatNumber = (num: number | undefined): string => {
    return siteService.formatNumber(num);
  };

  const getTotalStaff = (site: Site): number => {
    return siteService.getTotalStaff(site);
  };

  // Handle dialog close
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setDialogOpen(open);
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchSites();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    fetchSites();
  };

  // Calculate average area using service method
  const calculateAverageArea = (): string => {
    const average = siteService.calculateAverageArea(sites);
    return Math.round(average / 1000).toString();
  };

  // Safe stats accessor
  const getSafeStats = () => {
    return stats || siteService.getDefaultStats();
  };

  // ============== IMPORT FUNCTIONS ==============

  // Read Excel file
  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { 
            header: 1,
            blankrows: false,
            defval: ''
          });
          
          if (jsonData.length < 2) {
            resolve([]);
            return;
          }
          
          const headers = (jsonData[0] as string[]).map(h => h?.toString().trim() || '');
          const rows = jsonData.slice(1) as any[];
          
          const formattedData = rows
            .filter(row => {
              return row.some((cell: any) => cell !== null && cell !== undefined && cell.toString().trim() !== '');
            })
            .map(row => {
              const obj: any = {};
              headers.forEach((header, index) => {
                if (header && row[index] !== undefined && row[index] !== null) {
                  obj[header] = row[index]?.toString().trim();
                } else {
                  obj[header] = '';
                }
              });
              return obj;
            });
          
          resolve(formattedData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsBinaryString(file);
    });
  };

  // Validate imported sites against CRM clients
  const validateImportedSites = async (importedData: any[]) => {
    const validSites: any[] = [];
    const invalidSites: any[] = [];
    const missingClients: string[] = [];
    const errors: string[] = [];

    // Fetch all clients for validation
    await fetchClients();
    
    for (let index = 0; index < importedData.length; index++) {
      const row = importedData[index];
      const rowNumber = index + 2; // +2 for header row and 1-based index
      
      // Check required fields
      const siteName = row['Site Name'] || row['SITE NAME'] || row['site name'] || '';
      const clientName = row['Client Name'] || row['CLIENT NAME'] || row['client name'] || '';
      const location = row['Location'] || row['LOCATION'] || row['location'] || '';
      const areaSqft = row['Area (sqft)'] || row['AREA'] || row['area'] || row['Area Sqft'] || '';
      const contractValue = row['Contract Value'] || row['CONTRACT VALUE'] || row['contract value'] || row['Value'] || '';
      const contractEndDate = row['Contract End Date'] || row['CONTRACT END DATE'] || row['contract end date'] || row['End Date'] || '';

      if (!siteName) {
        errors.push(`Row ${rowNumber}: Missing Site Name`);
        invalidSites.push(row);
        continue;
      }

      if (!clientName) {
        errors.push(`Row ${rowNumber}: Missing Client Name`);
        invalidSites.push(row);
        continue;
      }

      if (!location) {
        errors.push(`Row ${rowNumber}: Missing Location`);
        invalidSites.push(row);
        continue;
      }

      if (!areaSqft) {
        errors.push(`Row ${rowNumber}: Missing Area`);
        invalidSites.push(row);
        continue;
      }

      if (!contractValue) {
        errors.push(`Row ${rowNumber}: Missing Contract Value`);
        invalidSites.push(row);
        continue;
      }

      if (!contractEndDate) {
        errors.push(`Row ${rowNumber}: Missing Contract End Date`);
        invalidSites.push(row);
        continue;
      }

      // Check if client exists in CRM
      const clientExists = clients.some(client => 
        client.name.toLowerCase() === clientName.toLowerCase() ||
        client.company.toLowerCase() === clientName.toLowerCase()
      );

      if (!clientExists) {
        missingClients.push(`${clientName} (Row ${rowNumber})`);
        invalidSites.push(row);
        continue;
      }

      // Parse services
      let services: string[] = [];
      const servicesStr = row['Services'] || row['SERVICES'] || row['services'] || '';
      if (servicesStr) {
        services = servicesStr.split(',').map((s: string) => s.trim()).filter((s: string) => 
          ServicesList.includes(s)
        );
      }

      // Parse staff deployment
      let staffDeployment: Array<{ role: string; count: number }> = [];
      StaffRoles.forEach(role => {
        const roleKey = role.replace(/\s+/g, '');
        const roleCount = row[role] || row[roleKey] || row[role.toUpperCase()] || 0;
        const count = parseInt(roleCount) || 0;
        if (count > 0) {
          staffDeployment.push({ role, count });
        }
      });

      // Calculate manager count and supervisor count from staffDeployment
      const managerCount = staffDeployment
        .filter(item => item.role === 'Manager')
        .reduce((sum, item) => sum + item.count, 0);
      
      const supervisorCount = staffDeployment
        .filter(item => item.role === 'Supervisor')
        .reduce((sum, item) => sum + item.count, 0);

      // Create site object
      const siteObj = {
        name: siteName,
        clientName: clientName,
        location: location,
        areaSqft: parseFloat(areaSqft) || 0,
        contractValue: parseFloat(contractValue.toString().replace(/[^0-9.-]+/g, '')) || 0,
        contractEndDate: new Date(contractEndDate).toISOString().split('T')[0],
        services: services,
        staffDeployment: staffDeployment,
        managerCount: managerCount,
        supervisorCount: supervisorCount,
        status: 'active'
      };

      validSites.push(siteObj);
    }

    setImportErrors(errors);
    return { valid: validSites, invalid: invalidSites, missingClients };
  };

  // Handle file selection for import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportLoading(true);
    setImportErrors([]);
    setValidationResults({ valid: [], invalid: [], missingClients: [] });

    try {
      const importedData = await readExcelFile(file);
      setImportPreview(importedData);
      
      // Validate against CRM clients
      const results = await validateImportedSites(importedData);
      setValidationResults(results);
      setShowPreview(true);
      
      if (results.valid.length > 0) {
        toast.success(`${results.valid.length} valid sites ready for import`);
      }
      if (results.missingClients.length > 0) {
        toast.warning(`${results.missingClients.length} sites have clients not in CRM`);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Failed to read file. Please check the format.");
    } finally {
      setImportLoading(false);
    }
  };

  // Import valid sites
  const handleImportSites = async () => {
    if (validationResults.valid.length === 0) {
      toast.error("No valid sites to import");
      return;
    }

    setImportLoading(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const siteData of validationResults.valid) {
      try {
        // Find client ID from CRM
        const client = clients.find(c => 
          c.name.toLowerCase() === siteData.clientName.toLowerCase() ||
          c.company.toLowerCase() === siteData.clientName.toLowerCase()
        );

        const siteToCreate: CreateSiteRequest = {
          ...siteData,
          clientId: client?._id,
          staffDeployment: siteData.staffDeployment,
          status: 'active'
        };

        await siteService.createSite(siteToCreate);
        successCount++;
      } catch (error: any) {
        console.error(`Failed to import site ${siteData.name}:`, error);
        errors.push(`${siteData.name}: ${error.message || 'Unknown error'}`);
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} sites${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      if (errors.length > 0) {
        console.error('Import errors:', errors);
      }
      
      // Refresh data
      await fetchSites();
      await fetchStats();
      
      // Close import dialog and reset
      setImportDialogOpen(false);
      resetImport();
    } else {
      toast.error(`Failed to import any sites. ${errors[0] || 'Check the data format.'}`);
    }

    setImportLoading(false);
  };

  // Download import template
  const downloadTemplate = () => {
    const templateData = [
      [
        'Site Name*', 
        'Client Name*', 
        'Location*', 
        'Area (sqft)*', 
        'Contract Value*', 
        'Contract End Date*', 
        'Services', 
        'Manager', 
        'Supervisor', 
        'Housekeeping Staff', 
        'Security Guard', 
        'Parking Attendant', 
        'Waste Collector'
      ],
      [
        'Phoenix Mall', 
        'PHOENIX MALL', 
        'Wakad, Pune', 
        '50000', 
        '5000000', 
        '2025-12-31', 
        'Housekeeping,Security', 
        '1', 
        '2', 
        '10', 
        '5', 
        '3', 
        '2'
      ],
      [
        'Highstreet Mall', 
        'HIGHSTREET MALL', 
        'Hinjewadi, Pune', 
        '75000', 
        '7500000', 
        '2025-06-30', 
        'Security,Parking,Waste Management', 
        '1', 
        '3', 
        '0', 
        '8', 
        '4', 
        '3'
      ],
      ['', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['*Required fields: Site Name, Client Name, Location, Area, Contract Value, Contract End Date'],
      ['Services: Separate multiple services with commas (Housekeeping, Security, Parking, Waste Management)'],
      ['Staff Counts: Enter numbers for each role (0 if not applicable)'],
      ['Contract End Date format: YYYY-MM-DD'],
      ['Note: Client Name must match exactly with client name in CRM']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Site Import Template');
    XLSX.writeFile(wb, 'Site_Import_Template.xlsx');
  };

  // Render clients dropdown with CRM data
  const renderClientsDropdown = () => {
    if (isLoadingClients) {
      return (
        <div className="flex items-center space-x-2 p-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading clients from CRM...</span>
        </div>
      );
    }
    
    const safeClients = clients || [];
    
    return (
      <>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients in CRM..."
            value={clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value);
              if (e.target.value.length >= 2) {
                searchClients(e.target.value);
              } else if (e.target.value.length === 0) {
                fetchClients();
              }
            }}
            className="pl-10 mb-2"
          />
        </div>
        
        <div className="border rounded-md max-h-60 overflow-y-auto">
          {safeClients.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No clients found in CRM. 
              <br />
              <Button 
                variant="link" 
                size="sm" 
                className="mt-1"
                onClick={() => {
                  toast.info("Please add clients in the CRM section first");
                }}
              >
                Add clients in CRM
              </Button>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {safeClients.map((client) => (
                <div 
                  key={client._id}
                  className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${selectedClient === client._id ? 'bg-blue-50 border border-blue-200' : ''}`}
                  onClick={() => setSelectedClient(client._id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{client.name}</div>
                      <div className="text-xs text-muted-foreground">{client.company}</div>
                    </div>
                    {selectedClient === client._id && (
                      <Badge variant="outline" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center space-x-2 text-xs text-muted-foreground">
                    {client.email && <div className="flex items-center"><Mail className="h-3 w-3 mr-1" /> {client.email}</div>}
                    {client.phone && <div className="flex items-center"><Phone className="h-3 w-3 mr-1" /> {client.phone}</div>}
                    {client.city && <div className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {client.city}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {selectedClient && safeClients.length > 0 && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">Selected Client:</div>
                <div className="text-sm">
                  {(() => {
                    const client = safeClients.find(c => c._id === selectedClient);
                    if (!client) return null;
                    
                    return (
                      <>
                        <div className="font-semibold">{client.name} - {client.company}</div>
                        <div className="mt-1 space-y-1">
                          {client.email && <div className="flex items-center"><Mail className="h-3 w-3 mr-1" /> {client.email}</div>}
                          {client.phone && <div className="flex items-center"><Phone className="h-3 w-3 mr-1" /> {client.phone}</div>}
                          {client.city && <div className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {client.city}</div>}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedClient("")}
                className="h-6 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6">
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center text-red-700">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="text-sm sm:text-base">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto flex-shrink-0"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Sites</p>
                <p className="text-xl sm:text-2xl font-bold">{getSafeStats().totalSites}</p>
              </div>
              <Building className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
            <div className="mt-2 text-xs sm:text-sm">
              <span className="text-green-600 font-medium">{getSafeStats().activeSites} active</span>
              <span className="mx-2">•</span>
              <span className="text-gray-600">{getSafeStats().inactiveSites} inactive</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Staff</p>
                <p className="text-xl sm:text-2xl font-bold">{getSafeStats().totalStaff}</p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Contract Value</p>
                <p className="text-xl sm:text-2xl font-bold">{formatCurrency(getSafeStats().totalContractValue)}</p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Average Area</p>
                <p className="text-xl sm:text-2xl font-bold">{calculateAverageArea()}K sqft</p>
              </div>
              <BarChart className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar - Responsive */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSearch} className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sites..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-sm sm:text-base"
                  />
                </div>
              </div>
              
              <div className="w-full sm:w-48">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-9 sm:h-10 pl-10 pr-4 rounded-md border border-input bg-background text-xs sm:text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" className="flex-1 sm:flex-none">
                  <Search className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Search</span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                  Reset
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { fetchSites(); fetchStats(); fetchClients(); }}>
                  <RefreshCw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Main Card with Header */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Site Management</CardTitle>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* Import Button */}
            <Dialog open={importDialogOpen} onOpenChange={(open) => {
              setImportDialogOpen(open);
              if (!open) resetImport();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <Upload className="h-4 w-4 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Import</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Import Sites from Excel</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Upload an Excel file with site data. Client names must match exactly with clients in CRM.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 sm:space-y-6">
                  {/* File Upload Area */}
                  <div className="space-y-2">
                    <Label htmlFor="site-excel-file" className="text-xs sm:text-sm font-medium">Upload Excel File</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-8 text-center hover:border-blue-400 transition-colors bg-gray-50">
                      <Input 
                        id="site-excel-file"
                        type="file" 
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={importLoading}
                      />
                      <Label htmlFor="site-excel-file" className="cursor-pointer">
                        <UploadCloud className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 text-gray-400" />
                        <p className="text-xs sm:text-sm font-medium text-gray-700">
                          {importLoading ? 'Processing...' : 'Drag & drop or click to upload'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Supports .xlsx, .xls, .csv files
                        </p>
                      </Label>
                      {importFile && (
                        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <p className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <span className="truncate">{importFile.name}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Download Template */}
                  <div className="flex justify-center">
                    <Button 
                      onClick={downloadTemplate}
                      variant="outline"
                      size="sm"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                  </div>

                  {/* Preview Section */}
                  {showPreview && validationResults.valid.length > 0 && (
                    <div className="border rounded-lg p-3 sm:p-4 bg-green-50">
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                        <h3 className="font-semibold text-green-800 text-xs sm:text-sm">Valid Sites ({validationResults.valid.length})</h3>
                      </div>
                      <div className="max-h-32 sm:max-h-40 overflow-y-auto text-xs">
                        {validationResults.valid.map((site, idx) => (
                          <div key={idx} className="py-1 border-b border-green-200 last:border-0">
                            {site.name} - {site.clientName}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Clients Section */}
                  {validationResults.missingClients.length > 0 && (
                    <div className="border rounded-lg p-3 sm:p-4 bg-yellow-50">
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0" />
                        <h3 className="font-semibold text-yellow-800 text-xs sm:text-sm">Clients Not Found in CRM ({validationResults.missingClients.length})</h3>
                      </div>
                      <p className="text-xs text-yellow-700 mb-2">
                        Add these clients to CRM first:
                      </p>
                      <div className="max-h-32 sm:max-h-40 overflow-y-auto text-xs">
                        {validationResults.missingClients.map((client, idx) => (
                          <div key={idx} className="py-1 border-b border-yellow-200 last:border-0">
                            {client}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors Section */}
                  {importErrors.length > 0 && (
                    <div className="border rounded-lg p-3 sm:p-4 bg-red-50">
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
                        <h3 className="font-semibold text-red-800 text-xs sm:text-sm">Validation Errors ({importErrors.length})</h3>
                      </div>
                      <div className="max-h-32 sm:max-h-40 overflow-y-auto text-xs">
                        {importErrors.map((error, idx) => (
                          <div key={idx} className="py-1 border-b border-red-200 last:border-0 text-red-700">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button 
                      onClick={handleImportSites}
                      disabled={validationResults.valid.length === 0 || importLoading}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm py-2 sm:py-2"
                      size="sm"
                    >
                      {importLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        `Import ${validationResults.valid.length} Sites`
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setImportDialogOpen(false);
                        resetImport();
                      }}
                      className="flex-1 text-xs sm:text-sm py-2 sm:py-2"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Add Site Button */}
            <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()} size="sm" className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Add Site</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">{editMode ? "Edit Site" : "Add New Site"}</DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    Select a client from your CRM database
                  </DialogDescription>
                </DialogHeader>

                <form id="site-form" onSubmit={handleAddOrUpdateSite} className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField label="Site Name" id="site-name" required>
                      <Input 
                        id="site-name" 
                        name="site-name" 
                        placeholder="Enter site name" 
                        required 
                        defaultValue=""
                        className="text-sm"
                      />
                    </FormField>

                    <FormField label="Location" id="location" required>
                      <Input 
                        id="location" 
                        name="location" 
                        placeholder="Enter location" 
                        required 
                        defaultValue=""
                        className="text-sm"
                      />
                    </FormField>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">
                      Select Client from CRM <span className="text-muted-foreground">(Required)</span>
                    </Label>
                    <div className="text-xs text-muted-foreground mb-1 sm:mb-2">
                      Search and select a client from your CRM database
                    </div>
                    {renderClientsDropdown()}
                    
                    {!selectedClient && !isLoadingClients && clients.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-700">
                          Please select a client from the list above
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <FormField label="Area (sqft)" id="area-sqft" required>
                      <Input 
                        id="area-sqft" 
                        name="area-sqft" 
                        type="number" 
                        placeholder="Area" 
                        required 
                        min="1"
                        defaultValue="1000"
                        className="text-sm"
                      />
                    </FormField>
                    <FormField label="Contract Value (₹)" id="contract-value" required>
                      <Input 
                        id="contract-value" 
                        name="contract-value" 
                        type="number" 
                        placeholder="Value" 
                        required 
                        min="0"
                        defaultValue="100000"
                        className="text-sm"
                      />
                    </FormField>
                    <FormField label="Contract End Date" id="contract-end-date" required>
                      <Input 
                        id="contract-end-date" 
                        name="contract-end-date" 
                        type="date" 
                        required 
                        min={new Date().toISOString().split('T')[0]}
                        defaultValue={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                        className="text-sm"
                      />
                    </FormField>
                  </div>

                  <div className="border p-3 sm:p-4 rounded-md">
                    <p className="font-medium mb-2 sm:mb-3 text-sm">Services for this Site</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ServicesList.map((service) => (
                        <div key={service} className="flex items-center space-x-2">
                          <Checkbox
                            id={`service-${service}`}
                            checked={selectedServices.includes(service)}
                            onCheckedChange={() => toggleService(service)}
                          />
                          <label htmlFor={`service-${service}`} className="cursor-pointer text-xs sm:text-sm">
                            {service}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border p-3 sm:p-4 rounded-md">
                    <p className="font-medium mb-2 sm:mb-3 text-sm">Staff Deployment</p>
                    <div className="space-y-2 sm:space-y-3">
                      {StaffRoles.map((role) => {
                        const deployment = staffDeployment.find(item => item.role === role);
                        const count = deployment?.count || 0;
                        return (
                          <div key={role} className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm">{role}</span>
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateStaffCount(role, count - 1)}
                                disabled={count <= 0}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                value={count}
                                onChange={(e) => updateStaffCount(role, parseInt(e.target.value) || 0)}
                                className="w-12 sm:w-16 text-center h-7 sm:h-8 text-sm"
                                min="0"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateStaffCount(role, count + 1)}
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 pt-2">
                    <Button type="submit" className="flex-1 text-sm py-2" disabled={!selectedClient} size="sm">
                      {editMode ? "Update Site" : "Add Site"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="text-sm py-2" size="sm">
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="p-0 sm:p-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
              <span className="ml-2 sm:ml-3 text-sm sm:text-base">Loading sites...</span>
            </div>
          ) : !sites || sites.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <Building className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No Sites Found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search filters'
                  : 'Get started by adding your first site'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => setDialogOpen(true)} size="sm" className="text-xs sm:text-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Site
                </Button>
                <Button variant="outline" onClick={() => setImportDialogOpen(true)} size="sm" className="text-xs sm:text-sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Sites
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Site Name</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Client</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Location</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Services</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Staff</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Area</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Value</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => {
                    const safeAreaSqft = site.areaSqft || 0;
                    const safeContractValue = site.contractValue || 0;
                    const safeStaffDeployment = Array.isArray(site.staffDeployment) ? site.staffDeployment : [];
                    const safeServices = Array.isArray(site.services) ? site.services : [];
                    
                    return (
                      <TableRow key={site._id}>
                        <TableCell className="text-xs sm:text-sm">
                          <div>
                            <div className="font-medium">{site.name || 'Unnamed'}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(site.createdAt)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div>
                            <div>{site.clientName || 'Unknown'}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">{site.location || 'Unknown'}</TableCell>
                        <TableCell className="max-w-[120px] sm:max-w-[160px]">
                          <div className="flex flex-wrap gap-1">
                            {safeServices.slice(0, 2).map((srv, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] sm:text-xs">
                                {srv}
                              </Badge>
                            ))}
                            {safeServices.length > 2 && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs">
                                +{safeServices.length - 2}
                              </Badge>
                            )}
                            {safeServices.length === 0 && (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                            {getTotalStaff(site)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">{formatNumber(safeAreaSqft)}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{formatCurrency(safeContractValue)}</TableCell>
                        <TableCell>
                          <Badge variant={site.status === "active" ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                            {site.status || 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1 sm:gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewSite(site)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditSite(site)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(site._id)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            >
                              {site.status === "active" ? "D" : "A"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteSite(site._id)}
                              className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* View Site Dialog - Responsive */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Site Details</DialogTitle>
          </DialogHeader>
          
          {selectedSite && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Site Name</h3>
                    <p className="text-base sm:text-lg font-semibold">{selectedSite.name}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Client</h3>
                    <p className="text-base sm:text-lg font-semibold">{selectedSite.clientName}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Location</h3>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-base sm:text-lg font-semibold">{selectedSite.location}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Area</h3>
                    <div className="flex items-center gap-2">
                      <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-base sm:text-lg font-semibold">{formatNumber(selectedSite.areaSqft)} sqft</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Contract Value</h3>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-base sm:text-lg font-semibold">{formatCurrency(selectedSite.contractValue)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Contract End Date</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-base sm:text-lg font-semibold">{formatDate(selectedSite.contractEndDate)}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Status</h3>
                    <Badge variant={selectedSite.status === "active" ? "default" : "secondary"} className="text-xs sm:text-sm">
                      {selectedSite.status?.toUpperCase() || 'ACTIVE'}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">Created</h3>
                    <p className="text-sm">{formatDate(selectedSite.createdAt)}</p>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">Services</h3>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {Array.isArray(selectedSite.services) && selectedSite.services.length > 0 ? (
                    selectedSite.services.map((service, index) => (
                      <Badge key={index} variant="secondary" className="text-[10px] sm:text-xs">
                        {service}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground">No services assigned</p>
                  )}
                </div>
              </div>
              
              <div className="border rounded-lg p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2 sm:mb-3">Staff Deployment</h3>
                <div className="space-y-2 sm:space-y-3">
                  {Array.isArray(selectedSite.staffDeployment) && selectedSite.staffDeployment.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                        {selectedSite.staffDeployment.map((deploy, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                            <span className="text-xs sm:text-sm font-medium">{deploy.role}</span>
                            <Badge variant="outline" className="text-[10px] sm:text-xs">{deploy.count}</Badge>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 sm:pt-3 border-t">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium">Total Staff:</span>
                          <span className="text-base sm:text-lg font-bold">{getTotalStaff(selectedSite)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground">No staff deployed</p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-3 sm:pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleEditSite(selectedSite);
                  }}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleToggleStatus(selectedSite._id)}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  {selectedSite.status === "active" ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleDeleteSite(selectedSite._id);
                  }}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SitesSection;