import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import FeeTable from "@/components/FeeTable";
import { Student, Fee } from "@/types";
import { getAllStudentsWithFees, getStudentFees, createFeeRecord } from "@/services/feesService";
import { useToast } from "@/hooks/use-toast";
import AddPaymentForm from "@/components/AddPaymentForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSystemDefaults } from "@/hooks/useSystemDefaults";

// Schema for creating a new fee record
const feeFormSchema = z.object({
  totalAmount: z.string().min(1, { message: "Total amount is required." }),
  dueDate: z.string().min(1, { message: "Due date is required." }),
  graceMonth: z.string().transform(val => val === "" ? "5" : val),
  graceFeeAmount: z.string().transform(val => val === "" ? "500" : val),
  initialPayment: z.string().optional(),
});

// Schema for student selection
const studentSelectSchema = z.object({
  studentId: z.string().min(1, "Please select a student")
});

const FeeManagement = () => {
  const [fees, setFees] = useState<Array<Fee & { student: Student } | { student: Student, noFeeRecord: true }>>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'payment' | 'create' | 'select'>('payment');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [processing, setProcessing] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const { toast } = useToast();
  const [duesFilter, setDuesFilter] = useState("all");
  const { defaults } = useSystemDefaults();

  // Set up form for creating new fee records
  const form = useForm<z.infer<typeof feeFormSchema>>({
    resolver: zodResolver(feeFormSchema),
    defaultValues: {
      totalAmount: "",
      dueDate: "",
      graceMonth: defaults?.grace_period_months?.toString() || "5",
      graceFeeAmount: defaults?.grace_fee?.toString() || "500",
      initialPayment: "",
    },
  });

  // Set up form for student selection
  const studentSelectForm = useForm<z.infer<typeof studentSelectSchema>>({
    resolver: zodResolver(studentSelectSchema),
    defaultValues: {
      studentId: ""
    }
  });

  // Filter fees based on dues status
  const filteredFees = useMemo(() => {
    if (duesFilter === "all") return fees;
    if (duesFilter === "dues") {
      return fees.filter(feeObj => {
        if ('noFeeRecord' in feeObj) return false;
        return feeObj.dueAmount > 0;
      });
    }
    if (duesFilter === "paid") {
      return fees.filter(feeObj => {
        if ('noFeeRecord' in feeObj) return false;
        return (feeObj.dueAmount === 0 || feeObj.status === 'paid');
      });
    }
    return fees;
  }, [fees, duesFilter]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const feesData = await getAllStudentsWithFees();
      setFees(feesData);
    } catch (error) {
      console.error("Error fetching fees:", error);
      toast({
        title: "Error",
        description: "Failed to load fee data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load all students for selection form
  const fetchAllStudents = async () => {
    try {
      setLoadingStudents(true);
      const { data, error } = await supabase
        .from("students")
        .select("id, name, roll_no, course, batch, status, email, phone, join_date")
        .order("name");

      if (error) throw error;
      
      setAvailableStudents(data.map(student => ({
        id: student.id,
        name: student.name,
        rollNo: student.roll_no,
        course: student.course,
        batch: student.batch,
        status: student.status as any,
        email: student.email || '',
        phone: student.phone || '',
        joinDate: student.join_date,
      })));
    } catch (error) {
      console.error("Error loading students:", error);
      toast({
        title: "Error", 
        description: "Failed to load students for selection.",
        variant: "destructive"
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchFees();
    fetchAllStudents();
  }, []);

  // Update form when defaults change
  useEffect(() => {
    if (defaults) {
      form.setValue('graceMonth', defaults.grace_period_months?.toString() || "5");
      form.setValue('graceFeeAmount', defaults.grace_fee?.toString() || "500");
    }
  }, [defaults, form]);

  const handleAddPaymentSuccess = () => {
    setIsDialogOpen(false);
    setSelectedStudent(null);
    fetchFees();
    toast({
      title: "Success",
      description: "Payment added successfully.",
    });
  };

  const handleCreateFeeSuccess = () => {
    setIsDialogOpen(false);
    setSelectedStudent(null);
    fetchFees();
    toast({
      title: "Success",
      description: "Fee record created successfully.",
    });
    form.reset({
      totalAmount: "",
      dueDate: "",
      graceMonth: defaults?.grace_period_months?.toString() || "5",
      graceFeeAmount: defaults?.grace_fee?.toString() || "500",
      initialPayment: "",
    });
  };

  const handleManageFees = async (student: Student) => {
    setSelectedStudent(student);
    
    try {
      // Check if student has fee records
      const studentFees = await getStudentFees(student.id);
      
      if (studentFees.length > 0) {
        // Student has fee records, show payment form
        setDialogMode('payment');
        setIsDialogOpen(true);
      } else {
        // Student has no fee records
        
        // If student has course fees, pre-fill the form with those values
        if (student.courseFees && student.courseFees !== '' && !isNaN(parseFloat(student.courseFees))) {
          let totalAmount = parseFloat(student.courseFees);
          
          // Apply discount if available
          if (student.discount && Number(student.discount) > 0) {
            const discountPercent = Number(student.discount);
            totalAmount = totalAmount - (totalAmount * discountPercent / 100);
            // Round to 2 decimal places
            totalAmount = Math.round(totalAmount * 100) / 100;
          }
          
          // Set form values
          form.setValue("totalAmount", totalAmount.toString());
          
          if (student.graceMonth) {
            form.setValue("graceMonth", student.graceMonth);
          }
          
          if (student.gracePeriodFees) {
            form.setValue("graceFeeAmount", student.gracePeriodFees);
          }
        }
        
        // Show create form
        setDialogMode('create');
        setIsDialogOpen(true);
      }
    } catch (error) {
      console.error("Error checking student fee records:", error);
      toast({
        title: "Error",
        description: "Failed to check student fee records.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (data: z.infer<typeof feeFormSchema>) => {
    if (!selectedStudent) return;
    
    setProcessing(true);
    console.log("Creating fee record with data:", JSON.stringify(data, null, 2));
    
    try {
      let totalAmount = Number(data.totalAmount);
      
      // Apply discount if available on the student record
      if (selectedStudent.discount && Number(selectedStudent.discount) > 0) {
        const discountPercent = Number(selectedStudent.discount);
        totalAmount = totalAmount - (totalAmount * discountPercent / 100);
      }
      
      await createFeeRecord(
        selectedStudent.id,
        totalAmount,
        data.dueDate,
        Number(data.graceMonth),
        Number(data.graceFeeAmount),
        data.initialPayment ? Number(data.initialPayment) : undefined
      );
      
      handleCreateFeeSuccess();
    } catch (error: any) {
      console.error("Error creating fee record:", error);
      toast({
        title: "Error",
        description: error?.message || error?.error_description || "Failed to create fee record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenAddPayment = () => {
    // First show student selection form
    setSelectedStudent(null);
    setDialogMode('select');
    setIsDialogOpen(true);
    
    // Reset the form
    studentSelectForm.reset({
      studentId: ""
    });
  };

  const handleStudentSelect = async (data: z.infer<typeof studentSelectSchema>) => {
    try {
      setProcessing(true);
      
      // Validate the studentId
      if (!data.studentId || data.studentId === "no-students-available") {
        toast({
          title: "Error",
          description: "Please select a valid student.",
          variant: "destructive",
        });
        return;
      }
      
      // Find the selected student in our available students list
      const student = availableStudents.find(s => s.id === data.studentId);
      if (!student) {
        throw new Error("Selected student not found");
      }
      
      setSelectedStudent(student);
      
      // Check if student has fee records
      const studentFees = await getStudentFees(student.id);
      
      if (studentFees.length > 0) {
        // Student has fee records, show payment form
        setDialogMode('payment');
      } else {
        // Student has no fee records, show create form
        setDialogMode('create');
      }
    } catch (error) {
      console.error("Error selecting student:", error);
      toast({
        title: "Error",
        description: "Failed to process student selection.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Fee Management</h1>
          <p className="text-muted-foreground">Track and manage student fee records.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenAddPayment}>
            <Plus className="mr-2 h-4 w-4" />
            Add Payment
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <Select value={duesFilter} onValueChange={setDuesFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Dues Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="dues">With Dues</SelectItem>
              <SelectItem value="paid">Fully Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <FeeTable 
        fees={filteredFees} 
        loading={loading} 
        onAddPayment={handleManageFees}
      />

      {/* Dynamic Dialog for Student Selection, Payment and Fee Record Creation */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'select' 
                ? "Select Student" 
                : dialogMode === 'payment' 
                  ? "Add Payment" 
                  : "Create Fee Record"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'select'
                ? "Select a student to manage fees."
                : dialogMode === 'payment' 
                  ? "Record a new payment for a student's fee record." 
                  : `Set up a new fee record for ${selectedStudent?.name || 'the student'}.`}
            </DialogDescription>
          </DialogHeader>
          
          {dialogMode === 'select' ? (
            <Form {...studentSelectForm}>
              <form onSubmit={studentSelectForm.handleSubmit(handleStudentSelect)} className="space-y-4">
                <FormField
                  control={studentSelectForm.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingStudents || processing}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Search and select student" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableStudents.length === 0 ? (
                            <SelectItem value="no-students-available">
                              {loadingStudents ? "Loading students..." : "No students available"}
                            </SelectItem>
                          ) : (
                            availableStudents.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.name} ({student.rollNo}) - {student.course}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loadingStudents || processing || !studentSelectForm.getValues().studentId}
                  >
                    {processing ? "Processing..." : "Continue"}
                  </Button>
                </div>
              </form>
            </Form>
          ) : dialogMode === 'payment' ? (
            <AddPaymentForm 
              onSuccess={handleAddPaymentSuccess} 
              onCancel={() => {
                setIsDialogOpen(false);
                setSelectedStudent(null);
              }}
              preSelectedStudentId={selectedStudent?.id}
            />
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Fee Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter total fee amount"
                          {...field}
                          disabled={processing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={processing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="graceMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grace Period (Months)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="12"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? defaults?.grace_period_months?.toString() || "5" : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Default: {defaults?.grace_period_months || 5} months
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="graceFeeAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grace Period Fees</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? defaults?.grace_fee?.toString() || "500" : value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Default: ₹{defaults?.grace_fee || 500}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="initialPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Payment (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          disabled={processing}
                        />
                      </FormControl>
                      <FormDescription>
                        If the student is making an initial payment now, enter the amount here.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setSelectedStudent(null);
                    }}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={processing}>
                    {processing ? "Creating..." : "Create Fee Record"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeManagement;
