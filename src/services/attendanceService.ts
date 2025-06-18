// attendanceService.ts - FULL UPDATED VERSION
import { supabase } from '@/integrations/supabase/client';
import { DailyAttendance, MonthlyAttendance, AttendanceStatus, SelectedSlots, HourlyAttendance } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface DatabaseStudent {
  id: string;
  name: string;
  roll_no: string;
  status: string;
}

interface DatabaseAttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  hourly_status: {
    hour: number;
    status: AttendanceStatus;
    time?: string;
    reason?: string;
  }[];
  created_at?: string;
  updated_at?: string;
  version?: number;
}

interface DatabaseSelectedSlots {
  id: string;
  student_id: string;
  date: string;
  selected_hours: number[];
}

// Utility function to handle concurrency conflicts
const handleConcurrencyConflict = async (
  record: any,
  existingRecord: DatabaseAttendanceRecord
): Promise<boolean> => {
  try {
    // Get the latest version from the database again to be sure
    const { data: latestData, error: fetchError } = await supabase
      .from("daily_attendance")
      .select("*")
      .eq("id", existingRecord.id)
      .single();

    if (fetchError) throw fetchError;
    
    // If the record has been updated by someone else, merge the changes
    if (latestData && latestData.version > (record.version || 0)) {
      // Get our new status values organized by hour for easier merging
      const newStatusByHour: Record<number, any> = {};
      record.hourly_status.forEach((status: any) => {
        newStatusByHour[status.hour] = status;
      });
      
      // Get the existing status values organized by hour
      const existingStatusByHour: Record<number, any> = {};
      latestData.hourly_status.forEach((status: any) => {
        existingStatusByHour[status.hour] = status;
      });
      
      // Merge changes - newer timestamps win
      const mergedHourlyStatus: any[] = [];
      
      // Collect all unique hours from both records
      const allHours = new Set([
        ...Object.keys(newStatusByHour).map(Number),
        ...Object.keys(existingStatusByHour).map(Number)
      ]);
      
      allHours.forEach(hour => {
        const newStatus = newStatusByHour[hour];
        const existingStatus = existingStatusByHour[hour];
        
        // If only one has the hour, use that one
        if (!newStatus) {
          mergedHourlyStatus.push(existingStatus);
        } else if (!existingStatus) {
          mergedHourlyStatus.push(newStatus);
        } else {
          // Both have the hour, use the one with the newer timestamp
          const newTime = newStatus.time ? new Date(newStatus.time).getTime() : 0;
          const existingTime = existingStatus.time ? new Date(existingStatus.time).getTime() : 0;
          
          mergedHourlyStatus.push(newTime > existingTime ? newStatus : existingStatus);
        }
      });
      
      // Update our record with the merged changes and increment version
      record.hourly_status = mergedHourlyStatus;
      record.version = (latestData.version || 0) + 1;
      
      return true; // We've successfully merged changes
    }
    
    return false; // No conflict detected
  } catch (error) {
    console.error("Error handling concurrency conflict:", error);
    throw error;
  }
};

export const getDailyAttendance = async (
  date: string
): Promise<DailyAttendance[]> => {
  try {
    const { data: students, error: studentError } = await supabase
      .from("students")
      .select("id, name, roll_no")
      .eq("status", "active");

    if (studentError) {
      console.error("Error fetching students:", studentError);
      throw studentError;
    }

    const { data: attendance, error: attendanceError } = await supabase
      .from("daily_attendance")
      .select("*")
      .eq("date", date);

    if (attendanceError) {
      console.error("Error fetching attendance:", attendanceError);
      throw attendanceError;
    }
    
    // Create attendance records for all students without excessive logging
    return (students as DatabaseStudent[]).map((student) => {
      const attendanceRecord = (
        attendance as unknown as DatabaseAttendanceRecord[]
      )?.find((a) => a.student_id === student.id);
      
      const hourlyStatus = attendanceRecord?.hourly_status
        ? attendanceRecord.hourly_status.map((h) => {
            return {
              hour: h.hour,
              status: h.status,
              time: h.time,
              reason: h.reason,
            };
          })
        : [];

      return {
        id: attendanceRecord?.id,
        studentId: student.id,
        date: date,
        hourlyStatus,
        version: attendanceRecord?.version || 0
      };
    });
  } catch (error) {
    console.error("Error in getDailyAttendance:", error);
    throw error;
  }
};

