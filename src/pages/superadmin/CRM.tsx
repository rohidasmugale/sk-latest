import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { DashboardSidebar } from "@/components/shared/DashboardSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Plus, Edit, Trash2, Phone, Mail, Calendar, Eye, MapPin, Building,
  Loader2, Upload, Download, Users, TrendingUp, Target, BarChart3, MessageSquare,
  ChevronRight, Filter, MoreVertical, CheckCircle, XCircle, AlertCircle,
  ArrowUpRight, Users as UsersIcon, FileText, Clock, Bell, Sun, Moon,
  DollarSign, Check, X, Menu, DownloadCloud, UploadCloud
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  crmService,
  Client,
  Lead,
  Communication,
  CRMStats
} from "../../services/crmService";

// Indian Data constants
const indianCities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad"];
const industries = ["MALL", "COMMERCIAL", "Banking", "Healthcare", "Education", "Real Estate", "Retail", "Automobile"];
const leadSources = ["Website", "Referral", "Cold Call", "Social Media", "Email Campaign", "Trade Show"];
const communicationTypes = ["call", "email", "meeting", "demo"];

const CRM = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [commDialogOpen, setCommDialogOpen] = useState(false);
  const [importClientDialogOpen, setImportClientDialogOpen] = useState(false);
  const [importLeadDialogOpen, setImportLeadDialogOpen] = useState(false);
  const [viewClientDialog, setViewClientDialog] = useState<string | null>(null);
  const [viewLeadDialog, setViewLeadDialog] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("clients");
  const [loading, setLoading] = useState({
    clients: false,
    leads: false,
    communications: false,
    stats: false
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [stats, setStats] = useState<CRMStats>({
    totalClients: 0,
    activeLeads: 0,
    totalValue: "₹0",
    communications: 0
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading({
      clients: true,
      leads: true,
      communications: true,
      stats: true
    });

    try {
      const data = await crmService.fetchAllData(searchQuery);
      setStats(data.stats);
      setClients(data.clients);
      setLeads(data.leads);
      setCommunications(data.communications);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading({
        clients: false,
        leads: false,
        communications: false,
        stats: false
      });
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(prev => ({ ...prev, stats: true }));
      const statsData = await crmService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  const fetchClients = async () => {
    try {
      setLoading(prev => ({ ...prev, clients: true }));
      const clientsData = await crmService.clients.getAll(searchQuery);
      setClients(clientsData);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(prev => ({ ...prev, clients: false }));
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(prev => ({ ...prev, leads: true }));
      const leadsData = await crmService.leads.getAll(searchQuery);
      setLeads(leadsData);
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(prev => ({ ...prev, leads: false }));
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "clients") fetchClients();
      else if (activeTab === "leads") fetchLeads();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleMenuClick = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const handleMobileClose = () => {
    setMobileSidebarOpen(false);
  };

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
          if (jsonData.length < 2) {
            resolve([]);
            return;
          }
          const headers = (jsonData[0] as string[]).map(h => h?.toString().trim() || '');
          const rows = jsonData.slice(1) as any[];
          const formattedData = rows.filter(row => row.some((cell: any) => cell !== null && cell !== undefined && cell.toString().trim() !== ''))
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
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

  const handleImportExcel = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }
    setImportLoading(true);
    try {
      const importedData = await readExcelFile(importFile);
      const validData = validateImportData(importedData);
      if (validData.length === 0) {
        toast.error("No valid data found in the file");
        return;
      }
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];
      for (const clientData of validData) {
        try {
          const { _id, createdAt, updatedAt, ...clientToCreate } = clientData;
          await crmService.clients.create(clientToCreate);
          successCount++;
        } catch (error: any) {
          errors.push(`${clientData.name}: ${error.message || 'Unknown error'}`);
          errorCount++;
        }
      }
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} clients${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        setImportClientDialogOpen(false);
        setImportFile(null);
        fetchAllData();
      } else {
        toast.error(`Failed to import any clients. ${errors[0] || 'Check the template format.'}`);
      }
    } catch (error) {
      toast.error("Failed to import file. Please check the format.");
    } finally {
      setImportLoading(false);
    }
  };

  const validateImportData = (data: any[]): Client[] => {
    const validClients: Client[] = [];
    data.forEach((row, index) => {
      if (!row['Client Name'] && !row['Company']) {
        return;
      }
      const clientName = row['Client Name'] || '';
      const companyName = row['Company'] || '';
      let email = row['Email'] || '';
      if (!email && clientName) {
        const emailName = clientName.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '.');
        email = `${emailName}@company.com`;
      }
      let phone = row['Phone']?.toString() || '';
      if (!phone) {
        const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
        phone = `9${randomNum.toString().slice(0, 9)}`;
      }
      let expectedValue = row['Expected Value'] || '';
      if (!expectedValue) {
        const randomValue = Math.floor(10 + Math.random() * 90) * 100000;
        expectedValue = `₹${randomValue.toLocaleString('en-IN')}`;
      }
      const industry = row['Industry'] || 'COMMERCIAL';
      const client: Client = {
        _id: `temp-${Date.now()}-${index}`,
        name: clientName,
        company: companyName,
        email: email,
        phone: phone,
        industry: industry,
        city: row['City'] || 'Pune',
        value: expectedValue,
        address: row['Address'] || '',
        contactPerson: row['Contact Person'] || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (!client.name.trim() || !client.company.trim()) return;
      validClients.push(client);
    });
    return validClients;
  };

  const downloadClientTemplate = () => {
    const templateData = [
      ['SR. NO.', 'Client Name*', 'Company*', 'Email*', 'Phone*', 'Industry', 'City', 'Expected Value*', 'Address', 'Contact Person'],
      ['1', 'PHOENIX MALL', 'ALYSSUM DEVELOPERS', 'contact@phoenixmall.com', '9876543210', 'MALL', 'PUNE', '₹50,00,000', 'WAKAD, PUNE', ''],
      ['2', 'HIGHSTREET MALL', 'HARKRISH PROPERTIES', 'info@highstreetmall.com', '9876543211', 'MALL', 'PUNE', '₹75,00,000', 'HINJEWADI, PUNE', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['Note:', 'Required fields marked with *', '', '', '', '', '', '', '', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Client Details');
    XLSX.writeFile(wb, 'Client_Import_Template.xlsx');
    toast.success("Template downloaded successfully");
  };

  const handleImportLeadExcel = async () => {
    if (!importFile) {
      toast.error("Please select a file to import");
      return;
    }
    setImportLoading(true);
    try {
      const importedData = await readExcelFile(importFile);
      const validData = validateLeadImportData(importedData);
      if (validData.length === 0) {
        toast.error("No valid lead data found in the file");
        return;
      }
      let successCount = 0;
      let errorCount = 0;
      for (const leadData of validData) {
        try {
          const { _id, createdAt, updatedAt, ...leadToCreate } = leadData;
          await crmService.leads.create(leadToCreate);
          successCount++;
        } catch (error: any) {
          errorCount++;
        }
      }
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} leads${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        setImportLeadDialogOpen(false);
        setImportFile(null);
        fetchAllData();
      } else {
        toast.error("Failed to import any leads.");
      }
    } catch (error) {
      toast.error("Failed to import file. Please check the format.");
    } finally {
      setImportLoading(false);
    }
  };

  const validateLeadImportData = (data: any[]): Lead[] => {
    const validLeads: Lead[] = [];
    data.forEach((row, index) => {
      const leadName = row['Lead Name'] || row['Lead Name*'] || '';
      const companyName = row['Company'] || row['Company*'] || '';
      if (!leadName.trim() && !companyName.trim()) return;
      const finalLeadName = leadName.trim() || `Contact at ${companyName}`;
      const finalCompanyName = companyName.trim() || `${leadName}'s Company`;
      let email = row['Email'] || '';
      if (!email && finalLeadName) {
        const emailName = finalLeadName.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '.');
        email = `${emailName}@company.com`;
      }
      let phone = row['Phone']?.toString() || '';
      if (!phone) {
        const randomNum = Math.floor(1000000000 + Math.random() * 9000000000);
        phone = `9${randomNum.toString().slice(0, 9)}`;
      }
      let expectedValue = row['Expected Value'] || '';
      if (!expectedValue) {
        const randomValue = Math.floor(10 + Math.random() * 90) * 100000;
        expectedValue = `₹${randomValue.toLocaleString('en-IN')}`;
      }
      const source = row['Source'] || 'Website';
      const validSources = ['Website', 'Referral', 'Cold Call', 'Social Media', 'Email Campaign', 'Trade Show'];
      const finalSource = validSources.includes(source) ? source : 'Website';
      let formattedFollowUpDate = '';
      const followUpDate = row['Follow-up Date'] || '';
      if (followUpDate) {
        try {
          const date = new Date(followUpDate);
          if (!isNaN(date.getTime())) formattedFollowUpDate = date.toISOString();
        } catch (e) { }
      }
      validLeads.push({
        _id: `temp-${Date.now()}-${index}`,
        name: finalLeadName,
        company: finalCompanyName,
        email: email,
        phone: phone,
        source: finalSource,
        status: 'new',
        value: expectedValue,
        assignedTo: row['Assigned To'] || 'Sales Team',
        followUpDate: formattedFollowUpDate,
        notes: row['Notes'] || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    return validLeads;
  };

  const downloadLeadTemplate = () => {
    const templateData = [
      ['Lead Name*', 'Company*', 'Email*', 'Phone*', 'Source*', 'Expected Value*', 'Assigned To*', 'Follow-up Date', 'Notes'],
      ['Amit Sharma', 'Sharma Enterprises', 'amit@sharma.com', '9876543210', 'Website', '₹30,00,000', 'Sales Team', '2024-01-20', 'Interested in commercial space'],
      ['Priya Patel', 'Patel Group', 'priya@patelgroup.com', '9876543211', 'Referral', '₹45,00,000', 'Marketing Team', '2024-01-25', 'Follow up for meeting'],
      ['', '', '', '', '', '', '', '', ''],
      ['Note:', 'Required fields marked with *', 'Source options: Website, Referral, Cold Call, Social Media, Email Campaign, Trade Show', '', '', '', '', 'Date format: YYYY-MM-DD', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lead Details');
    XLSX.writeFile(wb, 'Lead_Import_Template.xlsx');
    toast.success("Template downloaded successfully");
  };

  const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await crmService.clients.create({
        name: formData.get("name") as string,
        company: formData.get("company") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        address: formData.get("address") as string || "",
        city: formData.get("city") as string || "Mumbai",
        status: "active",
        value: formData.get("value") as string,
        industry: formData.get("industry") as string || "IT Services",
        contactPerson: formData.get("contactPerson") as string || "",
      });
      setClientDialogOpen(false);
      fetchAllData();
      toast.success("Client added successfully!");
    } catch (error) {
      toast.error("Failed to add client");
    }
  };

  const handleEditClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingClient) return;
    const formData = new FormData(e.currentTarget);
    try {
      await crmService.clients.update(editingClient._id, {
        name: formData.get("name") as string,
        company: formData.get("company") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        address: formData.get("address") as string,
        city: formData.get("city") as string,
        value: formData.get("value") as string,
        industry: formData.get("industry") as string,
        contactPerson: formData.get("contactPerson") as string,
      });
      setEditingClient(null);
      fetchAllData();
      toast.success("Client updated successfully!");
    } catch (error) {
      toast.error("Failed to update client");
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    try {
      await crmService.clients.delete(clientId);
      fetchAllData();
      toast.success("Client deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete client");
    }
  };

  const handleAddLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await crmService.leads.create({
        name: formData.get("name") as string,
        company: formData.get("company") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        source: formData.get("source") as string,
        status: "new",
        value: formData.get("value") as string,
        assignedTo: formData.get("assignedTo") as string,
        followUpDate: formData.get("followUpDate") as string || "",
        notes: formData.get("notes") as string || "",
      });
      setLeadDialogOpen(false);
      fetchAllData();
      toast.success("Lead added successfully!");
    } catch (error) {
      toast.error("Failed to add lead");
    }
  };

  const handleEditLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLead) return;
    const formData = new FormData(e.currentTarget);
    try {
      await crmService.leads.update(editingLead._id, {
        name: formData.get("name") as string,
        company: formData.get("company") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        source: formData.get("source") as string,
        value: formData.get("value") as string,
        assignedTo: formData.get("assignedTo") as string,
        followUpDate: formData.get("followUpDate") as string,
        notes: formData.get("notes") as string,
      });
      setEditingLead(null);
      fetchAllData();
      toast.success("Lead updated successfully!");
    } catch (error) {
      toast.error("Failed to update lead");
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      await crmService.leads.delete(leadId);
      fetchAllData();
      toast.success("Lead deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete lead");
    }
  };

  const handleLeadStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    try {
      await crmService.leads.updateStatus(leadId, newStatus);
      fetchAllData();
      toast.success("Lead status updated!");
    } catch (error) {
      toast.error("Failed to update lead status");
    }
  };

  const handleAddCommunication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await crmService.communications.create({
        clientName: formData.get("clientName") as string,
        clientId: formData.get("clientId") as string,
        type: formData.get("type") as any,
        date: formData.get("date") as string,
        notes: formData.get("notes") as string,
        followUpRequired: formData.get("followUpRequired") === "on",
        followUpDate: formData.get("followUpDate") as string || undefined,
      });
      setCommDialogOpen(false);
      fetchAllData();
      toast.success("Communication logged successfully!");
    } catch (error) {
      toast.error("Failed to log communication");
    }
  };

  const handleDeleteCommunication = async (commId: string) => {
    if (!confirm("Are you sure you want to delete this communication?")) return;
    try {
      await crmService.communications.delete(commId);
      fetchAllData();
      toast.success("Communication deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete communication");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 text-blue-800 border-blue-200";
      case "contacted": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "qualified": return "bg-green-100 text-green-800 border-green-200";
      case "proposal": return "bg-purple-100 text-purple-800 border-purple-200";
      case "negotiation": return "bg-orange-100 text-orange-800 border-orange-200";
      case "closed-won": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "closed-lost": return "bg-red-100 text-red-800 border-red-200";
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "inactive": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "new": return "New";
      case "contacted": return "Contacted";
      case "qualified": return "Qualified";
      case "proposal": return "Proposal";
      case "negotiation": return "Negotiation";
      case "closed-won": return "Won";
      case "closed-lost": return "Lost";
      default: return status;
    }
  };

  const getCommunicationTypeIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="h-3 w-3" />;
      case "email": return <Mail className="h-3 w-3" />;
      case "meeting": return <Calendar className="h-3 w-3" />;
      case "demo": return <Eye className="h-3 w-3" />;
      default: return null;
    }
  };

  const getClientById = (id: string) => clients.find(client => client._id === id);
  const getLeadById = (id: string) => leads.find(lead => lead._id === id);

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  // Mobile Card Component for Clients
  const ClientMobileCard = ({ client, onView, onEdit, onDelete }: any) => (
    <Card className="mb-3 rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base">{client.name}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{client.company}</div>
          </div>
          <Badge className={client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
            {client.status}
          </Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3 text-gray-400" />
            <span className="truncate text-xs">{client.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 text-gray-400" />
            <span className="text-xs">{client.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 text-gray-400" />
            <span className="text-xs truncate">{client.city}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <span className="font-bold text-green-600 text-sm">{client.value}</span>
            <Badge variant="outline" className="text-xs">{client.industry}</Badge>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={() => onView(client)} className="flex-1 h-8 text-xs">
            <Eye className="h-3 w-3 mr-1" /> View
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(client)} className="flex-1 h-8 text-xs">
            <Edit className="h-3 w-3 mr-1" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(client._id)} className="flex-1 h-8 text-xs">
            <Trash2 className="h-3 w-3 mr-1" /> Del
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Mobile Card Component for Leads
  const LeadMobileCard = ({ lead, onView, onEdit, onDelete, onStatusChange }: any) => (
    <Card className="mb-3 rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base">{lead.name}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{lead.company}</div>
          </div>
          <Select value={lead.status} onValueChange={(value) => onStatusChange(lead._id, value)}>
            <SelectTrigger className="w-24 h-7 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new" className="text-xs">New</SelectItem>
              <SelectItem value="contacted" className="text-xs">Contacted</SelectItem>
              <SelectItem value="qualified" className="text-xs">Qualified</SelectItem>
              <SelectItem value="proposal" className="text-xs">Proposal</SelectItem>
              <SelectItem value="negotiation" className="text-xs">Negotiation</SelectItem>
              <SelectItem value="closed-won" className="text-xs">Won</SelectItem>
              <SelectItem value="closed-lost" className="text-xs">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3 text-gray-400" />
            <span className="truncate text-xs">{lead.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 text-gray-400" />
            <span className="text-xs">{lead.phone}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <span className="font-bold text-blue-600 text-sm">{lead.value}</span>
            <Badge variant="outline" className="text-xs">{lead.source}</Badge>
          </div>
          {lead.followUpDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-xs">Follow-up: {formatDate(lead.followUpDate)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={() => onView(lead)} className="flex-1 h-8 text-xs">
            <Eye className="h-3 w-3 mr-1" /> View
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(lead)} className="flex-1 h-8 text-xs">
            <Edit className="h-3 w-3 mr-1" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(lead._id)} className="flex-1 h-8 text-xs">
            <Trash2 className="h-3 w-3 mr-1" /> Del
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Mobile Card Component for Communications
  const CommMobileCard = ({ comm, onDelete }: any) => (
    <Card className="mb-3 rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">{comm.clientName.charAt(0)}</span>
              </div>
              <div>
                <div className="font-semibold text-sm">{comm.clientName}</div>
                <div className="text-xs text-gray-500">
                  {typeof comm.clientId === 'object' && comm.clientId?.company}
                </div>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-xs">
            {getCommunicationTypeIcon(comm.type)}
            {comm.type}
          </Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="text-xs">{formatDateTime(comm.date)}</span>
          </div>
          <div className="p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">{comm.notes}</p>
          </div>
          {comm.followUpRequired && (
            <div className="flex items-center gap-2">
              <Bell className="h-3 w-3 text-orange-500" />
              <span className="text-xs text-orange-600">
                Follow-up: {comm.followUpDate ? formatDate(comm.followUpDate) : 'Pending'}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="destructive" size="sm" onClick={() => onDelete(comm._id)} className="flex-1 h-8 text-xs">
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title={<span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">CRM Management</span>}
        subtitle="Manage your clients, leads, and communications"
        onMenuClick={handleMenuClick}
      />

      {mobileSidebarOpen && (
        <DashboardSidebar mobileOpen={mobileSidebarOpen} onMobileClose={handleMobileClose} />
      )}

      <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats Cards - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <Card className="border-0 shadow-lg rounded-xl bg-gradient-to-br from-white to-blue-50">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-500">Total Clients</p>
                  <p className="text-base sm:text-lg md:text-3xl font-bold text-gray-900">
                    {loading.stats ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.totalClients}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg rounded-xl bg-gradient-to-br from-white to-purple-50">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Target className="h-4 w-4 md:h-6 md:w-6 text-purple-600" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-500">Active Leads</p>
                  <p className="text-base sm:text-lg md:text-3xl font-bold text-purple-600">
                    {loading.stats ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.activeLeads}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg rounded-xl bg-gradient-to-br from-white to-green-50">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-500">Total Value</p>
                  <p className="text-xs sm:text-sm md:text-3xl font-bold text-gray-900">
                    {loading.stats ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.totalValue}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg rounded-xl bg-gradient-to-br from-white to-orange-50">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 md:h-6 md:w-6 text-orange-600" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] sm:text-xs md:text-sm font-medium text-gray-500">Communications</p>
                  <p className="text-base sm:text-lg md:text-3xl font-bold text-gray-900">
                    {loading.stats ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.communications}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Import Dialogs */}
        <Dialog open={importClientDialogOpen} onOpenChange={setImportClientDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md bg-white rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">Import Clients from Excel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 md:p-6 text-center">
                <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="hidden" id="client-excel-file" />
                <Label htmlFor="client-excel-file" className="cursor-pointer block">
                  <UploadCloud className="h-8 w-8 md:h-10 md:w-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Click to upload</p>
                  <p className="text-xs text-gray-500 mt-1">Supports .xlsx, .xls, .csv</p>
                </Label>
                {importFile && <p className="text-xs mt-2 truncate">{importFile.name}</p>}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={downloadClientTemplate} variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" /> Template
                </Button>
                <Button onClick={handleImportExcel} disabled={!importFile || importLoading} className="flex-1">
                  {importLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Import"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={importLeadDialogOpen} onOpenChange={setImportLeadDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md bg-white rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">Import Leads from Excel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 md:p-6 text-center">
                <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="hidden" id="lead-excel-file" />
                <Label htmlFor="lead-excel-file" className="cursor-pointer block">
                  <UploadCloud className="h-8 w-8 md:h-10 md:w-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Click to upload</p>
                  <p className="text-xs text-gray-500 mt-1">Supports .xlsx, .xls, .csv</p>
                </Label>
                {importFile && <p className="text-xs mt-2 truncate">{importFile.name}</p>}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={downloadLeadTemplate} variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" /> Template
                </Button>
                <Button onClick={handleImportLeadExcel} disabled={!importFile || importLoading} className="flex-1">
                  {importLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Import"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={!!viewClientDialog} onOpenChange={() => setViewClientDialog(null)}>
          <DialogContent className="max-w-2xl bg-white rounded-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Client Details</DialogTitle>
            </DialogHeader>
            {viewClientDialog && (() => {
              const client = clients.find(c => c._id === viewClientDialog);
              if (!client) return <div>Client not found</div>;
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Name</Label><div className="font-medium">{client.name}</div></div>
                    <div><Label>Company</Label><div className="font-medium">{client.company}</div></div>
                    <div><Label>Email</Label><div>{client.email}</div></div>
                    <div><Label>Phone</Label><div>{client.phone}</div></div>
                    <div><Label>Industry</Label><div>{client.industry}</div></div>
                    <div><Label>City</Label><div>{client.city}</div></div>
                    <div><Label>Value</Label><div className="font-bold text-green-600">{client.value}</div></div>
                    <div><Label>Status</Label><Badge className={client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>{client.status}</Badge></div>
                    <div className="col-span-2"><Label>Address</Label><div>{client.address || 'N/A'}</div></div>
                    <div className="col-span-2"><Label>Contact Person</Label><div>{client.contactPerson || 'N/A'}</div></div>
                  </div>
                  <Button onClick={() => setViewClientDialog(null)} className="w-full">Close</Button>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog><Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
          <DialogContent className="max-w-2xl bg-white rounded-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
            </DialogHeader>
            {editingClient && (
              <form onSubmit={handleEditClient} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Client Name *</Label>
                    <Input name="name" defaultValue={editingClient.name} required className="h-9" />
                  </div>
                  <div>
                    <Label>Company *</Label>
                    <Input name="company" defaultValue={editingClient.company} required className="h-9" />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input name="email" type="email" defaultValue={editingClient.email} required className="h-9" />
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input name="phone" defaultValue={editingClient.phone} required className="h-9" />
                  </div>
                  <div>
                    <Label>Contact Person</Label>
                    <Input name="contactPerson" defaultValue={editingClient.contactPerson || ''} className="h-9" />
                  </div>
                  <div>
                    <Label>Industry</Label>
                    <Select name="industry" defaultValue={editingClient.industry || 'MALL'}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>City</Label>
                    <Select name="city" defaultValue={editingClient.city || 'Mumbai'}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {indianCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Value *</Label>
                    <Input name="value" defaultValue={editingClient.value} required className="h-9" />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea name="address" defaultValue={editingClient.address || ''} className="min-h-[80px]" />
                </div>
                <Button type="submit" className="w-full">Update Client</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
        {/* Tabs Section */}
        <div className="space-y-4 md:space-y-6">
          <div className="border-b border-gray-200 overflow-x-auto">
            <Tabs defaultValue="clients" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="inline-flex h-10 md:h-12 items-center justify-start bg-transparent p-0 min-w-max">
                <TabsTrigger value="clients" className="px-3 md:px-6 py-2 text-xs md:text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                  <Building className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  Clients
                </TabsTrigger>
                <TabsTrigger value="leads" className="px-3 md:px-6 py-2 text-xs md:text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                  <Target className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  Leads
                </TabsTrigger>
                <TabsTrigger value="communications" className="px-3 md:px-6 py-2 text-xs md:text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600">
                  <MessageSquare className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  Comm
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Clients Tab */}
          <AnimatePresence mode="wait">
            {activeTab === "clients" && (
              <motion.div key="clients" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                  <CardHeader className="bg-white border-b px-4 md:px-6 py-3 md:py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base md:text-xl font-bold">Client List</CardTitle>
                        <p className="text-xs md:text-sm text-gray-500">Manage your valuable client relationships</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setImportClientDialogOpen(true)} className="h-8 md:h-10 text-xs">
                          <Upload className="mr-1 h-3 w-3" /> Import
                        </Button>
                        <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 md:h-10 text-xs">
                              <Plus className="mr-1 h-3 w-3" /> Add
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-2xl bg-white rounded-xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-base md:text-lg">Add New Client</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddClient} className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><Label className="text-sm">Client Name *</Label><Input name="name" required className="h-9 text-sm" /></div>
                                <div><Label className="text-sm">Company *</Label><Input name="company" required className="h-9 text-sm" /></div>
                                <div><Label className="text-sm">Email *</Label><Input name="email" type="email" required className="h-9 text-sm" /></div>
                                <div><Label className="text-sm">Phone *</Label><Input name="phone" required className="h-9 text-sm" /></div>
                                <div><Label className="text-sm">Contact Person</Label><Input name="contactPerson" className="h-9 text-sm" /></div>
                                <div><Label className="text-sm">Industry</Label><Select name="industry" defaultValue="MALL"><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></div>
                                <div><Label className="text-sm">City</Label><Select name="city" defaultValue="Mumbai"><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{indianCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                                <div><Label className="text-sm">Value *</Label><Input name="value" placeholder="₹50,00,000" required className="h-9 text-sm" /></div>
                              </div>
                              <div><Label className="text-sm">Address</Label><Textarea name="address" className="min-h-[80px] text-sm" /></div>
                              <Button type="submit" className="w-full h-9 text-sm">Add Client</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="relative mt-3">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                      <Input placeholder="Search clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-7 h-9 text-sm" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading.clients ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
                    ) : clients.length === 0 ? (
                      <div className="text-center py-8"><Users className="h-12 w-12 mx-auto text-gray-400 mb-3" /><h3 className="font-semibold">No clients found</h3></div>
                    ) : (
                      <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                          <Table>
                            <TableHeader><TableRow className="bg-gray-50"><TableHead className="py-3 text-xs">Client</TableHead><TableHead className="py-3 text-xs">Company</TableHead><TableHead className="py-3 text-xs hidden lg:table-cell">Contact</TableHead><TableHead className="py-3 text-xs hidden xl:table-cell">Industry</TableHead><TableHead className="py-3 text-xs">Value</TableHead><TableHead className="py-3 text-xs">Status</TableHead><TableHead className="py-3 text-xs text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {clients.map(client => (
                                <TableRow key={client._id} className="hover:bg-blue-50/50">
                                  <TableCell className="py-3"><div className="font-medium text-sm">{client.name}</div><div className="text-xs text-gray-500">{client.city}</div></TableCell>
                                  <TableCell className="py-3"><div className="flex items-center gap-1 text-sm"><Building className="h-3 w-3 text-gray-400" />{client.company}</div></TableCell>
                                  <TableCell className="py-3 hidden lg:table-cell"><div className="text-xs text-gray-600">{client.email}</div><div className="text-xs text-gray-600">{client.phone}</div></TableCell>
                                  <TableCell className="py-3 hidden xl:table-cell"><Badge variant="outline" className="text-xs">{client.industry}</Badge></TableCell>
                                  <TableCell className="py-3"><span className="font-bold text-green-600 text-sm">{client.value}</span></TableCell>
                                  <TableCell className="py-3"><Badge className={client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>{client.status}</Badge></TableCell>
                                  <TableCell className="py-3 text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => setViewClientDialog(client._id)} className="h-7 w-7"><Eye className="h-3 w-3" /></Button><Button variant="ghost" size="icon" onClick={() => setEditingClient(client)} className="h-7 w-7"><Edit className="h-3 w-3" /></Button><Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client._id)} className="h-7 w-7 text-red-500"><Trash2 className="h-3 w-3" /></Button></div></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        {/* Mobile Cards */}
                        <div className="md:hidden p-4">
                          {clients.map(client => <ClientMobileCard key={client._id} client={client} onView={setViewClientDialog} onEdit={setEditingClient} onDelete={handleDeleteClient} />)}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Leads Tab */}
          <AnimatePresence mode="wait">
            {activeTab === "leads" && (
              <motion.div key="leads" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                  <CardHeader className="bg-white border-b px-4 md:px-6 py-3 md:py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div><CardTitle className="text-base md:text-xl font-bold">Lead Tracker</CardTitle><p className="text-xs md:text-sm text-gray-500">Track and convert potential opportunities</p></div>
                      <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setImportLeadDialogOpen(true)} className="h-8 md:h-10 text-xs"><Upload className="mr-1 h-3 w-3" /> Import</Button>
                        <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}><DialogTrigger asChild><Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 md:h-10 text-xs"><Plus className="mr-1 h-3 w-3" /> Add</Button></DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-2xl bg-white rounded-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add New Lead</DialogTitle></DialogHeader>
                            <form onSubmit={handleAddLead} className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>Lead Name *</Label><Input name="name" required className="h-9 text-sm" /></div><div><Label>Company *</Label><Input name="company" required className="h-9 text-sm" /></div><div><Label>Email *</Label><Input name="email" type="email" required className="h-9 text-sm" /></div><div><Label>Phone *</Label><Input name="phone" required className="h-9 text-sm" /></div><div><Label>Source *</Label><Select name="source" required><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{leadSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div><div><Label>Value *</Label><Input name="value" placeholder="₹30,00,000" required className="h-9 text-sm" /></div><div><Label>Assign To *</Label><Input name="assignedTo" required className="h-9 text-sm" /></div><div><Label>Follow-up Date</Label><Input name="followUpDate" type="date" className="h-9 text-sm" /></div></div><div><Label>Notes</Label><Textarea name="notes" className="min-h-[80px] text-sm" /></div><Button type="submit" className="w-full h-9 text-sm">Add Lead</Button></form></DialogContent></Dialog></div></div>
                    <div className="relative mt-3"><Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" /><Input placeholder="Search leads..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-7 h-9 text-sm" /></div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading.leads ? (<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>) : leads.length === 0 ? (<div className="text-center py-8"><Target className="h-12 w-12 mx-auto text-gray-400 mb-3" /><h3 className="font-semibold">No leads found</h3></div>) : (
                      <>
                        <div className="hidden md:block overflow-x-auto">
                          <Table><TableHeader><TableRow className="bg-gray-50"><TableHead className="py-3 text-xs">Lead</TableHead><TableHead className="py-3 text-xs">Company</TableHead><TableHead className="py-3 text-xs hidden lg:table-cell">Contact</TableHead><TableHead className="py-3 text-xs hidden xl:table-cell">Source</TableHead><TableHead className="py-3 text-xs">Status</TableHead><TableHead className="py-3 text-xs">Value</TableHead><TableHead className="py-3 text-xs text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>{leads.map(lead => (<TableRow key={lead._id} className="hover:bg-blue-50/50"><TableCell className="py-3"><div className="font-medium text-sm">{lead.name}</div><div className="text-xs text-gray-500">Added {formatDate(lead.createdAt)}</div></TableCell><TableCell className="py-3"><div className="flex items-center gap-1 text-sm"><Building className="h-3 w-3 text-gray-400" />{lead.company}</div></TableCell><TableCell className="py-3 hidden lg:table-cell"><div className="text-xs text-gray-600">{lead.email}</div><div className="text-xs text-gray-600">{lead.phone}</div></TableCell><TableCell className="py-3 hidden xl:table-cell"><Badge variant="outline" className="text-xs">{lead.source}</Badge></TableCell><TableCell className="py-3"><Select value={lead.status} onValueChange={(v) => handleLeadStatusChange(lead._id, v as any)}><SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="contacted">Contacted</SelectItem><SelectItem value="qualified">Qualified</SelectItem><SelectItem value="proposal">Proposal</SelectItem><SelectItem value="negotiation">Negotiation</SelectItem><SelectItem value="closed-won">Won</SelectItem><SelectItem value="closed-lost">Lost</SelectItem></SelectContent></Select></TableCell><TableCell className="py-3"><span className="font-bold text-blue-600 text-sm">{lead.value}</span></TableCell><TableCell className="py-3 text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => setViewLeadDialog(lead._id)} className="h-7 w-7"><Eye className="h-3 w-3" /></Button><Button variant="ghost" size="icon" onClick={() => setEditingLead(lead)} className="h-7 w-7"><Edit className="h-3 w-3" /></Button><Button variant="ghost" size="icon" onClick={() => handleDeleteLead(lead._id)} className="h-7 w-7 text-red-500"><Trash2 className="h-3 w-3" /></Button></div></TableCell></TableRow>))}</TableBody>
                          </Table>
                        </div>
                        <div className="md:hidden p-4">{leads.map(lead => <LeadMobileCard key={lead._id} lead={lead} onView={setViewLeadDialog} onEdit={setEditingLead} onDelete={handleDeleteLead} onStatusChange={handleLeadStatusChange} />)}</div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Communications Tab */}
          <AnimatePresence mode="wait">
            {activeTab === "communications" && (
              <motion.div key="communications" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
                  <CardHeader className="bg-white border-b px-4 md:px-6 py-3 md:py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div><CardTitle className="text-base md:text-xl font-bold">Communication Logs</CardTitle><p className="text-xs md:text-sm text-gray-500">Track all client interactions</p></div>
                      <Dialog open={commDialogOpen} onOpenChange={setCommDialogOpen}><DialogTrigger asChild><Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 md:h-10 text-xs"><Plus className="mr-1 h-3 w-3" /> Log</Button></DialogTrigger>
                        <DialogContent className="max-w-[95vw] sm:max-w-2xl bg-white rounded-xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
                          <form onSubmit={handleAddCommunication} className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><Label>Client Name *</Label><Select name="clientName" required><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c._id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Type *</Label><Select name="type" required><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{communicationTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div><div><Label>Date *</Label><Input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="h-9 text-sm" /></div><div><Label>Client ID</Label><Select name="clientId"><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent>{clients.map(c => <SelectItem key={c._id} value={c._id}>{c._id.slice(-6)}</SelectItem>)}</SelectContent></Select></div></div><div><Label>Notes *</Label><Textarea name="notes" required className="min-h-[80px] text-sm" /></div><div className="flex items-center gap-2"><input type="checkbox" id="followUpRequired" name="followUpRequired" className="rounded" /><Label htmlFor="followUpRequired" className="text-sm">Follow-up Required</Label></div><div><Label>Follow-up Date</Label><Input name="followUpDate" type="date" className="h-9 text-sm" /></div><Button type="submit" className="w-full h-9 text-sm">Log Communication</Button></form></DialogContent></Dialog></div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading.communications ? (<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>) : communications.length === 0 ? (<div className="text-center py-8"><MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-3" /><h3 className="font-semibold">No communications found</h3></div>) : (
                      <>
                        <div className="hidden md:block overflow-x-auto">
                          <Table><TableHeader><TableRow className="bg-gray-50"><TableHead className="py-3 text-xs">Client</TableHead><TableHead className="py-3 text-xs">Type</TableHead><TableHead className="py-3 text-xs hidden lg:table-cell">Date</TableHead><TableHead className="py-3 text-xs">Notes</TableHead><TableHead className="py-3 text-xs hidden xl:table-cell">Follow-up</TableHead><TableHead className="py-3 text-xs text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>{communications.map(comm => (<TableRow key={comm._id} className="hover:bg-blue-50/50"><TableCell className="py-3"><div className="font-medium text-sm">{comm.clientName}</div></TableCell><TableCell className="py-3"><Badge variant="outline" className="gap-1 text-xs">{getCommunicationTypeIcon(comm.type)}{comm.type}</Badge></TableCell><TableCell className="py-3 hidden lg:table-cell"><span className="text-xs">{formatDateTime(comm.date)}</span></TableCell><TableCell className="py-3 max-w-[200px]"><div className="truncate text-xs" title={comm.notes}>{comm.notes}</div></TableCell><TableCell className="py-3 hidden xl:table-cell">{comm.followUpRequired ? <span className="text-xs text-orange-600">{comm.followUpDate ? formatDate(comm.followUpDate) : 'Pending'}</span> : <span className="text-xs text-gray-400">No</span>}</TableCell><TableCell className="py-3 text-right"><Button variant="ghost" size="icon" onClick={() => handleDeleteCommunication(comm._id)} className="h-7 w-7 text-red-500"><Trash2 className="h-3 w-3" /></Button></TableCell></TableRow>))}</TableBody>
                          </Table>
                        </div>
                        <div className="md:hidden p-4">{communications.map(comm => <CommMobileCard key={comm._id} comm={comm} onDelete={handleDeleteCommunication} />)}</div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CRM;