import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Student } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useSystemDefaults } from "@/hooks/useSystemDefaults";
import { generateBatchOptions } from "@/lib/utils";

const currentYear = new Date().getFullYear();
// Default options in case system defaults aren't loaded yet
const DEFAULT_COURSE_OPTIONS = ["BCA", "BBA", "MCA", "MBA", "BSc", "MSc", "BA", "MA"];
const DEFAULT_BATCH_OPTIONS = Array.from({ length: 6 }, (_, i) => `${currentYear + i}-${currentYear + i + 1}`);
const GRACE_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => (i + 1).toString());

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  rollNo: z.string().min(1, {
    message: "Roll No. is required.",
  }),
  course: z.string().min(1, { message: "Course is required." }),
  batch: z.string().min(1, { message: "Batch is required." }),
  email: z.string().refine(val => val === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val), {
    message: "Please enter a valid email address.",
  }),
  phone: z.string().refine(val => val === '' || /^[6-9]\d{9}$/.test(val), {
    message: "Please enter a valid Indian mobile number (10 digits, starts with 6-9).",
  }),
  status: z.enum(["active", "inactive", "alumni"], {
    message: "Please select a valid status",
  }),
  address: z.string().optional().or(z.literal('')),
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format." })
    .optional()
    .or(z.literal('')),
  fatherName: z.string().optional().or(z.literal('')),
  fatherPhone: z.string()
    .refine(val => val === '' || /^\d{10,15}$/.test(val), {
      message: "Please enter a valid phone number (10-15 digits).",
    })
    .optional()
    .or(z.literal('')),
  motherName: z.string().optional().or(z.literal('')),
  motherPhone: z.string()
    .refine(val => val === '' || /^\d{10,15}$/.test(val), {
      message: "Please enter a valid phone number (10-15 digits).",
    })
    .optional()
    .or(z.literal('')),
  guardianName: z.string().optional().or(z.literal('')),
  guardianPhone: z.string()
    .refine(val => val === '' || /^\d{10,15}$/.test(val), {
      message: "Please enter a valid phone number (10-15 digits).",
    })
    .optional()
    .or(z.literal('')),
  courseDuration: z.string().optional().or(z.literal('')),
  admissionDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format." })
    .optional()
    .or(z.literal('')),
  validityDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format." })
    .optional()
    .or(z.literal('')),
  courseFees: z.string()
    .refine(val => val === '' || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: "Course fees must be a valid number greater than or equal to 0.",
    })
    .optional()
    .or(z.literal('')),
  discount: z.string()
    .refine(val => val === '' || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100), {
      message: "Discount must be a valid percentage between 0 and 100.",
    })
    .optional()
    .or(z.literal('')),
  graceMonth: z.string()
    .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Grace period must be a valid number greater than or equal to 0.",
    }),
  gracePeriodFees: z.string()
    .refine(val => val === '' || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: "Grace period fees must be a valid number greater than or equal to 0.",
    })
    .optional()
    .or(z.literal('')),
});

interface StudentFormProps {
  student?: Student | null;
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  onCancel: () => void;
}

const StudentForm = ({ student, onSubmit, onCancel }: StudentFormProps) => {
  const isEditing = !!student;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  
  // Get system defaults
  const { defaults, loading: loadingDefaults } = useSystemDefaults();
  
  // Use system defaults for course options and batch format
  const courseOptions = defaults?.course_list || DEFAULT_COURSE_OPTIONS;
  
  // Generate batch options based on system defaults
  const batchOptions = generateBatchOptions();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: student?.name || "",
      rollNo: student?.rollNo || "",
      course: student?.course || "",
      batch: student?.batch || "",
      email: student?.email || "",
      phone: student?.phone || "",
      status: student?.status || "active",
      address: student?.address || "",
      dateOfBirth: student?.dateOfBirth || "",
      fatherName: student?.fatherName || "",
      fatherPhone: student?.fatherPhone || "",
      motherName: student?.motherName || "",
      motherPhone: student?.motherPhone || "",
      guardianName: student?.guardianName || "",
      guardianPhone: student?.guardianPhone || "",
      courseDuration: student?.courseDuration || "",
      admissionDate: student?.admissionDate || "",
      validityDate: student?.validityDate || "",
      courseFees: student?.courseFees || "",
      discount: student?.discount || "",
      graceMonth: student?.graceMonth || (defaults?.grace_period_months?.toString() || "5"),
      gracePeriodFees: student?.gracePeriodFees || (defaults?.grace_fee?.toString() || "500"),
    },
  });

  // Reset form when student prop or defaults change
  useEffect(() => {
    if (student || defaults) {
      form.reset({
        ...form.getValues(),
        graceMonth: student?.graceMonth || (defaults?.grace_period_months?.toString() || "5"),
        gracePeriodFees: student?.gracePeriodFees || (defaults?.grace_fee?.toString() || "500"),
      });
    }
  }, [student, defaults, form]);

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setServerErrors({});
    try {
      await onSubmit(data);
    } catch (error: any) {
      console.error("Form submission error:", error);
      if (error.errors) {
        setServerErrors(error.errors);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to save student details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter full name" {...field} />
                </FormControl>
                <FormMessage />
                {serverErrors.name && (
                  <p className="text-sm text-red-500">{serverErrors.name}</p>
                )}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rollNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Roll No.</FormLabel>
                <FormControl>
                  <Input placeholder="Enter roll no." disabled={isEditing} {...field} />
                </FormControl>
                <FormMessage />
                {serverErrors.rollNo && (
                  <p className="text-sm text-red-500">{serverErrors.rollNo}</p>
                )}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="course"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Course</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[200px]">
                    {courseOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Select the student's course.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="batch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {batchOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the student's batch. Format: {defaults?.batch_format || 'YYYY-BATCH'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter email address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="Enter phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="alumni">Alumni</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Additional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guardianName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guardian Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter guardian name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="guardianPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guardian Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter guardian phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Parent Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="fatherName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Father's Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter father's name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fatherPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Father's Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter father's phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="motherName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mother's Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter mother's name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="motherPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mother's Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter mother's phone" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Course & Fees</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="courseDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Duration</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter course duration" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="admissionDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Admission Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="validityDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Validity Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="courseFees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Fees</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      inputMode="decimal"
                      placeholder="Enter course fees" 
                      {...field} 
                      onChange={(e) => {
                        // Only allow digits and one decimal point
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        // Ensure only one decimal point
                        const parts = value.split('.');
                        const formattedValue = parts.length > 2 
                          ? `${parts[0]}.${parts.slice(1).join('')}`
                          : value;
                        field.onChange(formattedValue);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {student ? 
                      "Updating course fees will update the total amount in the fee record. This won't affect any payments already made." :
                      "When you add course fees here, a fee record will be automatically created for this student."
                    }
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Discount</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      inputMode="decimal"
                      placeholder="Add discount" 
                      {...field} 
                      onChange={(e) => {
                        // Only allow digits and one decimal point
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        // Ensure only one decimal point
                        const parts = value.split('.');
                        const formattedValue = parts.length > 2 
                          ? `${parts[0]}.${parts.slice(1).join('')}`
                          : value;
                        
                        // Ensure the value is not greater than 100
                        const numValue = parseFloat(formattedValue);
                        if (!isNaN(numValue) && numValue > 100) {
                          field.onChange("100");
                        } else {
                          field.onChange(formattedValue);
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>Enter the discount percentage for the course.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Grace Period</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              name="gracePeriodFees"
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
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Update Student" : "Add Student"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default StudentForm;
