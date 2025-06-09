import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, Download, CalendarIcon } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Student } from "@/types";
import { cn } from "@/lib/utils";

interface MonthlyReportsProps {
  students: Student[];
  onDownloadReport: (options: {
    selectedStudent: string;
    selectedMonth: Date;
  }) => Promise<void>;
  reportLoading: boolean;
}

export function MonthlyReports({ 
  students, 
  onDownloadReport,
  reportLoading 
}: MonthlyReportsProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Filter students based on search query
  const filteredStudents = students.filter(student => {
    if (studentSearchQuery.trim() === "") return true;
    
    const query = studentSearchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(query) || 
      student.rollNo.toLowerCase().includes(query)
    );
  });

  const handleDownload = () => {
    onDownloadReport({
      selectedStudent,
      selectedMonth
    });
  };

  return (
    <div 
      className="space-y-6" 
      data-selected-student={selectedStudent} 
      data-selected-month={selectedMonth.toISOString()}
    >
      {/* Month Selection */}
      <div className="space-y-2">
        <Label htmlFor="month">Month</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="month"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !selectedMonth && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedMonth ? (
                format(selectedMonth, "MMMM yyyy")
              ) : (
                <span>Pick a month</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedMonth}
              onSelect={(date) => {
                if (date) {
                  const newDate = startOfMonth(date);
                  setSelectedMonth(newDate);
                  document.querySelector('[data-selected-month]')?.setAttribute('data-selected-month', newDate.toISOString());
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Student Search and Selection */}
      <div className="border rounded-md p-4">
        <h3 className="text-sm font-medium mb-3">Student Monthly Report</h3>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student by name or roll number..."
              className="pl-8"
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
            />
          </div>
          
          {studentSearchQuery.trim() !== "" && (
            <div className="border rounded-md max-h-[300px] overflow-y-auto bg-white shadow-lg">
              {filteredStudents.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No students found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                      onClick={() => {
                        setSelectedStudent(student.id);
                        document.querySelector('[data-selected-student]')?.setAttribute('data-selected-student', student.id);
                        setStudentSearchQuery("");
                      }}
                    >
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-slate-900">{student.name}</div>
                        <div className="text-base text-slate-600">
                          Roll No: <span className="font-medium">{student.rollNo}</span>
                        </div>
                        <div className="text-sm text-slate-500">
                          Course: {student.course}
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        variant="outline"
                        className="ml-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudent(student.id);
                          document.querySelector('[data-selected-student]')?.setAttribute('data-selected-student', student.id);
                          handleDownload();
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedStudent !== "all" && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-md flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-900">
                  {students.find(s => s.id === selectedStudent)?.name}
                </div>
                <div className="text-base text-slate-600">
                  Roll No: <span className="font-medium">
                    {students.find(s => s.id === selectedStudent)?.rollNo}
                  </span>
                </div>
                <div className="text-sm text-slate-500">
                  Course: {students.find(s => s.id === selectedStudent)?.course}
                </div>
              </div>
              <Button 
                onClick={handleDownload} 
                className="bg-blue-950 text-white ml-4"
                disabled={reportLoading}
              >
                <Download className="mr-2 h-4 w-4" />
                {reportLoading ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 