// Function to validate that no more than 12 lectures are marked as present
export const validateAttendanceCount = (hourlyStatus: HourlyAttendance[]): boolean => {
  const presentCount = hourlyStatus.filter(h => h.status === 'present').length;
  return presentCount <= 12;
};

export const updateDailyAttendance = async (
  attendanceRecords: DailyAttendance[]
): Promise<boolean> => {
  // Validate each record to ensure no more than 12 lectures
  for (const record of attendanceRecords) {
    if (!validateAttendanceCount(record.hourlyStatus)) {
      throw new Error(`Cannot mark more than 12 lectures as present for student ${record.studentId} on ${record.date}`);
    }
  }

  try {
    // Filter out records with no hourly status entries
    const validAttendance = attendanceRecords.filter(
      (record) => record.hourlyStatus && record.hourlyStatus.length > 0
    );

    if (validAttendance.length === 0) return true;

    // Get existing records to check for version conflicts
    const studentIds = validAttendance.map(record => record.studentId);
    const dateStr = validAttendance[0].date; // All records should have the same date
    
    const { data: existingRecords, error: fetchError } = await supabase
      .from("daily_attendance")
      .select("*")
      .eq("date", dateStr)
      .in("student_id", studentIds);
      
    if (fetchError) {
      console.error("Error fetching existing records:", fetchError);
      throw fetchError;
    }

    // Prepare the records for upsert
    const recordsToUpsert = [];
    
    for (const record of validAttendance) {
      // Convert hourlyStatus to the format expected by the database
      const hourly_status = record.hourlyStatus.map((h) => ({
        hour: h.hour,
        status: h.status,
        time: h.time || new Date().toISOString(),
        reason: h.reason || null,
      }));

      // Find the existing record for version check
      const existingRecord = (existingRecords as DatabaseAttendanceRecord[] || [])
        .find(r => r.student_id === record.studentId);
      
      // Prepare record with versioning for concurrency control
      const recordToUpsert: any = {
        student_id: record.studentId,
        date: record.date,
        hourly_status,
        version: (record.version || 0) + 1
      };

      // If we have an existing record, use its ID
      if (existingRecord) {
        recordToUpsert.id = existingRecord.id;
      } else {
        // For new records, generate a new UUID
        recordToUpsert.id = uuidv4();
      }
      
      // Handle potential concurrency conflicts
      if (existingRecord && existingRecord.version !== undefined) {
        if (existingRecord.version > (record.version || 0)) {
          // There's a newer version in the database, need to merge changes
          const hasConflict = await handleConcurrencyConflict(recordToUpsert, existingRecord);
          if (hasConflict) {
            console.log(`Resolved conflict for student ${record.studentId}`);
          }
        }
      }
      
      recordsToUpsert.push(recordToUpsert);
    }

    // Upsert the attendance records
    const { error: attendanceError } = await supabase
      .from("daily_attendance")
      .upsert(recordsToUpsert, {
        onConflict: "student_id,date",
        ignoreDuplicates: false,
      });

    if (attendanceError) {
      console.error("Error updating attendance:", attendanceError);
      throw attendanceError;
    }

    return true;
  } catch (error) {
    console.error("Error in updateDailyAttendance:", error);
    throw error;
  }
};

export const getMonthlyAttendance = async (
  month: number,
  year: number
): Promise<MonthlyAttendance[]> => {
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const { data: students, error: studentError } = await supabase
    .from("students")
    .select("id, name, roll_no")
    .eq("status", "active");
  if (studentError) throw studentError;

  const { data: attendance, error: attendanceError } = await supabase
    .from("daily_attendance")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate);
  if (attendanceError) throw attendanceError;

  const { data: selectedSlots, error: slotsError } = await supabase
    .from("selected_slots")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate);
  if (slotsError) throw slotsError;

  return (students as DatabaseStudent[]).map((student) => {
    const studentAttendance = (
      attendance as unknown as DatabaseAttendanceRecord[]
    ).filter((a) => a.student_id === student.id);

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalLeave = 0;
    let totalMedical = 0;
    let totalHours = 0;

    studentAttendance.forEach((day) => {
      // Get selected slots for this day
      const daySlots = (selectedSlots as DatabaseSelectedSlots[])
        .find(s => s.student_id === student.id && s.date === day.date);
      
      // If no slots are selected, use first 15 slots as default
      const selectedHours = daySlots?.selected_hours || Array.from({length: 15}, (_, i) => i + 1);

      // Only count attendance for selected slots
      day.hourly_status
        .filter(hour => selectedHours.includes(hour.hour))
        .forEach((hour) => {
          totalHours++;
          switch (hour.status) {
            case "present":
              totalPresent++;
              break;
            case "absent":
              totalAbsent++;
              break;
            case "late":
              totalLate++;
              break;
            case "leave":
              totalLeave++;
              break;
            case "medical":
              totalMedical++;
              break;
          }
        });
    });

    const attendancePercentage =
      totalHours > 0 ? Math.round((totalPresent / totalHours) * 100) : 0;

    return {
      studentId: student.id,
      month,
      year,
      totalPresent,
      totalAbsent,
      totalLate,
      totalLeave,
      totalMedical,
      totalHours,
      attendancePercentage,
    };
  });
};

