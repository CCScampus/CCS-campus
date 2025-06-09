import React from "react";

const AttendanceSummary: React.FC = () => {
  // Mock data for attendance summary
  const students = [
    {
      id: "1",
      name: "Rahul Kumar",
      rollNumber: "CS2023-001",
      course: "Computer Science",
      stats: { present: 18, absent: 2, late: 1, total: 21, percentage: 85.7 },
    },
    {
      id: "2",
      name: "Priya Sharma",
      rollNumber: "CS2023-002",
      course: "Data Science",
      stats: { present: 21, absent: 0, late: 0, total: 21, percentage: 100 },
    },
    {
      id: "3",
      name: "Amit Singh",
      rollNumber: "CS2023-003",
      course: "Web Development",
      stats: { present: 15, absent: 5, late: 1, total: 21, percentage: 71.4 },
    },
    {
      id: "4",
      name: "Neha Patel",
      rollNumber: "CS2023-004",
      course: "UI/UX Design",
      stats: { present: 19, absent: 1, late: 1, total: 21, percentage: 90.5 },
    },
    {
      id: "5",
      name: "Vikram Malhotra",
      rollNumber: "CS2023-005",
      course: "Mobile App Development",
      stats: { present: 17, absent: 3, late: 1, total: 21, percentage: 81 },
    },
    {
      id: "6",
      name: "Kavita Reddy",
      rollNumber: "CS2023-006",
      course: "Computer Science",
      stats: { present: 16, absent: 5, late: 0, total: 21, percentage: 76.2 },
    },
    {
      id: "7",
      name: "Suresh Iyer",
      rollNumber: "CS2023-007",
      course: "Data Science",
      stats: { present: 12, absent: 7, late: 2, total: 21, percentage: 57.1 },
    },
  ];

  // Weekly days array for the calendar header
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Generate calendar days for the current month (e.g., September 2023)
  const generateCalendarDays = () => {
    // September 2023 has 30 days, starting on a Friday (index 4, where Monday is 0)
    const startDayIndex = 4; // Friday
    const totalDays = 30;

    const days = [];

    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < startDayIndex; i++) {
      days.push({ day: null, date: null });
    }

    // Add the actual days of the month
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, date: `2023-09-${i < 10 ? "0" + i : i}` });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Mock function to determine attendance status for a specific student on a specific day
  const getAttendanceStatus = (studentId: string, date: string | null) => {
    if (!date) return null;

    // This is just mock data - in a real app, this would come from the backend
    const statuses = [
      "present",
      "present",
      "present",
      "absent",
      "present",
      "late",
      "present",
    ];

    // Simulate some patterns based on student ID and date
    const dayOfMonth = parseInt(date.split("-")[2]);
    const studentIndex = parseInt(studentId) - 1;

    // Weekend logic - mark weekends differently
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return "weekend";
    }

    // Use some logic to determine status based on student and day
    if (dayOfMonth % 7 === studentIndex % 7) {
      return "absent";
    } else if (dayOfMonth % 11 === studentIndex % 11) {
      return "late";
    } else {
      return "present";
    }
  };

  return (
    <div className="space-y-6">
      {/* Monthly Calendar View */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-medium">Monthly Calendar View</h3>
          <p className="text-sm text-gray-500 mt-1">September 2023</p>
        </div>

        <div className="p-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-white">
                  Student
                </th>
                {weekDays.map((day, index) => (
                  <th
                    key={index}
                    className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {day}
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white">
                    {student.name}
                  </td>
                  {weekDays.map((_, dayIndex) => (
                    <td key={dayIndex} className="px-0 py-2">
                      <div className="flex flex-wrap justify-center">
                        {calendarDays
                          .filter((_, calIndex) => calIndex % 7 === dayIndex)
                          .map((calDay, index) => {
                            const status = getAttendanceStatus(
                              student.id,
                              calDay.date
                            );
                            return (
                              <div
                                key={index}
                                className={`h-6 w-6 m-0.5 rounded-full flex items-center justify-center text-xs ${
                                  status === "present"
                                    ? "bg-green-100 text-green-800 border border-green-400"
                                    : status === "absent"
                                    ? "bg-red-100 text-red-800 border border-red-400"
                                    : status === "late"
                                    ? "bg-yellow-100 text-yellow-800 border border-yellow-400"
                                    : status === "weekend"
                                    ? "bg-gray-100 text-gray-400"
                                    : "bg-white text-gray-400 border border-gray-200"
                                }`}
                              >
                                {calDay.day ?? ""}
                              </div>
                            );
                          })}
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        student.stats.percentage >= 90
                          ? "bg-green-100 text-green-800"
                          : student.stats.percentage >= 75
                          ? "bg-blue-100 text-blue-800"
                          : student.stats.percentage >= 60
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {student.stats.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Summary Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-medium">Attendance Summary</h3>
          <p className="text-sm text-gray-500 mt-1">
            Detailed metrics for each student
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roll Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Present Days
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Absent Days
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Late Days
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Days
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.rollNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.course}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600 font-medium">
                    {student.stats.present}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-600 font-medium">
                    {student.stats.absent}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-yellow-600 font-medium">
                    {student.stats.late}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-medium">
                    {student.stats.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full mr-2">
                        <div
                          className={`h-full rounded-full ${
                            student.stats.percentage >= 90
                              ? "bg-green-500"
                              : student.stats.percentage >= 75
                              ? "bg-blue-500"
                              : student.stats.percentage >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${student.stats.percentage}%` }}
                        ></div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          student.stats.percentage >= 90
                            ? "bg-green-100 text-green-800"
                            : student.stats.percentage >= 75
                            ? "bg-blue-100 text-blue-800"
                            : student.stats.percentage >= 60
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {student.stats.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Showing {students.length} students
          </div>
          <div className="flex space-x-2 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1.5"></div>
              <span className="text-gray-700">≥ 90%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-1.5"></div>
              <span className="text-gray-700">≥ 75%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1.5"></div>
              <span className="text-gray-700">≥ 60%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-1.5"></div>
              <span className="text-gray-700">&lt; 60%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummary;
