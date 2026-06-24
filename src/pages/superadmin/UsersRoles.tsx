import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, UserCheck, UserX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:5001/api' : 'https://sk-backend-btbj.onrender.com/api');

const UsersRoles = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "employee" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/users`);
      if (res.data.success) {
        setUsers(res.data.allUsers || []);
      } else {
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error loading users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Add new user
  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/users`, formData);
      if (res.data.success) {
        toast.success("User added successfully!");
        setDialogOpen(false);
        setFormData({ name: "", email: "", password: "", role: "employee" });
        fetchUsers(); // refresh list
      } else {
        toast.error(res.data.message || "Failed to add user");
      }
    } catch (error: any) {
      console.error("Add user error:", error);
      toast.error(error.response?.data?.message || "Error adding user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle user status (active/inactive)
  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await axios.patch(`${API_URL}/users/${userId}/toggle-status`);
      setUsers(users.map(user => 
        user._id === userId ? { ...user, isActive: newStatus === "active" } : user
      ));
      toast.success(`User ${newStatus === "active" ? "activated" : "deactivated"} successfully!`);
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Users & Roles Management" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>All Users</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Enter full name" 
                      required 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Enter email" 
                      required 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select 
                      required 
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Enter password" 
                      required 
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Create User
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "active" : "inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => toggleStatus(user._id, user.isActive ? "active" : "inactive")}
                          >
                            {user.isActive ? (
                              <UserX className="h-4 w-4 text-destructive" />
                            ) : (
                              <UserCheck className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default UsersRoles;