import { useState, useEffect } from "react";
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
import { createFeeRecord } from "@/services/feesService";
import { Student } from "@/types";

const formSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a valid number greater than 0",
  }),
  dueDate: z.string().min(1, "Due date is required"),
});

interface AddFeeRecordFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  selectedStudent?: Student | null;
}

const AddFeeRecordForm = ({ onSuccess, onCancel, selectedStudent }: AddFeeRecordFormProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: selectedStudent?.id || "",
      amount: "",
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days from now
    },
  });

  // Set the selected student if provided
  useEffect(() => {
    if (selectedStudent) {
      form.setValue("studentId", selectedStudent.id);
    }
  }, [selectedStudent, form]);

  // Load students without fee records
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        
        // Get all students
        const { data: allStudents, error: studentsError } = await supabase
          .from("students")
          .select("id, name, roll_no")
          .order("name");

        if (studentsError) throw studentsError;
        
        // Get students that already have fee records
        const { data: feeRecords, error: feesError } = await supabase
          .from("fees")
          .select("student_id");
          
        if (feesError) throw feesError;
        
        // Create a Set of student IDs that already have fee records
        const studentIdsWithFees = new Set(feeRecords.map(record => record.student_id));
        
        // Filter out students who already have fee records
        // BUT include the selectedStudent if provided
        const availableStudents = allStudents
          .filter(student => !studentIdsWithFees.has(student.id) || student.id === selectedStudent?.id)
          .map(student => ({
            id: student.id,
            name: student.name,
            rollNo: student.roll_no,
          }));

        setStudents(availableStudents);
      } catch (error) {
        console.error("Error loading students:", error);
        toast({
          title: "Error",
          description: "Failed to load students.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [toast, selectedStudent]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setSubmitting(true);

    try {
      await createFeeRecord(
        values.studentId,
        parseFloat(values.amount),
        values.dueDate
      );

      toast({
        title: "Fee Record Created",
        description: "New fee record has been created successfully.",
      });
      
      onSuccess();
    } catch (error) {
      console.error("Error creating fee record:", error);
      toast({
        title: "Error",
        description: "Failed to create fee record. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="studentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={loading || submitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {students.length === 0 ? (
                    <SelectItem value="no-students" disabled>
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
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Enter total fee amount"
                  {...field}
                  disabled={loading || submitting}
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
                  disabled={loading || submitting}
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
          <Button type="submit" disabled={loading || submitting}>
            {submitting ? "Creating..." : "Create Fee Record"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddFeeRecordForm; 