export const generateMonthlyReport = async (
  studentId: string,
  month: number,
  year: number
): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`/reports/${studentId}_${year}_${month}.pdf`);
    }, 1500);
  });
};

export const deleteAttendanceForDate = async (date: string): Promise<boolean> => {
  try {
    console.log(`Deleting attendance records for date: ${date}`);
    
    const { error } = await supabase
      .from("daily_attendance")
      .delete()
      .eq("date", date);
    
    if (error) {
      console.error("Error deleting attendance records:", error);
      throw error;
    }
    
    console.log(`Successfully deleted attendance records for date: ${date}`);
    return true;
  } catch (error) {
    console.error("Error in deleteAttendanceForDate:", error);
    throw error;
  }
};

export const resetAttendanceForHour = async (date: string, hour: number): Promise<boolean> => {
  try {
    console.log(`Resetting attendance for date: ${date}, hour: ${hour}`);
    
    // First get all current records for the date
    const { data: records, error: fetchError } = await supabase
      .from("daily_attendance")
      .select("*")
      .eq("date", date);
    
    if (fetchError) {
      console.error("Error fetching attendance records:", fetchError);
      throw fetchError;
    }
    
    if (!records || records.length === 0) {
      console.log(`No records found for date: ${date}`);
      return true; // Nothing to reset
    }
    
    // For each record, filter out the specified hour from hourly_status
    const updates = records.map(record => {
      const hourlyStatus = record.hourly_status || [];
      const updatedHourlyStatus = hourlyStatus.filter(
        (status: any) => status.hour !== hour
      );
      
      return {
        id: record.id,
        student_id: record.student_id,
        date: record.date,
        hourly_status: updatedHourlyStatus
      };
    });
    
    // Only update records that have hourly_status
    const recordsToUpdate = updates.filter(
      record => record.hourly_status.length > 0
    );
    
    // If there are records to update, do the upsert
    if (recordsToUpdate.length > 0) {
      const { error: updateError } = await supabase
        .from("daily_attendance")
        .upsert(recordsToUpdate);
      
      if (updateError) {
        console.error("Error updating attendance records:", updateError);
        throw updateError;
      }
    }
    
    // Delete records with empty hourly_status
    const recordsToDelete = updates
      .filter(record => record.hourly_status.length === 0)
      .map(record => record.id);
    
    if (recordsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("daily_attendance")
        .delete()
        .in("id", recordsToDelete);
      
      if (deleteError) {
        console.error("Error deleting empty records:", deleteError);
        throw deleteError;
      }
    }
    
    console.log(`Successfully reset attendance for date: ${date}, hour: ${hour}`);
    return true;
  } catch (error) {
    console.error("Error in resetAttendanceForHour:", error);
    throw error;
  }
};

// New function to get selected slots for a date
export const getSelectedSlots = async (date: string): Promise<SelectedSlots[]> => {
  const { data, error } = await supabase
    .from("selected_slots")
    .select("*")
    .eq("date", date);

  if (error) {
    console.error("Error fetching selected slots:", error);
    throw error;
  }

  return (data as DatabaseSelectedSlots[]).map(record => ({
    studentId: record.student_id,
    date: record.date,
    selectedHours: record.selected_hours
  }));
};

