import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const SalarySlip = () => {
  const salaryData = {
    month: "January 2024",
    basicSalary: 3000,
    allowances: 500,
    deductions: 200,
    netSalary: 3300,
  };

  const handleDownload = () => {
    toast.success("Salary slip downloaded!");
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Salary Slip" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 space-y-6"
      >
        <div className="flex justify-between items-center">
          <Select defaultValue="jan2024">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jan2024">January 2024</SelectItem>
              <SelectItem value="dec2023">December 2023</SelectItem>
              <SelectItem value="nov2023">November 2023</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Salary Details - {salaryData.month}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Basic Salary</span>
                <span className="font-medium">${salaryData.basicSalary.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Allowances</span>
                <span className="font-medium text-primary">+${salaryData.allowances.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Gross Salary</span>
                <span className="font-medium">
                  ${(salaryData.basicSalary + salaryData.allowances).toFixed(2)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Deductions</span>
                <span className="font-medium text-destructive">-${salaryData.deductions.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Net Salary</span>
                <span className="font-bold text-primary">${salaryData.netSalary.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium">Bank Transfer</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Date</span>
                <span className="font-medium">January 31, 2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-primary">Paid</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default SalarySlip;
