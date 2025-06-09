import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { Student, Fee } from "@/types";
import { getStudentFees, createFeeRecord, addPayment } from "@/services/feesService";
import { NewFeeForm } from "./StudentFeeManager/NewFeeForm";
import { PaymentForm } from "./StudentFeeManager/PaymentForm";
import { FeeAlerts } from "./StudentFeeManager/FeeAlerts";
import { formatCurrency } from "./StudentFeeManager/utils";

interface StudentFeeManagerProps {
  student: Student;
  onSuccess?: () => void;
}

const StudentFeeManager = ({ student, onSuccess }: StudentFeeManagerProps) => {
  const [loading, setLoading] = useState(true);
  const [feeRecord, setFeeRecord] = useState<(Fee & { student: Student }) | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const { toast } = useToast();

  const fetchFeeRecord = async () => {
    try {
      setLoading(true);
      const fees = await getStudentFees(student.id);
      if (fees.length > 0) {
        setFeeRecord(fees[0]);
        setActiveTab("details");
      } else {
        setFeeRecord(null);
        setActiveTab("new");
        
        // If student has course fees but no fee record, create one automatically
        if (student.courseFees && student.courseFees !== '' && !isNaN(parseFloat(student.courseFees))) {
          await createFeeRecordFromStudentData();
        }
      }
    } catch (error) {
      console.error("Error fetching fee record:", error);
      toast({
        title: "Error",
        description: "Failed to load fee record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to create a fee record from student data
  const createFeeRecordFromStudentData = async () => {
    try {
      if (!student.courseFees || student.courseFees === '' || isNaN(parseFloat(student.courseFees))) {
        return; // No valid course fees available
      }
      
      let totalAmount = parseFloat(student.courseFees);
      
      // Apply discount if available
      if (student.discount && Number(student.discount) > 0) {
        const discountPercent = Number(student.discount);
        totalAmount = totalAmount - (totalAmount * discountPercent / 100);
        // Round to 2 decimal places
        totalAmount = Math.round(totalAmount * 100) / 100;
      }
      
      // Set due date to 30 days from now
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Use student's grace month or default to 5
      const graceMonth = student.graceMonth ? parseInt(student.graceMonth) : 5;
      
      // Use student's grace period fees or default to 500
      const graceFeeAmount = student.gracePeriodFees ? parseFloat(student.gracePeriodFees) : 500;
      
      await createFeeRecord(
        student.id,
        totalAmount,
        dueDate,
        graceMonth,
        graceFeeAmount
      );
      
      toast({
        title: "Fee Record Created",
        description: `Fee record automatically created for ${student.name}`,
      });
      
      // Refresh fee records
      const fees = await getStudentFees(student.id);
      if (fees.length > 0) {
        setFeeRecord(fees[0]);
        setActiveTab("details");
      }
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error auto-creating fee record:", error);
      toast({
        title: "Error",
        description: "Failed to automatically create fee record. You can create one manually.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchFeeRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  const handleCreateFeeRecord = async (data: any) => {
    try {
      setLoading(true);
      let totalAmount = parseFloat(data.totalAmount);
      
      // Apply discount if available on the student record
      if (student.discount && Number(student.discount) > 0) {
        const discountPercent = Number(student.discount);
        totalAmount = totalAmount - (totalAmount * discountPercent / 100);
      }
      
      const initPayment = parseFloat(data.initialPayment || "0");
      await createFeeRecord(
        student.id,
        totalAmount,
        data.dueDate,
        parseInt(data.graceMonth),
        parseFloat(data.graceFeeAmount),
        initPayment > 0 ? initPayment : undefined
      );
      toast({
        title: "Fee Record Created",
        description: `Fee record created for ${student.name}${initPayment > 0 ? ` with initial payment of ${formatCurrency(initPayment)}` : ''}`,
      });
      fetchFeeRecord();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error creating fee record:", error);
      toast({
        title: "Error",
        description: "Failed to create fee record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async (data: any) => {
    if (!feeRecord) return;
    try {
      setLoading(true);
      await addPayment(feeRecord.id, {
        amount: parseFloat(data.amount),
        date: data.date,
        method: data.method,
        reference: data.reference || "",
        slipURL: "",
      });
      toast({
        title: "Payment Added",
        description: `Payment of ${formatCurrency(parseFloat(data.amount))} recorded successfully.`,
      });
      fetchFeeRecord();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error adding payment:", error);
      toast({
        title: "Error",
        description: "Failed to add payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading && !feeRecord) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle className="h-6 bg-gray-200 rounded-md w-3/4"></CardTitle>
          <CardDescription className="h-4 bg-gray-200 rounded-md w-1/2 mt-2"></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-gray-200 rounded-md"></div>
        </CardContent>
      </Card>
    );
  }

  // Show fee record creation form if no fee record exists
  if (!feeRecord) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Fee Record</CardTitle>
          <CardDescription>
            Set up a new fee record for {student.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewFeeForm 
            student={student} 
            onSubmit={handleCreateFeeRecord} 
            isSubmitting={loading} 
          />
        </CardContent>
      </Card>
    );
  }

  // Calculate if the payment is already late
  const isLate = feeRecord.isLateFeeApplied;

  // Show fee details and payment form if fee record exists
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardDescription>
              View and add payments for {student.name}
            </CardDescription>
          </div>
          <Badge variant={feeRecord.status === 'paid' ? 'success' : feeRecord.status === 'partially_paid' ? 'warning' : 'destructive'}>
            {feeRecord.status === 'paid' ? 'Paid' : feeRecord.status === 'partially_paid' ? 'Partially Paid' : 'Unpaid'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Fee Details</TabsTrigger>
            <TabsTrigger value="payment">Make Payment</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Total Amount</div>
                <div className="text-lg font-bold">{formatCurrency(feeRecord.totalAmount)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Paid Amount</div>
                <div className="text-lg font-bold">{formatCurrency(feeRecord.paidAmount)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Due Amount</div>
                <div className="text-lg font-bold">{formatCurrency(feeRecord.dueAmount)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Due Date</div>
                <div className="text-lg font-bold flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(feeRecord.dueDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Grace Period</div>
                <div className="text-lg font-bold">{feeRecord.graceMonth} months</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Late Fee Amount</div>
                <div className="text-lg font-bold">{formatCurrency(feeRecord.graceFeeAmount)}</div>
              </div>
            </div>
            <FeeAlerts
              isLate={isLate}
              graceFeeAmount={feeRecord.graceFeeAmount}
              dueDate={feeRecord.dueDate}
              graceUntilDate={feeRecord.graceUntilDate || ""}
              graceMonth={feeRecord.graceMonth}
            />
          </TabsContent>
          <TabsContent value="payment">
            <PaymentForm onSubmit={handleAddPayment} loading={loading || feeRecord.status === 'paid'} />
            <div className="text-sm text-muted-foreground mt-2">
              Due amount: {formatCurrency(feeRecord.dueAmount)}
              {feeRecord.status === 'paid' && (
                <span className="text-green-600 ml-2">This fee record is fully paid.</span>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StudentFeeManager; 