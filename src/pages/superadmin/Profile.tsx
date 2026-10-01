// src/pages/superadmin/Profile.tsx
import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  User as UserIcon,
  Settings,
  AlertTriangle,
  Loader2,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import userService from "@/services/userService";
import { useRole } from "@/context/RoleContext";
import { User as UserType } from "@/types/user";

// ---------------------------------------------------------------------------
// Small helper components
// ---------------------------------------------------------------------------
const MobileProfileCard = ({
  title,
  icon: Icon,
  children,
  defaultExpanded = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="p-4 pt-0 border-t">{children}</CardContent>
      )}
    </Card>
  );
};

const InfoRow = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) => (
  <div className="flex items-start gap-3 py-2 border-b last:border-0">
    <div className="p-2 bg-muted rounded-lg">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "Not provided"}</p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const SuperAdminProfile = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const { user: authUser, isAuthenticated } = useRole();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);

  const [isMobileView, setIsMobileView] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"profile" | "account">("profile");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    site: "",
  });

  // -------- Responsive flag --------
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // -------- Load user --------
  useEffect(() => {
    if (authUser && isAuthenticated) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, isAuthenticated]);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);

      const userId = (authUser as any)?._id || (authUser as any)?.id;
      if (!userId) throw new Error("No user ID found in auth context");

      let source: any = null;

      // Try backend first
      try {
        const allUsersResponse = await userService.getAllUsers();
        const found = allUsersResponse?.allUsers?.find(
          (u: any) => u._id === userId || u.id === userId
        );
        if (found) source = found;
      } catch (err) {
        console.warn("getAllUsers failed, falling back to auth context", err);
      }

      // Fallback to auth context (always available)
      if (!source && authUser) {
        source = authUser;
      }

      if (!source) throw new Error("User not found");

      setCurrentUser(source as UserType);
      setFormData({
        name: source.name || "",
        email: source.email || "",
        phone: source.phone || "",
        department: source.department || "",
        site: source.site || "",
      });
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  // -------- Save --------
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userId = (currentUser as any)?._id || (currentUser as any)?.id;
    if (!userId) {
      toast.error("No user data available");
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        site: formData.site,
        isActive: currentUser?.isActive,
        firstName: formData.name.split(" ")[0] || "",
        lastName: formData.name.split(" ").slice(1).join(" ") || "",
        joinDate: currentUser?.joinDate || new Date().toISOString(),
      };

      const updatedUser = await userService.updateUser(userId, updateData);

      setCurrentUser((prev) =>
        prev ? ({ ...prev, ...updatedUser } as UserType) : (updatedUser as UserType)
      );

      // Update cached user so the header/avatar refresh too
      const storedUser = localStorage.getItem("sk_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        localStorage.setItem(
          "sk_user",
          JSON.stringify({
            ...parsed,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            department: formData.department,
            site: formData.site,
          })
        );
      }

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(
        error?.response?.data?.message || error?.message || "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getRoleColor = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role?.toLowerCase()) {
      case "super_admin":
      case "superadmin":
        return "destructive";
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      case "supervisor":
        return "secondary";
      case "employee":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (isActive: boolean) =>
    isActive ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
    );

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "SA";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // -------- Loading / auth guards --------
  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader
          title="Super Admin Profile"
          subtitle="Manage your account settings"
          onMenuClick={onMenuClick}
        />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 md:p-8 text-center">
              <AlertTriangle className="h-12 w-12 md:h-16 md:w-16 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                Please log in to view your profile.
              </p>
              <Button
                onClick={() => (window.location.href = "/login")}
                className="w-full md:w-auto"
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader
          title="Super Admin Profile"
          subtitle="Manage your account settings"
          onMenuClick={onMenuClick}
        />
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
            <p className="ml-3 text-sm md:text-base text-muted-foreground">
              Loading profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -------- Render --------
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Super Admin Profile"
        subtitle="Manage your account settings and preferences"
        onMenuClick={onMenuClick}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6"
      >
        {/* Header card */}
        <Card className="border shadow-sm">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-background shadow-lg mx-auto sm:mx-0">
                <AvatarFallback className="text-xl md:text-2xl bg-gradient-to-br from-primary to-primary/70 text-white">
                  {getInitials(formData.name)}
                </AvatarFallback>
              </Avatar>

              <div className="text-center sm:text-left flex-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                  <h1 className="text-xl md:text-2xl font-bold">
                    {formData.name || "Super Admin"}
                  </h1>
                  <Badge variant={getRoleColor((currentUser as any)?.role || "superadmin")}>
                    <Shield className="h-3 w-3 mr-1" />
                    {((currentUser as any)?.role || "superadmin")
                      .toUpperCase()
                      .replace("_", " ")}
                  </Badge>
                  <Badge variant={currentUser?.isActive ? "default" : "secondary"}>
                    {getStatusIcon(!!currentUser?.isActive)}
                    <span className="ml-1 capitalize hidden sm:inline">
                      {currentUser?.isActive ? "Active" : "Inactive"}
                    </span>
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-center sm:justify-start gap-1">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{formData.email || "No email"}</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1">
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {formData.department || "No department"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{formData.site || "No site"}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile view */}
        {isMobileView ? (
          <div className="space-y-4">
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                type="button"
                variant={activeMobileTab === "profile" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveMobileTab("profile")}
                className="flex-1"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </Button>
              <Button
                type="button"
                variant={activeMobileTab === "account" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveMobileTab("account")}
                className="flex-1"
              >
                <Settings className="mr-2 h-4 w-4" />
                Account
              </Button>
            </div>

            {activeMobileTab === "profile" && (
              <MobileProfileCard
                title="Personal Information"
                icon={User}
                defaultExpanded={true}
              >
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name-mobile" className="flex items-center gap-2">
                        <User className="h-4 w-4" /> Full Name
                      </Label>
                      <Input
                        id="name-mobile"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        placeholder="Enter your full name"
                        required
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email-mobile" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> Email Address
                      </Label>
                      <Input
                        id="email-mobile"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="Enter your email"
                        required
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone-mobile" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" /> Phone Number
                      </Label>
                      <Input
                        id="phone-mobile"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="Enter your phone number"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="department-mobile"
                        className="flex items-center gap-2"
                      >
                        <Building2 className="h-4 w-4" /> Department
                      </Label>
                      <Input
                        id="department-mobile"
                        value={formData.department}
                        onChange={(e) =>
                          handleInputChange("department", e.target.value)
                        }
                        placeholder="Enter your department"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="site-mobile" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Site/Location
                      </Label>
                      <Input
                        id="site-mobile"
                        value={formData.site}
                        onChange={(e) => handleInputChange("site", e.target.value)}
                        placeholder="Enter your site location"
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Member Since
                      </Label>
                      <div className="px-3 py-2 border rounded-md bg-muted/50 text-sm">
                        {formatDate(currentUser?.joinDate)}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <Button type="submit" disabled={saving} className="w-full h-10">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                      </>
                    )}
                  </Button>
                </form>
              </MobileProfileCard>
            )}

            {activeMobileTab === "account" && (
              <MobileProfileCard
                title="Account Details"
                icon={Settings}
                defaultExpanded={true}
              >
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">User ID</Label>
                    <div className="font-mono text-xs bg-muted p-3 rounded mt-1 break-all">
                      {(currentUser as any)?._id || (currentUser as any)?.id || "N/A"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Role</Label>
                      <div className="mt-1">
                        <Badge
                          variant={getRoleColor((currentUser as any)?.role || "superadmin")}
                          className="text-xs"
                        >
                          {((currentUser as any)?.role || "superadmin")
                            .toUpperCase()
                            .replace("_", " ")}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(!!currentUser?.isActive)}
                        <span className="text-sm capitalize">
                          {currentUser?.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <InfoRow
                    label="Join Date"
                    value={formatDate(currentUser?.joinDate)}
                    icon={Calendar}
                  />

                  <InfoRow label="Last Updated" value="Just now" icon={Clock} />
                </div>
              </MobileProfileCard>
            )}
          </div>
        ) : (
          /* Desktop view */
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="gap-2">
                <UserIcon className="h-4 w-4" /> Profile Information
              </TabsTrigger>
              <TabsTrigger value="account" className="gap-2">
                <Settings className="h-4 w-4" /> Account Details
              </TabsTrigger>
            </TabsList>

            {/* Profile tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                    Update your personal details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="name-desktop" className="flex items-center gap-2">
                          <User className="h-4 w-4" /> Full Name
                        </Label>
                        <Input
                          id="name-desktop"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          placeholder="Enter your full name"
                          required
                        />
                      </div>

                      <div className="space-y-3">
                        <Label
                          htmlFor="email-desktop"
                          className="flex items-center gap-2"
                        >
                          <Mail className="h-4 w-4" /> Email Address
                        </Label>
                        <Input
                          id="email-desktop"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          placeholder="Enter your email"
                          required
                        />
                      </div>

                      <div className="space-y-3">
                        <Label
                          htmlFor="phone-desktop"
                          className="flex items-center gap-2"
                        >
                          <Phone className="h-4 w-4" /> Phone Number
                        </Label>
                        <Input
                          id="phone-desktop"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          placeholder="Enter your phone number"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label
                          htmlFor="department-desktop"
                          className="flex items-center gap-2"
                        >
                          <Building2 className="h-4 w-4" /> Department
                        </Label>
                        <Input
                          id="department-desktop"
                          value={formData.department}
                          onChange={(e) =>
                            handleInputChange("department", e.target.value)
                          }
                          placeholder="Enter your department"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label
                          htmlFor="site-desktop"
                          className="flex items-center gap-2"
                        >
                          <MapPin className="h-4 w-4" /> Site/Location
                        </Label>
                        <Input
                          id="site-desktop"
                          value={formData.site}
                          onChange={(e) => handleInputChange("site", e.target.value)}
                          placeholder="Enter your site location"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" /> Member Since
                        </Label>
                        <div className="px-3 py-2 border rounded-md bg-muted/50">
                          {formatDate(currentUser?.joinDate)}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button type="submit" disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" /> Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account tab */}
            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle>Account Details</CardTitle>
                  <CardDescription>
                    Your account information and metadata
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">User ID</Label>
                    <div className="font-mono text-sm bg-muted p-2 rounded break-all">
                      {(currentUser as any)?._id || (currentUser as any)?.id || "N/A"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Role</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={getRoleColor((currentUser as any)?.role || "superadmin")}
                        >
                          {((currentUser as any)?.role || "superadmin")
                            .toUpperCase()
                            .replace("_", " ")}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(!!currentUser?.isActive)}
                        <span className="capitalize">
                          {currentUser?.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Join Date</Label>
                      <p className="font-medium">
                        {formatDate(currentUser?.joinDate)}
                      </p>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Last Updated</Label>
                      <p className="font-medium">
                        <Clock className="inline h-3 w-3 mr-1" />
                        Just now
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </motion.div>
    </div>
  );
};

export default SuperAdminProfile;