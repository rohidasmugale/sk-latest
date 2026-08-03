import React, { useState, useEffect } from 'react';
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { DashboardSidebar } from "@/components/shared/DashboardSidebar";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Plus,
    Search,
    Package,
    UserCheck,
    AlertTriangle,
    Eye,
    Trash2,
    Download,
    Edit,
    History,
    Building,
    Shield,
    Wrench,
    Printer,
    Palette,
    ShoppingBag,
    Coffee,
    MapPin,
    RefreshCw,
    Cpu,
    Calendar,
    CheckCircle,
    XCircle,
    Loader2,
    ArrowLeft,
    DollarSign,
    Tag,ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inventoryService, type FrontendInventoryItem } from '@/services/inventoryService';
import { machineService, type FrontendMachine } from '@/services/machineService';
import { siteService, Site as ServiceSite } from "@/services/SiteService";

// Types
interface Department {
    value: string;
    label: string;
    icon: React.ComponentType<any>;
}

type InventoryItem = FrontendInventoryItem;
type Machine = FrontendMachine;

// Mobile Stat Card Component
const MobileStatCard = ({ title, value, icon: Icon, color = "primary", loading }: any) => {
    const colorClasses: Record<string, string> = {
        primary: "text-blue-600 bg-blue-100",
        warning: "text-amber-600 bg-amber-100",
        success: "text-green-600 bg-green-100",
        purple: "text-purple-600 bg-purple-100"
    };

    return (
        <Card className="border-0 shadow-sm rounded-lg">
            <CardContent className="p-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground">{title}</p>
                        <p className="text-lg font-bold">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : value}
                        </p>
                    </div>
                    <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const InventoryPage = () => {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Main state
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [realSites, setRealSites] = useState<ServiceSite[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState("sites");

    // Site detail state
    const [showSiteDetails, setShowSiteDetails] = useState(false);
    const [selectedSiteForDetails, setSelectedSiteForDetails] = useState<ServiceSite | null>(null);

    // Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("all");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedSite, setSelectedSite] = useState("all");

    // Dialog states
    const [itemDialogOpen, setItemDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState<InventoryItem | null>(null);
    const [changeHistoryDialogOpen, setChangeHistoryDialogOpen] = useState<string | null>(null);

    // New item form
    const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
        name: "",
        sku: "",
        department: "cleaning",
        category: "",
        site: "",
        assignedManager: "",
        quantity: 0,
        price: 0,
        costPrice: 0,
        supplier: "",
        reorderLevel: 10,
        description: "",
    });

    // New machine form
    const [newMachine, setNewMachine] = useState<Partial<Machine>>({
        name: "",
        cost: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: 1,
        description: "",
        status: 'operational',
        location: "",
        manufacturer: "",
        model: "",
        serialNumber: "",
        department: "",
        assignedTo: "",
    });
    const [machineDialogOpen, setMachineDialogOpen] = useState(false);
    const [editMachine, setEditMachine] = useState<Machine | null>(null);
    const [machineSearchQuery, setMachineSearchQuery] = useState("");
    const [viewMachine, setViewMachine] = useState<Machine | null>(null);
    const [viewMachineDialogOpen, setViewMachineDialogOpen] = useState(false);

    // Managers for dropdown
    const managers = [
        "John Doe", "Jane Smith", "Robert Johnson", "Maria Garcia",
        "David Brown", "Sarah Wilson", "Michael Taylor", "Emily Davis"
    ];

    const machineStatusOptions = [
        { value: 'operational', label: 'Operational', color: 'bg-green-100 text-green-800' },
        { value: 'maintenance', label: 'Under Maintenance', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'out-of-service', label: 'Out of Service', color: 'bg-red-100 text-red-800' },
    ];

    const departments: Department[] = [
        { value: "cleaning", label: "Cleaning", icon: Shield },
        { value: "maintenance", label: "Maintenance", icon: Wrench },
        { value: "office", label: "Office Supplies", icon: Printer },
        { value: "paint", label: "Paint", icon: Palette },
        { value: "tools", label: "Tools", icon: ShoppingBag },
        { value: "canteen", label: "Canteen", icon: Coffee },
    ];

    const categories = {
        cleaning: ["Tools", "Chemicals", "Equipment", "Supplies"],
        maintenance: ["Tools", "Safety", "Equipment", "Parts"],
        office: ["Furniture", "Stationery", "Electronics", "Supplies"],
        paint: ["Paints", "Brushes", "Rollers", "Accessories"],
        tools: ["Power Tools", "Hand Tools", "Safety Gear", "Consumables"],
        canteen: ["Food Items", "Beverages", "Utensils", "Cleaning"],
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const calculateStats = (itemsList: InventoryItem[]) => ({
        totalItems: itemsList.length,
        lowStockItems: itemsList.filter(item => item.quantity <= item.reorderLevel).length,
        totalValue: itemsList.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0),
    });

    const stats = calculateStats(items);

    const handleMenuClick = () => setMobileSidebarOpen(!mobileSidebarOpen);
    const handleMobileClose = () => setMobileSidebarOpen(false);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [itemsData, machinesData, sitesData] = await Promise.all([
                    inventoryService.getItems(),
                    machineService.getMachines(),
                    siteService.getAllSites()
                ]);
                setItems(itemsData || []);
                setMachines(machinesData || []);
                setRealSites(sitesData || []);
            } catch (error) {
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Restore from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('siteDetails') === 'true' && realSites.length > 0) {
            const site = realSites.find(s => s._id === params.get('selectedSiteId'));
            if (site) {
                setSelectedSiteForDetails(site);
                setShowSiteDetails(true);
            }
        }
    }, [realSites]);

    const handleViewSiteDetails = (site: ServiceSite) => {
        setSelectedSiteForDetails(site);
        setShowSiteDetails(true);
        const params = new URLSearchParams(window.location.search);
        params.set('siteDetails', 'true');
        params.set('selectedSiteId', site._id);
        window.history.replaceState(null, '', `?${params.toString()}`);
    };

    const handleBackFromSiteDetails = () => {
        setShowSiteDetails(false);
        setSelectedSiteForDetails(null);
        window.history.replaceState(null, '', window.location.pathname);
    };

    const getDepartmentIcon = (department: string) => {
        return departments.find(d => d.value === department)?.icon || Package;
    };

    const getCategoriesForDepartment = (dept: string) => categories[dept as keyof typeof categories] || [];

    // Filter items
    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDepartment === "all" || item.department === selectedDepartment;
        const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
        const matchesSite = selectedSite === "all" || item.site === selectedSite || item.siteName === selectedSite;
        return matchesSearch && matchesDept && matchesCategory && matchesSite;
    });

    const filteredMachines = machines.filter(machine =>
        machine.name.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
        machine.manufacturer?.toLowerCase().includes(machineSearchQuery.toLowerCase()) ||
        machine.model?.toLowerCase().includes(machineSearchQuery.toLowerCase())
    );

    // CRUD operations
    const handleAddItem = async () => {
        if (!newItem.name || !newItem.sku) {
            toast.error("Please fill required fields");
            return;
        }

        if (!newItem.site) {
            toast.error("Please select a site");
            return;
        }

        try {
            const itemData = {
                sku: newItem.sku.toUpperCase(),
                name: newItem.name,
                department: newItem.department || "cleaning",
                category: newItem.category || "Tools",
                site: newItem.site,
                assignedManager: newItem.assignedManager || "John Doe",
                quantity: newItem.quantity || 0,
                price: newItem.price || 0,
                costPrice: newItem.costPrice || 0,
                supplier: newItem.supplier || "",
                reorderLevel: newItem.reorderLevel || 10,
                description: newItem.description,
                changeHistory: [{
                    date: new Date().toISOString().split('T')[0],
                    change: "Created",
                    user: "Supervisor",
                    quantity: newItem.quantity || 0
                }]
            };

            const createdItem = await inventoryService.createItem(itemData);
            setItems([...items, createdItem]);
            setItemDialogOpen(false);
            resetNewItemForm();
            toast.success("Item added!");
        } catch (error) {
            toast.error("Failed to add item");
        }
    };

    const handleEditItem = async () => {
        if (!editItem) return;

        try {
            const updateData = {
                name: editItem.name,
                sku: editItem.sku,
                department: editItem.department,
                category: editItem.category,
                site: editItem.site,
                assignedManager: editItem.assignedManager,
                quantity: editItem.quantity,
                price: editItem.price,
                costPrice: editItem.costPrice,
                supplier: editItem.supplier,
                reorderLevel: editItem.reorderLevel,
                description: editItem.description,
            };

            const updatedItem = await inventoryService.updateItem(editItem.id, updateData);
            setItems(items.map(item => item.id === updatedItem.id ? updatedItem : item));
            setEditItem(null);
            setItemDialogOpen(false);
            toast.success("Item updated!");
        } catch (error) {
            toast.error("Failed to update item");
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
        try {
            await inventoryService.deleteItem(itemId);
            setItems(items.filter(item => item.id !== itemId));
            toast.success("Item deleted!");
        } catch (error) {
            toast.error("Failed to delete item");
        }
    };

    const resetNewItemForm = () => {
        setNewItem({
            name: "",
            sku: "",
            department: "cleaning",
            category: "",
            site: "",
            assignedManager: "",
            quantity: 0,
            price: 0,
            costPrice: 0,
            supplier: "",
            reorderLevel: 10,
            description: "",
        });
    };

    const resetNewMachineForm = () => {
        setNewMachine({
            name: "",
            cost: 0,
            purchaseDate: new Date().toISOString().split('T')[0],
            quantity: 1,
            description: "",
            status: 'operational',
            location: "",
            manufacturer: "",
            model: "",
            serialNumber: "",
            department: "",
            assignedTo: "",
        });
    };

    const handleAddMachine = async () => {
        if (!newMachine.name || !newMachine.cost) {
            toast.error("Please fill required fields");
            return;
        }

        try {
            const machineData = {
                name: newMachine.name,
                cost: newMachine.cost,
                purchaseDate: newMachine.purchaseDate,
                quantity: newMachine.quantity || 1,
                description: newMachine.description,
                status: newMachine.status || 'operational',
                location: newMachine.location,
                manufacturer: newMachine.manufacturer,
                model: newMachine.model,
                serialNumber: newMachine.serialNumber,
                department: newMachine.department,
                assignedTo: newMachine.assignedTo,
            };

            if (editMachine) {
                const updatedMachine = await machineService.updateMachine(editMachine.id, machineData);
                setMachines(machines.map(m => m.id === editMachine.id ? updatedMachine : m));
                toast.success("Machine updated!");
            } else {
                const createdMachine = await machineService.createMachine(machineData);
                setMachines([...machines, createdMachine]);
                toast.success("Machine added!");
            }

            setMachineDialogOpen(false);
            resetNewMachineForm();
            setEditMachine(null);
        } catch (error) {
            toast.error("Failed to save machine");
        }
    };

    const handleDeleteMachine = async (machineId: string) => {
        if (!confirm("Are you sure you want to delete this machine?")) return;
        try {
            await machineService.deleteMachine(machineId);
            setMachines(machines.filter(m => m.id !== machineId));
            toast.success("Machine deleted!");
        } catch (error) {
            toast.error("Failed to delete machine");
        }
    };

    const handleViewMachine = async (machineId: string) => {
        try {
            const machine = await machineService.getMachineById(machineId);
            setViewMachine(machine);
            setViewMachineDialogOpen(true);
        } catch (error) {
            toast.error("Failed to fetch machine details");
        }
    };

    const refreshData = async () => {
        setRefreshing(true);
        try {
            const [itemsData, machinesData, sitesData] = await Promise.all([
                inventoryService.getItems(),
                machineService.getMachines(),
                siteService.getAllSites()
            ]);
            setItems(itemsData || []);
            setMachines(machinesData || []);
            setRealSites(sitesData || []);
            toast.success("Data refreshed!");
        } catch (error) {
            toast.error("Failed to refresh data");
        } finally {
            setRefreshing(false);
        }
    };

    // Calculate machine age
    const calculateMachineAge = (purchaseDate: string) => {
        const purchase = new Date(purchaseDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - purchase.getTime());
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
        return Math.floor(diffYears);
    };

    // ============ SITE DETAIL VIEW ============
    if (showSiteDetails && selectedSiteForDetails) {
        const site = selectedSiteForDetails;
        const siteItems = items.filter(i => i.site === site.name || i.siteName === site.name);
        const siteMachines = machines.filter(m => m.location === site.name);
        const lowStock = siteItems.filter(i => i.quantity <= i.reorderLevel).length;
        const totalValue = siteItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

        return (
            <div className="min-h-screen bg-gray-50 p-4 md:p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Button variant="outline" size="sm" onClick={handleBackFromSiteDetails}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sites
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">{site.name} — Inventory Details</h1>
                        <p className="text-xs text-muted-foreground">
                            {siteItems.length} items • {siteMachines.length} machines • {lowStock} low stock
                        </p>
                    </div>
                    <Button size="sm" className="ml-auto" onClick={() => { setEditItem(null); setItemDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Item
                    </Button>
                </div>

                <div className="grid grid-cols-4 gap-3 mb-4">
                    <Card>
                        <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold text-blue-600">{siteItems.length}</p>
                            <p className="text-xs text-muted-foreground">Total Items</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold text-amber-600">{lowStock}</p>
                            <p className="text-xs text-muted-foreground">Low Stock</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
                            <p className="text-xs text-muted-foreground">Total Value</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="p-3 text-center">
                            <p className="text-2xl font-bold text-purple-600">{siteMachines.length}</p>
                            <p className="text-xs text-muted-foreground">Machines</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="items">
                    <TabsList className="mb-4">
                        <TabsTrigger value="items">Items ({siteItems.length})</TabsTrigger>
                        <TabsTrigger value="machines">Machines ({siteMachines.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="items">
                        <Card>
                            <CardContent className="p-0">
                                {siteItems.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No items at this site</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>SKU</TableHead>
                                                    <TableHead>Department</TableHead>
                                                    <TableHead>Quantity</TableHead>
                                                    <TableHead>Value</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {siteItems.map((item) => {
                                                    const isLowStock = item.quantity <= item.reorderLevel;
                                                    const DeptIcon = getDepartmentIcon(item.department);
                                                    return (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="font-medium">{item.name}</TableCell>
                                                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1">
                                                                    <DeptIcon className="h-3 w-3" />
                                                                    {departments.find(d => d.value === item.department)?.label}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className={isLowStock ? 'text-amber-600 font-bold' : ''}>
                                                                    {item.quantity}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>{formatCurrency(item.quantity * item.costPrice)}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={isLowStock ? 'destructive' : 'default'}>
                                                                    {isLowStock ? 'Low Stock' : 'In Stock'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button variant="ghost" size="sm" onClick={() => { setEditItem(item); setItemDialogOpen(true); }}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)}>
                                                                        <Trash2 className="h-4 w-4 text-red-500" />
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
                    </TabsContent>

                    <TabsContent value="machines">
                        <Card>
                            <CardContent className="p-0">
                                {siteMachines.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No machines at this site</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Machine</TableHead>
                                                    <TableHead>Model</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Cost</TableHead>
                                                    <TableHead>Location</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {siteMachines.map((machine) => {
                                                    const statusOption = machineStatusOptions.find(s => s.value === machine.status);
                                                    return (
                                                        <TableRow key={machine.id}>
                                                            <TableCell className="font-medium">{machine.name}</TableCell>
                                                            <TableCell>{machine.model || '-'}</TableCell>
                                                            <TableCell>
                                                                <Badge className={statusOption?.color}>
                                                                    {statusOption?.label}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{formatCurrency(machine.cost)}</TableCell>
                                                            <TableCell>{machine.location || '-'}</TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button variant="ghost" size="sm" onClick={() => handleViewMachine(machine.id)}>
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteMachine(machine.id)}>
                                                                        <Trash2 className="h-4 w-4 text-red-500" />
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
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

    // ============ MAIN VIEW ============
    return (
        <div className="min-h-screen bg-gray-50">
            <DashboardHeader
                title="Inventory Management"
                subtitle="Manage inventory, machinery, and equipment across sites"
                onMenuClick={handleMenuClick}
            />

            {mobileSidebarOpen && (
                <DashboardSidebar mobileOpen={mobileSidebarOpen} onMobileClose={handleMobileClose} />
            )}

            <div className="p-4 md:p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-3">
                    <Card>
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.totalItems}</p>
                                <p className="text-xs text-muted-foreground">Total Items</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-amber-50/50">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.lowStockItems}</p>
                                <p className="text-xs text-muted-foreground">Low Stock</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-green-50/50">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
                                <p className="text-xs text-muted-foreground">Total Value</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-purple-50/50">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Cpu className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{machines.length}</p>
                                <p className="text-xs text-muted-foreground">Machines</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="sites" onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="sites">
                            <Building className="mr-2 h-4 w-4" />
                            Sites ({realSites.length})
                        </TabsTrigger>
                        <TabsTrigger value="inventory">
                            <Package className="mr-2 h-4 w-4" />
                            Inventory ({items.length})
                        </TabsTrigger>
                        <TabsTrigger value="machines">
                            <Cpu className="mr-2 h-4 w-4" />
                            Machines ({machines.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* ============ SITES TAB ============ */}
                    <TabsContent value="sites">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sites Overview</CardTitle>
                                <CardDescription>Click a site to view its inventory & machines</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                    </div>
                                ) : realSites.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Building className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                        <p className="text-muted-foreground">No sites found</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {realSites.map(site => {
                                            const siteItems = items.filter(i => i.site === site.name || i.siteName === site.name);
                                            const siteMachines = machines.filter(m => m.location === site.name);
                                            const lowStock = siteItems.filter(i => i.quantity <= i.reorderLevel).length;
                                            const totalValue = siteItems.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);

                                            return (
                                                <Card
                                                    key={site._id}
                                                    className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-400 group"
                                                    onClick={() => handleViewSiteDetails(site)}
                                                >
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                                                                <Building className="h-4 w-4 text-blue-600" />
                                                            </div>
                                                            <h3 className="font-semibold text-sm truncate">{site.name}</h3>
                                                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 ml-auto" />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                                            <div className="bg-blue-50 rounded-lg p-2">
                                                                <p className="font-bold text-blue-600 text-lg">{siteItems.length}</p>
                                                                <p className="text-muted-foreground">Items</p>
                                                            </div>
                                                            <div className="bg-amber-50 rounded-lg p-2">
                                                                <p className="font-bold text-amber-600 text-lg">{lowStock}</p>
                                                                <p className="text-muted-foreground">Low Stock</p>
                                                            </div>
                                                            <div className="bg-purple-50 rounded-lg p-2">
                                                                <p className="font-bold text-purple-600 text-lg">{siteMachines.length}</p>
                                                                <p className="text-muted-foreground">Machines</p>
                                                            </div>
                                                            <div className="bg-green-50 rounded-lg p-2">
                                                                <p className="font-bold text-green-600 text-lg">{formatCurrency(totalValue)}</p>
                                                                <p className="text-muted-foreground">Total Value</p>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ============ INVENTORY TAB ============ */}
                    <TabsContent value="inventory">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Inventory Items</CardTitle>
                                        <CardDescription>Manage all inventory items across departments</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={refreshData} disabled={refreshing}>
                                            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                                            Refresh
                                        </Button>
                                        <Button onClick={() => { setEditItem(null); resetNewItemForm(); setItemDialogOpen(true); }}>
                                            <Plus className="h-4 w-4 mr-1" /> Add Item
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Filters */}
                                <div className="flex flex-wrap gap-3 mb-4">
                                    <div className="flex-1 min-w-[200px]">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Search items..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>
                                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="All Departments" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Departments</SelectItem>
                                            {departments.map(dept => (
                                                <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            {selectedDepartment !== "all" && getCategoriesForDepartment(selectedDepartment).map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={selectedSite} onValueChange={setSelectedSite}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="All Sites" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Sites</SelectItem>
                                            {realSites.map(site => (
                                                <SelectItem key={site._id} value={site.name}>{site.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                    </div>
                                ) : filteredItems.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                        <p className="text-muted-foreground">No items found</p>
                                        <p className="text-sm text-muted-foreground">Add your first item or adjust your filters</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Item</TableHead>
                                                    <TableHead>SKU</TableHead>
                                                    <TableHead>Department</TableHead>
                                                    <TableHead>Site</TableHead>
                                                    <TableHead>Quantity</TableHead>
                                                    <TableHead>Value</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredItems.map((item) => {
                                                    const isLowStock = item.quantity <= item.reorderLevel;
                                                    const DeptIcon = getDepartmentIcon(item.department);
                                                    return (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="font-medium">{item.name}</TableCell>
                                                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1">
                                                                    <DeptIcon className="h-3 w-3" />
                                                                    {departments.find(d => d.value === item.department)?.label}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{item.site}</TableCell>
                                                            <TableCell>
                                                                <span className={isLowStock ? 'text-amber-600 font-bold' : ''}>
                                                                    {item.quantity}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>{formatCurrency(item.quantity * item.costPrice)}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={isLowStock ? 'destructive' : 'default'}>
                                                                    {isLowStock ? 'Low Stock' : 'In Stock'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button variant="ghost" size="sm" onClick={() => { setEditItem(item); setItemDialogOpen(true); }}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => setChangeHistoryDialogOpen(item.id)}>
                                                                        <History className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)}>
                                                                        <Trash2 className="h-4 w-4 text-red-500" />
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
                    </TabsContent>

                    {/* ============ MACHINES TAB ============ */}
                    <TabsContent value="machines">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Machinery & Equipment</CardTitle>
                                        <CardDescription>Manage all machinery and equipment across sites</CardDescription>
                                    </div>
                                    <Button onClick={() => { setEditMachine(null); resetNewMachineForm(); setMachineDialogOpen(true); }}>
                                        <Plus className="h-4 w-4 mr-1" /> Add Machine
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="mb-4">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search machines..."
                                            value={machineSearchQuery}
                                            onChange={(e) => setMachineSearchQuery(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                    </div>
                                ) : filteredMachines.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Cpu className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                        <p className="text-muted-foreground">No machines found</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Machine</TableHead>
                                                    <TableHead>Model</TableHead>
                                                    <TableHead>Location</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Cost</TableHead>
                                                    <TableHead>Purchase Date</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredMachines.map((machine) => {
                                                    const statusOption = machineStatusOptions.find(s => s.value === machine.status);
                                                    const machineAge = calculateMachineAge(machine.purchaseDate);
                                                    return (
                                                        <TableRow key={machine.id}>
                                                            <TableCell className="font-medium">{machine.name}</TableCell>
                                                            <TableCell>{machine.model || '-'}</TableCell>
                                                            <TableCell>{machine.location || '-'}</TableCell>
                                                            <TableCell>
                                                                <Badge className={statusOption?.color}>
                                                                    {statusOption?.label}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{formatCurrency(machine.cost)}</TableCell>
                                                            <TableCell>
                                                                <div>{formatDate(machine.purchaseDate)}</div>
                                                                <div className="text-xs text-muted-foreground">Age: {machineAge} years</div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Button variant="ghost" size="sm" onClick={() => handleViewMachine(machine.id)}>
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => { setEditMachine(machine); setMachineDialogOpen(true); }}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteMachine(machine.id)}>
                                                                        <Trash2 className="h-4 w-4 text-red-500" />
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
                    </TabsContent>
                </Tabs>

                {/* ============ ADD/EDIT ITEM DIALOG ============ */}
                <Dialog open={itemDialogOpen} onOpenChange={(open) => {
                    setItemDialogOpen(open);
                    if (!open) { setEditItem(null); resetNewItemForm(); }
                }}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Item Name *</Label>
                                <Input
                                    value={editItem ? editItem.name : newItem.name}
                                    onChange={(e) => editItem ? setEditItem({ ...editItem, name: e.target.value }) : setNewItem({ ...newItem, name: e.target.value })}
                                    placeholder="Enter item name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>SKU *</Label>
                                <Input
                                    value={editItem ? editItem.sku : newItem.sku}
                                    onChange={(e) => editItem ? setEditItem({ ...editItem, sku: e.target.value.toUpperCase() }) : setNewItem({ ...newItem, sku: e.target.value.toUpperCase() })}
                                    placeholder="Enter SKU"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Department *</Label>
                                <Select
                                    value={editItem ? editItem.department : newItem.department}
                                    onValueChange={(value) => editItem ? setEditItem({ ...editItem, department: value, category: '' }) : setNewItem({ ...newItem, department: value, category: '' })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                                    <SelectContent>
                                        {departments.map(dept => (
                                            <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Category *</Label>
                                <Select
                                    value={editItem ? editItem.category : newItem.category}
                                    onValueChange={(value) => editItem ? setEditItem({ ...editItem, category: value }) : setNewItem({ ...newItem, category: value })}
                                    disabled={!editItem?.department && !newItem.department}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                    <SelectContent>
                                        {(editItem ? getCategoriesForDepartment(editItem.department) : getCategoriesForDepartment(newItem.department || '')).map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* ✅ SITE SELECTION DROPDOWN - ADD THIS */}
                            <div className="space-y-2">
                                <Label>Site *</Label>
                                <Select
                                    value={editItem ? editItem.site : newItem.site || ""}
                                    onValueChange={(value) => editItem ? setEditItem({ ...editItem, site: value }) : setNewItem({ ...newItem, site: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select site" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {realSites.map(site => (
                                            <SelectItem key={site._id} value={site.name}>
                                                <div className="flex items-center gap-2">
                                                    <Building className="h-4 w-4" />
                                                    {site.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!editItem && !newItem.site && (
                                    <p className="text-xs text-amber-600">Please select a site for this item</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Assigned Manager</Label>
                                <Select
                                    value={editItem ? editItem.assignedManager : newItem.assignedManager}
                                    onValueChange={(value) => editItem ? setEditItem({ ...editItem, assignedManager: value }) : setNewItem({ ...newItem, assignedManager: value })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                                    <SelectContent>
                                        {managers.map(manager => (
                                            <SelectItem key={manager} value={manager}>{manager}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Quantity *</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={editItem ? editItem.quantity : newItem.quantity}
                                    onChange={(e) => editItem ? setEditItem({ ...editItem, quantity: parseInt(e.target.value) || 0 }) : setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                                    placeholder="Enter quantity"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Reorder Level *</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={editItem ? editItem.reorderLevel : newItem.reorderLevel}
                                    onChange={(e) => editItem ? setEditItem({ ...editItem, reorderLevel: parseInt(e.target.value) || 0 }) : setNewItem({ ...newItem, reorderLevel: parseInt(e.target.value) || 0 })}
                                    placeholder="Enter reorder level"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Price *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editItem ? editItem.price : newItem.price}
                                    onChange={(e) => editItem ? setEditItem({ ...editItem, price: parseFloat(e.target.value) || 0 }) : setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                                    placeholder="Enter price"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cost Price *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editItem ? editItem.costPrice : newItem.costPrice}
                                    onChange={(e) => editItem ? setEditItem({ ...editItem, costPrice: parseFloat(e.target.value) || 0 }) : setNewItem({ ...newItem, costPrice: parseFloat(e.target.value) || 0 })}
                                    placeholder="Enter cost price"
                                />
                            </div>
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <Label>Supplier *</Label>
                                <Input
                                    value={editItem ? editItem.supplier : newItem.supplier}
                                    onChange={(e) => editItem ? setEditItem({ ...editItem, supplier: e.target.value }) : setNewItem({ ...newItem, supplier: e.target.value })}
                                    placeholder="Enter supplier name"
                                />
                            </div>
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={editItem ? editItem.description : newItem.description}
                                    onChange={(e) => editItem ? setEditItem({ ...editItem, description: e.target.value }) : setNewItem({ ...newItem, description: e.target.value })}
                                    placeholder="Enter item description"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setItemDialogOpen(false); setEditItem(null); resetNewItemForm(); }}>Cancel</Button>
                            <Button onClick={editItem ? handleEditItem : handleAddItem}>
                                {editItem ? 'Update Item' : 'Add Item'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ============ ADD/EDIT MACHINE DIALOG ============ */}
                <Dialog open={machineDialogOpen} onOpenChange={(open) => {
                    setMachineDialogOpen(open);
                    if (!open) { setEditMachine(null); resetNewMachineForm(); }
                }}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editMachine ? 'Edit Machine' : 'Add New Machine'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Machine Name *</Label>
                                <Input
                                    value={newMachine.name}
                                    onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                                    placeholder="Enter machine name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Cost *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={newMachine.cost}
                                    onChange={(e) => setNewMachine({ ...newMachine, cost: parseFloat(e.target.value) || 0 })}
                                    placeholder="Enter cost"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Purchase Date *</Label>
                                <Input
                                    type="date"
                                    value={newMachine.purchaseDate}
                                    onChange={(e) => setNewMachine({ ...newMachine, purchaseDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Quantity *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={newMachine.quantity}
                                    onChange={(e) => setNewMachine({ ...newMachine, quantity: parseInt(e.target.value) || 1 })}
                                    placeholder="Enter quantity"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status *</Label>
                                <Select
                                    value={newMachine.status}
                                    onValueChange={(value: 'operational' | 'maintenance' | 'out-of-service') => setNewMachine({ ...newMachine, status: value })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                    <SelectContent>
                                        {machineStatusOptions.map(status => (
                                            <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Location/Site</Label>
                                <Input
                                    value={newMachine.location}
                                    onChange={(e) => setNewMachine({ ...newMachine, location: e.target.value })}
                                    placeholder="Enter site/location"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Manufacturer</Label>
                                <Input
                                    value={newMachine.manufacturer}
                                    onChange={(e) => setNewMachine({ ...newMachine, manufacturer: e.target.value })}
                                    placeholder="Enter manufacturer"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Model</Label>
                                <Input
                                    value={newMachine.model}
                                    onChange={(e) => setNewMachine({ ...newMachine, model: e.target.value })}
                                    placeholder="Enter model"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Serial Number</Label>
                                <Input
                                    value={newMachine.serialNumber}
                                    onChange={(e) => setNewMachine({ ...newMachine, serialNumber: e.target.value })}
                                    placeholder="Enter serial number"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Input
                                    value={newMachine.department}
                                    onChange={(e) => setNewMachine({ ...newMachine, department: e.target.value })}
                                    placeholder="Enter department"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Assigned To</Label>
                                <Input
                                    value={newMachine.assignedTo}
                                    onChange={(e) => setNewMachine({ ...newMachine, assignedTo: e.target.value })}
                                    placeholder="Enter assigned person"
                                />
                            </div>
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={newMachine.description}
                                    onChange={(e) => setNewMachine({ ...newMachine, description: e.target.value })}
                                    placeholder="Enter machine description"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setMachineDialogOpen(false); setEditMachine(null); resetNewMachineForm(); }}>Cancel</Button>
                            <Button onClick={handleAddMachine}>{editMachine ? 'Update Machine' : 'Add Machine'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ============ VIEW MACHINE DIALOG ============ */}
                <Dialog open={viewMachineDialogOpen} onOpenChange={setViewMachineDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Machine Details</DialogTitle>
                        </DialogHeader>
                        {viewMachine && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label>Name</Label><p className="font-medium">{viewMachine.name}</p></div>
                                    <div><Label>Model</Label><p className="font-medium">{viewMachine.model || '-'}</p></div>
                                    <div><Label>Cost</Label><p className="font-medium">{formatCurrency(viewMachine.cost)}</p></div>
                                    <div><Label>Quantity</Label><p className="font-medium">{viewMachine.quantity}</p></div>
                                    <div><Label>Status</Label><Badge className={machineStatusOptions.find(s => s.value === viewMachine.status)?.color}>{viewMachine.status}</Badge></div>
                                    <div><Label>Location</Label><p className="font-medium">{viewMachine.location || '-'}</p></div>
                                    <div><Label>Manufacturer</Label><p className="font-medium">{viewMachine.manufacturer || '-'}</p></div>
                                    <div><Label>Serial Number</Label><p className="font-medium font-mono">{viewMachine.serialNumber || '-'}</p></div>
                                    <div><Label>Department</Label><p className="font-medium">{viewMachine.department || '-'}</p></div>
                                    <div><Label>Assigned To</Label><p className="font-medium">{viewMachine.assignedTo || '-'}</p></div>
                                    <div className="col-span-2"><Label>Description</Label><p className="text-sm">{viewMachine.description || 'No description'}</p></div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={() => setViewMachineDialogOpen(false)}>Close</Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* ============ CHANGE HISTORY DIALOG ============ */}
                <Dialog open={!!changeHistoryDialogOpen} onOpenChange={() => setChangeHistoryDialogOpen(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Change History</DialogTitle>
                        </DialogHeader>
                        {changeHistoryDialogOpen && (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {(() => {
                                    const item = items.find(item => item.id === changeHistoryDialogOpen);
                                    return item?.changeHistory && item.changeHistory.length > 0 ? (
                                        item.changeHistory.map((change, index) => (
                                            <div key={index} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                                                <span className="text-blue-600">{change.date}</span>
                                                <span>{change.change}</span>
                                                <span>by {change.user}</span>
                                                <span className={change.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {change.quantity > 0 ? '+' : ''}{change.quantity}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-muted-foreground py-4">No change history available</p>
                                    );
                                })()}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default InventoryPage;