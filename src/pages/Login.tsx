import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRole, UserRole } from "@/context/RoleContext";
import { toast } from "sonner";
import { Lock, Mail, Shield, Eye, EyeOff, ChevronDown, Sparkles, KeyRound, Building2, UserCheck, Users, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import skLogo from "../assets/images/sk.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("superadmin");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useRole();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !selectedRole) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password, selectedRole, rememberMe);
      toast.success("Login successful!", {
        description: rememberMe ? "You will stay logged in for 30 days" : `Welcome back, ${selectedRole}!`,
        icon: <Sparkles className="h-4 w-4" />,
      });

      // Navigate based on role
      switch (selectedRole) {
        case "superadmin":
          navigate("/superadmin/dashboard");
          break;
        case "admin":
          navigate("/admin/dashboard");
          break;
        case "manager":
          navigate("/manager/dashboard");
          break;
        case "supervisor":
          navigate("/supervisor/dashboard");
          break;
        case "employee":
          navigate("/employee/dashboard");
          break;
        default:
          navigate("/");
      }
    } catch (error) {
      toast.error("Login failed", {
        description: "Please check your credentials and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };



  const getEmailPlaceholder = (role: UserRole) => {
    return role === "employee"
      ? "Enter Employee ID or Email"
      : "Enter your email";
  };
  const roleIcons = {
    superadmin: <KeyRound className="h-5 w-5" />,
    admin: <Shield className="h-5 w-5" />,
    manager: <Building2 className="h-5 w-5" />,
    supervisor: <UserCheck className="h-5 w-5" />,
    employee: <Users className="h-5 w-5" />,
  };

  const roleColors = {
    superadmin: "from-blue-500 to-cyan-500",
    admin: "from-blue-500 to-cyan-500",
    manager: "from-blue-500 to-cyan-500",
    supervisor: "from-blue-500 to-cyan-500",
    employee: "from-slate-500 to-gray-500",
  };

  // Helper function to get input placeholder text based on role
  const getInputPlaceholder = (field: "email" | "password", role: UserRole) => {
    if (role === "superadmin") {
      return field === "email"
        ? "Enter super admin email"
        : "Enter super admin password";
    }
    if (role === "admin") {
      return field === "email"
        ? "Enter admin email"
        : "Enter admin password";
    }
    if (role === "manager") {
      return field === "email"
        ? "Enter manager email"
        : "Enter manager password";
    }
    if (role === "supervisor") {
      return field === "email"
        ? "Enter supervisor email"
        : "Enter supervisor password";
    }
    if (role === "employee") {
      return field === "email"
        ? "Enter employee email"
        : "Enter employee password";
    }
    return field === "email"
      ? "Enter your email"
      : "Enter your password";
  };

  // Helper function to get input focus colors based on role
  const getInputFocusColors = (role: UserRole) => {
    // Use blue/cyan for superadmin, admin, manager, supervisor
    if (role === "superadmin" || role === "admin" || role === "manager" || role === "supervisor") {
      return {
        border: "focus:border-blue-500/50",
        ring: "focus:ring-blue-500/30",
        icon: "group-focus-within:text-blue-400",
        placeholder: "placeholder:text-white/70" // White placeholder for privileged roles
      };
    }
    // Keep original colors for employee
    return {
      border: "focus:border-purple-500/50",
      ring: "focus:ring-purple-500/30",
      icon: "group-focus-within:text-purple-400",
      placeholder: "placeholder:text-gray-400" // Keep gray for employee
    };
  };

  const inputFocusColors = getInputFocusColors(selectedRole);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-gray-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-[2px] h-[2px] bg-white/20 rounded-full"
            initial={{
              x: Math.random() * 100 + "vw",
              y: Math.random() * 100 + "vh",
            }}
            animate={{
              x: Math.random() * 100 + "vw",
              y: Math.random() * 100 + "vh",
            }}
            transition={{
              duration: Math.random() * 20 + 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}

        {/* Gradient Orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Role-based glowing border */}
        <div className={cn(
          "absolute -inset-0.5 rounded-2xl blur opacity-70 transition duration-500",
          roleColors[selectedRole]
        )}>
          <div className="absolute inset-0 bg-gradient-to-r opacity-30 animate-pulse" />
        </div>

        <Card className="relative bg-gray-900/80 backdrop-blur-xl border-gray-800 shadow-2xl overflow-hidden">
          {/* Animated top accent */}
          <motion.div
            className={cn(
              "h-1 w-full bg-gradient-to-r",
              roleColors[selectedRole]
            )}
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />

          <CardHeader className="space-y-4 text-center relative">
            {/* Floating particles */}
            <motion.div
              className="absolute -top-10 -right-10"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-6 w-6 text-blue-400/30" />
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto relative"
            >
              {/* Enhanced glow effect - updated to blue/cyan */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-3xl blur-2xl opacity-40 animate-pulse" />

              <div className="relative w-48 h-36 rounded-2xl flex items-center justify-center p-6">
                <img
                  src={skLogo}
                  alt="SK Project Logo"
                  className="h-full w-full object-contain drop-shadow-2xl"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                SK PROJECT
              </CardTitle>
              <CardDescription className="text-gray-400 mt-2">
                Facility Management System
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-3"
              >
                <Label className="text-gray-300 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Select Role
                </Label>
                <Select
                  value={selectedRole || ""}
                  onValueChange={(value) => setSelectedRole(value as UserRole)}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/80 transition-all duration-300 h-12">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-1.5 rounded-md bg-gradient-to-br",
                        roleColors[selectedRole]
                      )}>
                        {roleIcons[selectedRole]}
                      </div>
                      <SelectValue placeholder="Select your role" />
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800 backdrop-blur-xl text-white">
                    <SelectItem
                      value="superadmin"
                      className="focus:bg-gray-800/50 focus:text-white text-white hover:text-white py-3"
                    >
                      <div className="flex items-center gap-3 text-white">
                        {roleIcons.superadmin}
                        <span>Super Admin</span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="admin"
                      className="focus:bg-gray-800/50 focus:text-white text-white hover:text-white py-3"
                    >
                      <div className="flex items-center gap-3 text-white">
                        {roleIcons.admin}
                        <span>Admin</span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="manager"
                      className="focus:bg-gray-800/50 focus:text-white text-white hover:text-white py-3"
                    >
                      <div className="flex items-center gap-3 text-white">
                        {roleIcons.manager}
                        <span>Manager</span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="supervisor"
                      className="focus:bg-gray-800/50 focus:text-white text-white hover:text-white py-3"
                    >
                      <div className="flex items-center gap-3 text-white">
                        {roleIcons.supervisor}
                        <span>Supervisor</span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="employee"
                      className="focus:bg-gray-800/50 focus:text-white text-white hover:text-white py-3"
                    >
                      <div className="flex items-center gap-3 text-white">
                        {roleIcons.employee}
                        <span>Employee</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>

              {/* Email Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
                <Label className="text-gray-300">Email Address</Label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Mail className={cn(
                      "h-5 w-5 text-gray-400 transition-colors",
                      inputFocusColors.icon
                    )} />
                  </div>
                  <Input
                    id="email"
                    type="text"
                    placeholder={getEmailPlaceholder(selectedRole)}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(
                      "pl-12 h-12 bg-gray-800/50 border-gray-700 transition-all duration-300 text-white",
                      inputFocusColors.border,
                      inputFocusColors.ring,
                      inputFocusColors.placeholder, // Dynamic placeholder color
                      "focus:ring-1"
                    )}
                    required
                  />
                </div>
              </motion.div>

              {/* Password Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <Label className="text-gray-300">Password</Label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Lock className={cn(
                      "h-5 w-5 text-gray-400 transition-colors",
                      inputFocusColors.icon
                    )} />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={getInputPlaceholder("password", selectedRole)}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      "pl-12 pr-12 h-12 bg-gray-800/50 border-gray-700 transition-all duration-300 text-white",
                      inputFocusColors.border,
                      inputFocusColors.ring,
                      inputFocusColors.placeholder, // Dynamic placeholder color
                      "focus:ring-1"
                    )}
                    required
                  />
                  <motion.button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                    whileTap={{ scale: 0.9 }}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </motion.button>
                </div>
              </motion.div>
              {/* Remember Me Checkbox - ADD THIS BEFORE THE SIGN IN BUTTON */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="rememberMe" className="ml-2 text-sm text-gray-300">
                    Remember Me
                  </Label>
                </div>
                <a href="#" className="text-sm text-blue-400 hover:text-blue-300">
                  Forgot Password?
                </a>
              </motion.div>
              {/* Sign In Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  type="submit"
                  className={cn(
                    "w-full h-12 text-lg font-semibold transition-all duration-300 relative overflow-hidden group",
                    "bg-gradient-to-r hover:shadow-xl",
                    roleColors[selectedRole],
                    // Update button shadow color based on role
                    selectedRole === "employee"
                      ? "hover:shadow-purple-500/20"
                      : "hover:shadow-blue-500/20"
                  )}
                  disabled={isLoading}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5" />
                        Sign In
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </Button>
              </motion.div>

              {/* Sign Up Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center"
              >
                <p className="text-gray-400 text-sm">
                  Super Admin or Admin?{" "}
                  <motion.a
                    href="/signup"
                    className={cn(
                      "hover:text-blue-300 font-medium inline-flex items-center gap-1 group",
                      // Update link color based on role
                      selectedRole === "employee" ? "text-purple-400" : "text-blue-400"
                    )}
                    whileHover={{ x: 2 }}
                  >
                    Sign up here
                    <motion.span
                      initial={{ x: -5, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="group-hover:translate-x-1 transition-transform"
                    >
                      →
                    </motion.span>
                  </motion.a>
                </p>
              </motion.div>
            </form>
          </CardContent>

          {/* Footer note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="px-6 pb-4 text-center"
          >
            <p className="text-xs text-gray-500">
              Secure access to SK PROJECT management system
            </p>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;