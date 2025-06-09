import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AttendanceStatus,
  Student,
  DailyAttendance,
  HourlyAttendance,
  SelectedSlots,
} from "@/types";

interface AttendanceTableProps {
  students: Student[];
  date: Date;
  attendance: DailyAttendance[];
  selectedSlots?: SelectedSlots[];
  onDateChange: (date: Date) => void;
  onAttendanceChange: (
    studentId: string,
    hour: number,
    status: AttendanceStatus,
    reason?: string
  ) => void;
  onSelectedSlotsChange?: (selectedSlots: SelectedSlots[]) => void;
  onActiveHourChange?: (hour: number) => void;
  recentlyUpdatedStudents?: Set<string>;
}

const hours = Array.from({ length: 15 }, (_, i) => i + 1);

const statusColors: Record<AttendanceStatus, string> = {
  present: "bg-green-500",
  absent: "bg-red-500",
  late: "bg-amber-500",
  leave: "bg-blue-500",
  in: "bg-gray-500",
  out: "bg-gray-400",
  exam: "bg-purple-500",
  medical: "bg-cyan-500",
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  leave: "Leave",
  in: "In",
  out: "Out",
  exam: "Exam",
  medical: "Medical",
};

const AttendanceTable = ({
  students,
  date,
  attendance,
  selectedSlots = [],
  onDateChange,
  onAttendanceChange,
  onSelectedSlotsChange,
  onActiveHourChange,
  recentlyUpdatedStudents = new Set(),
}: AttendanceTableProps) => {
  const [activeHour, setActiveHour] = useState(1);
  const [leaveReasons, setLeaveReasons] = useState<Record<string, string>>({});
  const [lastUpdatedTimes, setLastUpdatedTimes] = useState<Record<string, string>>({});
  const [presentWarnings, setPresentWarnings] = useState<Record<string, boolean>>({});

  // Initialize leave reasons and last updated times from attendance data
  useEffect(() => {
    const initialReasons: Record<string, string> = {};
    const initialLastUpdated: Record<string, string> = {};
    
    attendance.forEach((record) => {
      let mostRecentTime: string | undefined;
      
      record.hourlyStatus.forEach((hourData) => {
        if (hourData.status === "leave" && hourData.reason) {
          initialReasons[`${record.studentId}_${hourData.hour}`] = hourData.reason;
        }
        
        if (hourData.time) {
          if (!mostRecentTime || new Date(hourData.time) > new Date(mostRecentTime)) {
            mostRecentTime = hourData.time;
          }
        }
      });
      
      if (mostRecentTime) {
        initialLastUpdated[record.studentId] = mostRecentTime;
      }
    });
    
    setLeaveReasons(initialReasons);
    setLastUpdatedTimes(initialLastUpdated);
  }, [attendance]);

  // Check for students with more than 12 present lectures
  useEffect(() => {
    const warnings: Record<string, boolean> = {};
    
    attendance.forEach(record => {
      const presentCount = record.hourlyStatus.filter(h => h.status === 'present').length;
      if (presentCount > 12) {
        warnings[record.studentId] = true;
      }
    });
    
    setPresentWarnings(warnings);
  }, [attendance]);

  const getStatus = (studentId: string, hour: number): AttendanceStatus | undefined => {
    const record = attendance.find((a) => a.studentId === studentId);
    return record?.hourlyStatus.find((h) => h.hour === hour)?.status;
  };

  const getReason = (studentId: string, hour: number): string | undefined => {
    const record = attendance.find((a) => a.studentId === studentId);
    return record?.hourlyStatus.find((h) => h.hour === hour)?.reason;
  };

  const formatLastUpdated = (timestamp: string | undefined): string => {
    if (!timestamp) return "Not recorded";
    try {
      const date = new Date(timestamp);
      return format(date, "h:mm a"); // Only show time in format like "3:45 PM"
    } catch (e) {
      return "Invalid date";
    }
  };

  const handleStatusChange = (
    studentId: string,
    hour: number,
    status: AttendanceStatus
  ) => {
    console.log(
      `Status change for student ${studentId}, hour ${hour}, status ${status}`
    );

    // If status is leave, initialize the reason in state
    if (status === "leave") {
      const existingReason = getReason(studentId, hour) || "";
      console.log(`Setting initial leave reason: "${existingReason}"`);

      setLeaveReasons((prev) => ({
        ...prev,
        [`${studentId}_${hour}`]: existingReason,
      }));
    }

    // Pass the reason if it exists for leave status
    const reason =
      status === "leave"
        ? leaveReasons[`${studentId}_${hour}`] || ""
        : undefined;
    console.log(`Passing reason to parent: "${reason || "none"}"`);
    
    // Update the last updated time for this student in our local state
    const currentTime = new Date().toISOString();
    setLastUpdatedTimes(prev => ({
      ...prev,
      [studentId]: currentTime
    }));

    onAttendanceChange(studentId, hour, status, reason);
  };

  const handleReasonChange = (
    studentId: string,
    hour: number,
    reason: string
  ) => {
    console.log(
      `Reason change for student ${studentId}, hour ${hour}, reason: "${reason}"`
    );

    // Update the local state
    setLeaveReasons((prev) => ({
      ...prev,
      [`${studentId}_${hour}`]: reason,
    }));
    
    // Update the last updated time for this student in our local state
    const currentTime = new Date().toISOString();
    setLastUpdatedTimes(prev => ({
      ...prev,
      [studentId]: currentTime
    }));

    // Update the attendance with the new reason
    onAttendanceChange(studentId, hour, "leave", reason);
  };

  // Update parent component when active hour changes
  const handleHourChange = (hour: number) => {
    console.log("Hour button clicked:", hour);
    
    // Update local state
    setActiveHour(hour);
    
    // Notify parent component
    if (onActiveHourChange) {
      console.log("Notifying parent of hour change:", hour);
      onActiveHourChange(hour);
    } else {
      console.warn("Parent component did not provide onActiveHourChange handler");
    }
  };

  return (
    <div className="space-y-4">
      {Object.keys(presentWarnings).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Some students have more than 12 lectures marked as present. This may cause errors when saving.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && onDateChange(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2 overflow-auto pb-2 no-scrollbar">
          {hours.map((hour) => (
            <Button
              key={hour}
              variant={activeHour === hour ? "default" : "outline"}
              size="sm"
              onClick={() => handleHourChange(hour)}
              className={cn(
                "min-w-[40px] hover:bg-blue-950 hover:text-white transition-colors",
                activeHour === hour && "bg-blue-950 text-white hover:bg-blue-900"
              )}
            >
              {hour}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border text-black overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="text-black">
              <TableHead className="w-[180px] font-bold">Student</TableHead>
              <TableHead className="font-bold">Roll No</TableHead>
              <TableHead className="hidden md:table-cell font-bold">Course</TableHead>
              <TableHead className="font-bold">Hour {activeHour} Status</TableHead>
              <TableHead className="font-bold text-right">Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow 
                key={student.id}
                className={cn(
                  presentWarnings[student.id] ? "bg-red-50" : "",
                  recentlyUpdatedStudents.has(student.id) ? "bg-blue-50 transition-colors duration-500" : ""
                )}
              >
                <TableCell className="font-medium">
                  {student.name}
                  {presentWarnings[student.id] && (
                    <span className="ml-2 text-xs text-red-500 font-normal">
                      (More than 12 present)
                    </span>
                  )}
                  {recentlyUpdatedStudents.has(student.id) && (
                    <span className="ml-2 text-xs text-blue-500 font-normal">
                      (Updated by another user)
                    </span>
                  )}
                </TableCell>
                <TableCell>{student.rollNo}</TableCell>
                <TableCell className="hidden md:table-cell">{student.course}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "min-w-[80px]",
                          getStatus(student.id, activeHour) === "present" &&
                            "bg-green-500 text-white hover:bg-green-600"
                        )}
                        onClick={() =>
                          handleStatusChange(student.id, activeHour, "present")
                        }
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full bg-green-500")} />
                          Present
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "min-w-[80px]",
                          getStatus(student.id, activeHour) === "absent" &&
                            "bg-red-500 text-white hover:bg-red-600"
                        )}
                        onClick={() =>
                          handleStatusChange(student.id, activeHour, "absent")
                        }
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full bg-red-500")} />
                          Absent
                        </div>
                      </Button>
                      {getStatus(student.id, activeHour) &&
                      !["present", "absent"].includes(
                        getStatus(student.id, activeHour) as string
                      ) ? (
                        <Select
                          value={getStatus(student.id, activeHour)}
                          onValueChange={(value) =>
                            handleStatusChange(
                              student.id,
                              activeHour,
                              value as AttendanceStatus
                            )
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue>
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    statusColors[
                                      getStatus(
                                        student.id,
                                        activeHour
                                      ) as AttendanceStatus
                                    ]
                                  )}
                                />
                                {
                                  statusLabels[
                                    getStatus(
                                      student.id,
                                      activeHour
                                    ) as AttendanceStatus
                                  ]
                                }
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels)
                              .filter(
                                ([value]) =>
                                  value !== "present" && value !== "absent"
                              )
                              .map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={cn(
                                        "h-2 w-2 rounded-full",
                                        statusColors[value as AttendanceStatus]
                                      )}
                                    />
                                    {label}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select
                          value={
                            ["present", "absent"].includes(
                              getStatus(student.id, activeHour) || ""
                            )
                              ? ""
                              : getStatus(student.id, activeHour) || ""
                          }
                          onValueChange={(value) =>
                            handleStatusChange(
                              student.id,
                              activeHour,
                              value as AttendanceStatus
                            )
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Other Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels)
                              .filter(
                                ([value]) =>
                                  value !== "present" && value !== "absent"
                              )
                              .map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={cn(
                                        "h-2 w-2 rounded-full",
                                        statusColors[value as AttendanceStatus]
                                      )}
                                    />
                                    {label}
                                  </div>
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Show reason input field when status is leave */}
                    {getStatus(student.id, activeHour) === "leave" && (
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          placeholder="Enter reason for leave"
                          value={
                            leaveReasons[`${student.id}_${activeHour}`] ||
                            getReason(student.id, activeHour) ||
                            ""
                          }
                          onChange={(e) =>
                            handleReasonChange(
                              student.id,
                              activeHour,
                              e.target.value
                            )
                          }
                          className="w-full text-sm"
                        />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className={cn(
                  "text-right text-sm",
                  recentlyUpdatedStudents.has(student.id) ? "text-blue-600 font-medium" : "text-gray-600"
                )}>
                  {formatLastUpdated(lastUpdatedTimes[student.id])}
                  {recentlyUpdatedStudents.has(student.id) && " (Just now)"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AttendanceTable;
