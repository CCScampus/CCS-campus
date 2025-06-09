import { supabase } from '@/integrations/supabase/client';
import { format, subHours, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Default course list in case system defaults are not available
const DEFAULT_COURSE_LIST = ["BCA", "BBA", "MCA", "MBA", "BSc", "MSc", "BA", "MA"];

export const getDashboardStats = async (): Promise<any> => {
  try {
    const now = new Date();
    const recentActivities = [];

    // Get total and active students
    const { data: studentCounts, error: initialStudentError } = await supabase
      .from('students')
      .select('*');
    if (initialStudentError) {
      console.error('Error fetching students:', initialStudentError);
      throw initialStudentError;
    }
    
    const totalStudents = studentCounts?.length || 0;
    const activeStudents = studentCounts?.filter((s: any) => s.status === 'active').length || 0;

    // Get all fee data in one query
    const { data: fees, error: initialFeeError } = await supabase
      .from('fees')
      .select('*');
    if (initialFeeError) {
      console.error('Error fetching fees:', initialFeeError);
      throw initialFeeError;
    }

    // Calculate fee statistics with null checks
    const totalFeesCollected = fees?.reduce((total: number, fee: any) => 
      total + (Number(fee.paid_amount) || 0), 0) || 0;
    const totalFeesDue = fees?.reduce((total: number, fee: any) => 
      total + (Number(fee.due_amount) || 0), 0) || 0;
    const totalFeeAmount = fees?.reduce((sum: number, fee: any) => 
      sum + (Number(fee.total_amount) || 0), 0) || 0;
    const totalPaidAmount = fees?.reduce((sum: number, fee: any) => 
      sum + (Number(fee.paid_amount) || 0), 0) || 0;

    // Calculate fee collection percentage
    const feeCollection = totalFeeAmount > 0 
      ? Math.round((totalPaidAmount / totalFeeAmount) * 100) 
      : 0;

    // Due payments and students with null checks
    const dueFees = fees?.filter((fee: any) => fee.status !== 'paid') || [];
    const duePayments = dueFees.reduce((total: number, fee: any) => 
      total + (Number(fee.due_amount) || 0), 0);
    const dueStudents = new Set(dueFees.map((fee: any) => fee.student_id)).size;

    // Count upcoming payments (due in the next 30 days)
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(now.getDate() + 30);
    const upcomingPayments = fees?.filter((fee: any) => {
      if (!fee.due_date) return false;
      const dueDate = new Date(fee.due_date);
      return fee.status !== 'paid' && dueDate >= now && dueDate <= thirtyDaysLater;
    }).length || 0;

    // Get attendance statistics for overall attendance calculation and monthly history
    const { data: attendance, error: attendanceError } = await supabase
      .from('daily_attendance')
      .select('*')
      .gte('date', format(subMonths(now, 6), 'yyyy-MM-dd'))
      .order('date', { ascending: true });
    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      throw attendanceError;
    }

    // Calculate overall attendance percentage with null checks
    let totalAttendanceHours = 0;
    let totalPresentHours = 0;
    
    attendance?.forEach((day: any) => {
      if (!day.hourly_status) return;
      day.hourly_status.forEach((hour: any) => {
        if (!hour?.status) return;
        totalAttendanceHours++;
        if (hour.status === 'present') {
          totalPresentHours++;
        }
      });
    });
    
    const overallAttendance = totalAttendanceHours > 0 
      ? Math.round((totalPresentHours / totalAttendanceHours) * 100) 
      : 0;

    // Calculate monthly attendance history
    const monthlyAttendance = [];
    for (let i = 6; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(monthStart);
      
      const monthAttendance = attendance?.filter((day: any) => {
        const dayDate = new Date(day.date);
        return dayDate >= monthStart && dayDate <= monthEnd;
      }) || [];

      let monthTotalHours = 0;
      let monthPresentHours = 0;

      monthAttendance.forEach((day: any) => {
        if (!day.hourly_status) return;
        day.hourly_status.forEach((hour: any) => {
          if (!hour?.status) return;
          monthTotalHours++;
          if (hour.status === 'present') {
            monthPresentHours++;
          }
        });
      });

      const monthAttendancePercentage = monthTotalHours > 0
        ? Math.round((monthPresentHours / monthTotalHours) * 100)
        : 0;

      monthlyAttendance.push({
        month: format(monthStart, 'MMM yyyy'),
        attendance: monthAttendancePercentage
      });
    }

    // Get system defaults for course list
    const { data: systemDefaults, error: defaultsError } = await supabase
      .from('system_defaults')
      .select('course_list')
      .eq('id', 1)
      .single();

    // Calculate active courses - total number of courses in system defaults
    const activeCourses = !defaultsError && systemDefaults?.course_list
      ? systemDefaults.course_list.length
      : DEFAULT_COURSE_LIST.length;

    // Get recent student enrollments
    const { data: recentStudents, error: recentStudentError } = await supabase
      .from('students')
      .select('created_at')
      .gte('created_at', format(subHours(now, 24), "yyyy-MM-dd'T'HH:mm:ss"))
      .order('created_at', { ascending: false });
    if (recentStudentError) {
      console.error('Error fetching recent students:', recentStudentError);
      throw recentStudentError;
    }

    if (recentStudents?.length > 0) {
      recentActivities.push({
        type: 'student',
        count: recentStudents.length,
        timestamp: new Date(recentStudents[0].created_at),
        message: `${recentStudents.length} new student${recentStudents.length > 1 ? 's' : ''} enrolled`
      });
    }

    // Get recent attendance updates
    const { data: recentAttendance, error: recentAttendanceError } = await supabase
      .from('daily_attendance')
      .select('created_at')
      .gte('created_at', format(subHours(now, 24), "yyyy-MM-dd'T'HH:mm:ss"))
      .order('created_at', { ascending: false });
    if (recentAttendanceError) {
      console.error('Error fetching recent attendance:', recentAttendanceError);
      throw recentAttendanceError;
    }

    if (recentAttendance?.length > 0) {
      recentActivities.push({
        type: 'attendance',
        timestamp: new Date(recentAttendance[0].created_at),
        message: 'Attendance updated for all classes'
      });
    }

    // Get recent fee collections
    const recentPayments = fees?.filter(fee => {
      if (!fee.created_at || !fee.paid_amount) return false;
      const paymentDate = new Date(fee.created_at);
      return paymentDate >= subDays(now, 1) && Number(fee.paid_amount) > 0;
    }) || [];

    if (recentPayments.length > 0) {
      const totalRecentPayments = recentPayments.reduce((sum: number, payment: any) => 
        sum + (Number(payment.paid_amount) || 0), 0);
      recentActivities.push({
        type: 'payment',
        amount: totalRecentPayments,
        timestamp: new Date(recentPayments[0].created_at),
        message: `Fee collected: ₹${totalRecentPayments.toLocaleString('en-IN')}`
      });
    }

    // Sort activities by timestamp
    recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      totalStudents,
      activeStudents,
      totalFeesCollected,
      totalFeesDue,
      overallAttendance,
      upcomingPayments,
      duePayments,
      dueStudents,
      feeCollection,
      activeCourses,
      recentActivities: recentActivities.slice(0, 3),
      attendanceHistory: monthlyAttendance,
    };

  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return {
      totalStudents: 0,
      activeStudents: 0,
      totalFeesCollected: 0,
      totalFeesDue: 0,
      overallAttendance: 0,
      upcomingPayments: 0,
      duePayments: 0,
      dueStudents: 0,
      feeCollection: 0,
      activeCourses: 0,
      recentActivities: [],
      attendanceHistory: [],
    };
  }
}; 