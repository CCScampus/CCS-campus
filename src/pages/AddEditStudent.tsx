import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import StudentForm from "@/components/StudentForm";
import { Student } from "@/types";
import { getStudentById, createStudent, updateStudent } from "@/services/studentService";
import { useToast } from "@/hooks/use-toast";
import { createFeeRecord, getStudentFees } from "@/services/feesService";
import { supabase } from "@/integrations/supabase/client";

const AddEditStudent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(id ? true : false);
  const isEditing = !!id;
  
  useEffect(() => {
    const fetchStudent = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const data = await getStudentById(id);
        
        if (!data) {
          toast({
            title: "Error",
            description: "Student not found",
            variant: "destructive",
          });
          navigate("/students");
          return;
        }
        
        setStudent(data);
      } catch (error) {
        console.error("Error fetching student:", error);
        toast({
          title: "Error",
          description: "Failed to load student data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchStudent();
    }
  }, [id, navigate, toast]);
  
  const handleFormSubmit = async (data: any) => {
    try {
      let result;
      
      if (isEditing && id) {
        // Update student data
        result = await updateStudent(id, data);
        
        // If course fees is provided in the form
        if (data.courseFees) {
          try {
            // Check if student already has fee records
            const existingFees = await getStudentFees(id);
            
            if (existingFees.length > 0) {
              // Calculate discounted fees if discount is provided
              // Use exact string values for precise calculations
              const originalFees = parseFloat(data.courseFees);
              let feesAmount = originalFees;
              
              if (data.discount && data.discount !== '0' && data.discount !== '') {
                const discountPercent = parseFloat(data.discount);
                // Calculate discount precisely
                const discountAmount = (originalFees * discountPercent) / 100;
                feesAmount = originalFees - discountAmount;
                // Round to 2 decimal places to avoid floating point issues
                feesAmount = Math.round(feesAmount * 100) / 100;
              }
              
              // Update the existing fee record
              const latestFee = existingFees[0]; // Get the most recent fee record
              const { error: updateError } = await supabase
                .from('fees')
                .update({
                  total_amount: feesAmount,
                  grace_month: parseInt(data.graceMonth || "5"),
                  grace_fee_amount: parseFloat(data.gracePeriodFees || "500"),
                })
                .eq('id', latestFee.id);

              if (updateError) {
                throw updateError;
              }
            } else {
              // Create a new fee record if none exists
              await createFeeRecord(
                id,
                Number(data.courseFees),
                // Set due date to 30 days from now
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                parseInt(data.graceMonth || "5"),
                parseInt(data.gracePeriodFees || "500")
              );
            }
          } catch (error) {
            console.error("Error updating fee record:", error);
            toast({
              title: "Warning",
              description: "Student updated but failed to update fee record.",
              variant: "destructive",
            });
          }
        }
        
        toast({
          title: "Student Updated",
          description: `${data.name} has been updated successfully.`,
          variant: "success",
        });
        navigate(`/students/${id}/view`);
      } else {
        // Add join date if creating new student
        const newStudentData = {
          ...data,
          joinDate: new Date().toISOString().split('T')[0],
        };
        result = await createStudent(newStudentData);
        
        // Create fee record if course fees is provided
        if (data.courseFees) {
          try {
            // Calculate discounted fees if discount is provided
            // Use exact string values for precise calculations
            const originalFees = parseFloat(data.courseFees);
            let feesAmount = originalFees;
            
            if (data.discount && data.discount !== '0' && data.discount !== '') {
              const discountPercent = parseFloat(data.discount);
              // Calculate discount precisely
              const discountAmount = (originalFees * discountPercent) / 100;
              feesAmount = originalFees - discountAmount;
              // Round to 2 decimal places to avoid floating point issues
              feesAmount = Math.round(feesAmount * 100) / 100;
            }
            
            await createFeeRecord(
              result.id,
              feesAmount,
              // Set due date to 30 days from now
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              parseInt(data.graceMonth || "5"),
              parseFloat(data.gracePeriodFees || "500")
            );
          } catch (error) {
            console.error("Error creating fee record:", error);
            toast({
              title: "Warning",
              description: "Student added but failed to create fee record.",
              variant: "destructive",
            });
          }
        }
        
        toast({
          title: "Student Added",
          description: `${data.name} has been added successfully.`,
        });
        navigate(`/students/${result.id}/view`);
      }
      
    } catch (error) {
      console.error("Error saving student:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} student. Please try again.`,
        variant: "destructive",
      });
    }
  };
  
  const handleCancel = () => {
    navigate("/students");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading student data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => navigate("/students")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{isEditing ? "Edit Student" : "Add Student"}</h1>
      </div>

      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <StudentForm student={student} onSubmit={handleFormSubmit} onCancel={handleCancel} />
      </div>
    </div>
  );
};

export default AddEditStudent;
