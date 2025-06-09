import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { addPayment, getStudentFees } from "@/services/feesService";
import { formatCurrency } from "@/lib/utils";
import { Student, Fee } from "@/types";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { useSystemDefaults } from "@/hooks/useSystemDefaults";

interface AddPaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  preSelectedStudentId?: string;
}

const AddPaymentForm = ({ onSuccess, onCancel, preSelectedStudentId }: AddPaymentFormProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentFees, setStudentFees] = useState<(Fee & { student: Student })[]>([]);
  const [selectedFee, setSelectedFee] = useState<(Fee & { student: Student }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { defaults } = useSystemDefaults();
  const minPayment = defaults?.min_payment || 500;

  const paymentSchema = z.object({
    studentId: z.string().min(1, "Please select a student"),
    feeId: z.string().min(1, "Please select a fee record"),
    amount: z.string()
      .min(1, "Amount is required")
      .refine((val) => {
        const num = Number(val);
        return !isNaN(num) && num > 0;
      }, {
        message: "Amount must be a valid number greater than 0",
      }),
    method: z.enum(["cash", "bank_transfer", "online", "check"]),
    date: z.string().min(1, "Payment date is required"),
    selectedFeeDueAmount: z.number().optional(),
    reference: z.string().optional(),
  }).superRefine((data, ctx) => {
    // Validate amount against minimum
    const amount = Number(data.amount);
    const min = data.selectedFeeDueAmount !== undefined ? data.selectedFeeDueAmount : minPayment;
    if (amount < min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Amount must be at least ₹${minPayment} or the due amount, whichever is lower.`,
        path: ["amount"]
      });
    }

    // Validate reference number for online payments and bank transfers
    if ((data.method === 'online' || data.method === 'bank_transfer' || data.method === 'check') && (!data.reference || !data.reference.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Reference number is required for ${data.method} payments`,
        path: ["reference"]
      });
    }
  });

  type PaymentFormData = z.infer<typeof paymentSchema>;

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      studentId: "",
      feeId: "",
      amount: "",
      method: "cash",
      date: new Date().toISOString().split("T")[0],
      reference: "",
    },
  });

  // Function to fetch fee records for a student - defined with useCallback to avoid dependency issues
  const fetchFeeRecords = useCallback(async (studentId: string) => {
    if (!studentId) {
      setStudentFees([]);
      return;
    }

    try {
      setLoading(true);
      const fees = await getStudentFees(studentId);
      setStudentFees(fees);
      
      // Clear previous fee selection
      form.setValue('feeId', '');
      setSelectedFee(null);
    } catch (error) {
      console.error("Error fetching fee records:", error);
      toast({
        title: "Error",
        description: "Failed to load fee records. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, form]);

  // Set preSelectedStudentId separately after form initialization
  useEffect(() => {
    if (preSelectedStudentId) {
      form.setValue("studentId", preSelectedStudentId);
      // Trigger the fetchFeeRecords effect by setting the studentId
      fetchFeeRecords(preSelectedStudentId);
    }
  }, [preSelectedStudentId, form, fetchFeeRecords]);

  // Load students with fee records
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("students")
          .select("id, name, roll_no, course, batch")
          .order("name");

        if (error) throw error;
        
        setStudents(data.map(student => ({
          id: student.id,
          name: student.name,
          rollNo: student.roll_no,
          course: student.course,
          batch: student.batch,
          status: 'active',
          email: '',
          phone: '',
          joinDate: '',
        })));
      } catch (error) {
        console.error("Error loading students:", error);
        toast({
          title: "Error",
          description: "Failed to load students. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [toast]);

  // When student changes, fetch their fee records
  useEffect(() => {
    const studentId = form.getValues().studentId;
    if (studentId) {
      fetchFeeRecords(studentId);
    }
  }, [form.watch('studentId'), fetchFeeRecords]);

  // Set maximum amount based on selected fee
  useEffect(() => {
    if (selectedFee) {
      // Default to remaining amount
      form.setValue('amount', selectedFee.dueAmount.toString());
      form.setValue('selectedFeeDueAmount', selectedFee.dueAmount < minPayment ? selectedFee.dueAmount : minPayment);
    }
  }, [selectedFee]);

  // Set preSelectedStudentId after students are loaded
  useEffect(() => {
    if (preSelectedStudentId && students.length > 0) {
      const exists = students.some(s => s.id === preSelectedStudentId);
      if (exists) {
        form.setValue("studentId", preSelectedStudentId);
      }
    }
  }, [preSelectedStudentId, students, form]);

  const handleFeeSelect = (feeId: string) => {
    const fee = studentFees.find(f => f.id === feeId);
    if (fee) {
      setSelectedFee(fee);
    }
  };

  const onSubmit = async (values: PaymentFormData) => {
    if (!values.feeId) return;
    
    setSubmitting(true);

    try {
      await addPayment(
        values.feeId,
        {
          amount: parseFloat(values.amount),
          date: values.date,
          method: values.method as any,
          reference: ['online', 'bank_transfer', 'check'].includes(values.method) ? values.reference : undefined,
          slipURL: "",
        }
      );

      toast({
        title: "Payment Added",
        description: "Payment has been recorded successfully.",
      });
      
      onSuccess();
    } catch (error: any) {
      console.error("Error adding payment:", error);
      toast({
        title: "Error",
        description: error?.message || error?.error_description || "Failed to add payment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {selectedFee && (
          <div className="text-lg font-semibold text-center mb-2">
            {selectedFee.student?.name}
          </div>
        )}
        <FormField
          control={form.control}
          name="studentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                }}
                value={field.value}
                disabled={loading || submitting || !!preSelectedStudentId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue>
                      {field.value ? 
                        students.find(s => s.id === field.value)?.name || "Select student" : 
                        "Select student"}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {students.length === 0 ? (
                    <SelectItem value="no-students-available">
                      No students available
                    </SelectItem>
                  ) : (
                    students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.rollNo})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="feeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fee Record</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  handleFeeSelect(value);
                }}
                value={field.value}
                disabled={loading || submitting || studentFees.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue>
                      {field.value ? 
                        studentFees.find(f => f.id === field.value) ? 
                          `${formatCurrency(studentFees.find(f => f.id === field.value)?.totalAmount || 0)} - Due: ${formatCurrency(studentFees.find(f => f.id === field.value)?.dueAmount || 0)}` : 
                          "Select fee record" : 
                        "Select fee record"}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {studentFees.length === 0 ? (
                    <SelectItem value="no-fees-available">
                      No fee records available for this student
                    </SelectItem>
                  ) : (
                    studentFees.map((fee) => (
                      <SelectItem key={fee.id} value={fee.id}>
                        {formatCurrency(fee.totalAmount)} - Due: {formatCurrency(fee.dueAmount)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {studentFees.length === 0 && form.getValues().studentId && (
                <p className="text-sm text-muted-foreground mt-1">
                  This student has no fee records yet. Please create a fee record first.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedFee && (
          <div className="bg-muted p-3 rounded-md mb-4">
            <h3 className="font-medium mb-1">Selected Fee Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total Amount:</div>
              <div className="font-medium">{formatCurrency(selectedFee.totalAmount)}</div>
              <div>Paid Amount:</div>
              <div className="font-medium">{formatCurrency(selectedFee.paidAmount)}</div>
              <div>Due Amount:</div>
              <div className="font-medium">{formatCurrency(selectedFee.dueAmount)}</div>
              <div>Due Date:</div>
              <div className="font-medium">{new Date(selectedFee.dueDate).toLocaleDateString()}</div>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={selectedFee ? (selectedFee.dueAmount < minPayment ? selectedFee.dueAmount : minPayment) : minPayment}
                  max={selectedFee ? selectedFee.dueAmount : undefined}
                  placeholder="Enter payment amount"
                  {...field}
                />
              </FormControl>
              <div className="text-xs text-muted-foreground">
                {selectedFee && (
                  <>
                    Due: {formatCurrency(selectedFee.dueAmount)}<br />
                    Minimum payment: ₹{selectedFee.dueAmount < minPayment ? selectedFee.dueAmount : minPayment}
                  </>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={loading || submitting || !selectedFee}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {(form.watch('method') === 'online' || form.watch('method') === 'bank_transfer' || form.watch('method') === 'check') && (
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference Number</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Enter reference number"
                    {...field}
                    disabled={loading || submitting || !selectedFee}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  disabled={loading || submitting || !selectedFee}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading || submitting || !selectedFee}
          >
            {submitting ? "Processing..." : "Add Payment"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddPaymentForm;
