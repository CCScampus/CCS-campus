import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import StudentList from "@/components/StudentList";
import { Link } from "react-router-dom";
import { Student } from "@/types";
import { getStudents } from "@/services/studentService";
import { useToast } from "@/hooks/use-toast";

const StudentManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getStudents();
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({
        title: "Error",
        description: "Failed to load students. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage student profiles and information.</p>
        </div>
        <Button asChild>
          <Link to="/students/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Link>
        </Button>
      </div>

      <StudentList students={students} loading={loading} setStudents={setStudents} />
    </div>
  );
};

export default StudentManagement;