// New function to update selected slots
export const updateSelectedSlots = async (selectedSlots: SelectedSlots[]): Promise<boolean> => {
  const records = selectedSlots.map(record => ({
    student_id: record.studentId,
    date: record.date,
    selected_hours: record.selectedHours
  }));

  const { error } = await supabase
    .from("selected_slots")
    .upsert(records, {
      onConflict: "student_id, date",
      ignoreDuplicates: false
    });

  if (error) {
    console.error("Error updating selected slots:", error);
    throw error;
  }

  return true;
};

// Update the types to include version
export interface AttendanceWithVersion extends DailyAttendance {
  version: number;
}

interface SubscriptionData {
  subscription: ReturnType<typeof supabase.channel>;
  callbacks: Set<(attendance: AttendanceWithVersion) => void>;
  channelName: string;
}

// Subscription manager to track active subscriptions
const subscriptionManager = {
  activeSubscriptions: new Map<string, SubscriptionData>(),

  subscribe(date: string, callback: (attendance: AttendanceWithVersion) => void) {
    const baseChannelName = `attendance-changes-${date}`;
    const uniqueChannelName = `${baseChannelName}-${Math.random().toString(36).slice(2, 9)}`;
    
    // Check if we already have a subscription for this date
    const existingSubscription = Array.from(this.activeSubscriptions.values())
      .find(sub => sub.channelName.startsWith(baseChannelName));
    
    if (existingSubscription) {
      // Add the new callback to the existing subscription
      existingSubscription.callbacks.add(callback);
      return () => {
        this.unsubscribeCallback(existingSubscription.channelName, callback);
      };
    }

    // Create a new subscription with a unique channel name
    const subscription = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_attendance',
          filter: `date=eq.${date}`
        },
        (payload) => {
          if (payload.new) {
            const record = payload.new as DatabaseAttendanceRecord;
            const attendance: AttendanceWithVersion = {
              id: record.id,
              studentId: record.student_id,
              date: record.date,
              hourlyStatus: record.hourly_status.map((h: any) => ({
                hour: h.hour,
                status: h.status,
                time: h.time,
                reason: h.reason
              })),
              version: record.version || 0
            };
            
            // Call all callbacks registered for this channel
            const subscribers = this.activeSubscriptions.get(uniqueChannelName);
            if (subscribers) {
              subscribers.callbacks.forEach(cb => {
                try {
                  cb(attendance);
                } catch (error) {
                  console.error('Error in subscription callback:', error);
                }
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for ${uniqueChannelName}:`, status);
      });

    // Store the subscription and callback
    const subscriptionData: SubscriptionData = {
      subscription,
      callbacks: new Set([callback]),
      channelName: uniqueChannelName
    };
    this.activeSubscriptions.set(uniqueChannelName, subscriptionData);

    // Return unsubscribe function
    return () => {
      this.unsubscribeCallback(uniqueChannelName, callback);
    };
  },

  unsubscribeCallback(channelName: string, callback: (attendance: AttendanceWithVersion) => void) {
    const subscription = this.activeSubscriptions.get(channelName);
    if (!subscription) return;

    // Remove this specific callback
    subscription.callbacks.delete(callback);

    // If no more callbacks, remove the entire subscription
    if (subscription.callbacks.size === 0) {
      console.log(`Removing channel ${channelName} - no more callbacks`);
      supabase.removeChannel(subscription.subscription)
        .then(() => {
          console.log(`Successfully removed channel ${channelName}`);
          this.activeSubscriptions.delete(channelName);
        })
        .catch(error => {
          console.error(`Error removing channel ${channelName}:`, error);
          // Still remove from our tracking even if there was an error
          this.activeSubscriptions.delete(channelName);
        });
    }
  },

  removeAllSubscriptions() {
    console.log('Removing all subscriptions');
    const subscriptions = Array.from(this.activeSubscriptions.values());
    subscriptions.forEach((subscription: SubscriptionData) => {
      supabase.removeChannel(subscription.subscription)
        .then(() => console.log(`Successfully removed channel ${subscription.channelName}`))
        .catch(error => console.error(`Error removing channel ${subscription.channelName}:`, error));
    });
    this.activeSubscriptions.clear();
  }
};

// New function to subscribe to attendance changes for real-time updates
export const subscribeToAttendanceChanges = (
  date: string,
  callback: (attendance: AttendanceWithVersion) => void
) => {
  return subscriptionManager.subscribe(date, callback);
};