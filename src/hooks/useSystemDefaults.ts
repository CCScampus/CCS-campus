import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Get the Supabase URL from window.env or environment variable
const SUPABASE_URL = typeof window !== 'undefined' 
  ? (window as any).env?.NEXT_PUBLIC_SUPABASE_URL 
  : process.env.NEXT_PUBLIC_SUPABASE_URL;

export interface SystemDefaults {
  /** Grace period in months (0-12) */
  grace_period_months: number;
  /** Fee amount charged after grace period expires */
  grace_fee: number;
  /** Format for batch numbers (e.g., YYYY-BATCH) */
  batch_format: string;
  /** List of available courses */
  course_list: string[];
  /** Enable fee notifications */
  notif_fee: boolean;
  /** Enable attendance notifications */
  notif_attendance: boolean;
  /** Enable system notifications */
  notif_system: boolean;
  /** Sidebar state (expanded/collapsed) */
  sidebar_state: string;
  /** Theme (light/dark) */
  theme: string;
  /** Minimum payment amount allowed */
  min_payment: number;
  /** Minimum attendance percentage required (0-100) */
  attendance_threshold: number;
  /** Currency code */
  currency: string;
  /** Version number for tracking changes */
  version: number;
}

interface UseSystemDefaultsReturn {
  defaults: SystemDefaults | null;
  loading: boolean;
  error: string | null;
  updateDefaults: (updates: Partial<SystemDefaults>) => Promise<void>;
  resetToDefault: (key: keyof SystemDefaults) => void;
}

// Default values to reset to if needed
const defaultValues: SystemDefaults = {
  grace_period_months: 5,
  grace_fee: 500,
  batch_format: 'YYYY-BATCH',
  course_list: ["BCA", "BBA", "MCA", "MBA", "BSc", "MSc", "BA", "MA"],
  notif_fee: true,
  notif_attendance: true,
  notif_system: true,
  sidebar_state: 'expanded',
  theme: 'light',
  min_payment: 500,
  attendance_threshold: 80,
  currency: 'INR',
  version: 1
};

export function useSystemDefaults(): UseSystemDefaultsReturn {
  const [defaults, setDefaults] = useState<SystemDefaults | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDefaults = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('system_defaults')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (fetchError) {
        // If no data found, initialize with default values
        if (fetchError.code === 'PGRST116') {
          const { data: insertedData, error: insertError } = await supabase
            .from('system_defaults')
            .insert([{
              id: 1,
              ...defaultValues
            }])
            .select()
            .single();
            
          if (insertError) throw insertError;
          setDefaults(insertedData);
          return;
        }
        throw fetchError;
      }
      
      // If data exists but some fields are null/undefined, use default values
      const mergedData = {
        ...defaultValues,
        ...data
      };
      
      setDefaults(mergedData);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching system defaults:', err);
      // If there's an error, use default values as fallback
      setDefaults(defaultValues);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaults();

    // Subscribe to changes in system_defaults table with a unique channel name
    const channelName = `system_defaults_changes_${Math.random().toString(36).slice(2, 9)}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_defaults',
        },
        (payload) => {
          console.log('System defaults changed:', payload);
          fetchDefaults();
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      console.log('Cleaning up system defaults subscription');
      supabase.removeChannel(subscription);
    };
  }, []);

  const updateDefaults = async (updates: Partial<SystemDefaults>) => {
    try {
      // Increment version number when updating
      const updatedData = {
        ...updates,
        version: defaults?.version ? defaults.version + 1 : 1
      };
      
      const { error: updateError } = await supabase
        .from('system_defaults')
        .update(updatedData)
        .eq('id', 1);

      if (updateError) throw updateError;

      // Update local state
      setDefaults(prev => prev ? { ...prev, ...updatedData } : null);
    } catch (err) {
      console.error('Error updating system defaults:', err);
      throw err;
    }
  };

  const resetToDefault = async (key: keyof SystemDefaults) => {
    if (defaults) {
      try {
        const defaultValue = defaultValues[key];
        // Include version increment when resetting a value
        const update = { 
          [key]: defaultValue,
          version: defaults.version ? defaults.version + 1 : 1
        };
        
        // Update database
        const { error: updateError } = await supabase
          .from('system_defaults')
          .update(update)
          .eq('id', 1);

        if (updateError) throw updateError;
        
        // Update local state immediately for better UX
        setDefaults(prev => prev ? { ...prev, ...update } : null);
      } catch (err) {
        setError(`Failed to reset ${key} to default value`);
        console.error('Error resetting to default:', err);
        throw err; // Re-throw to handle in the component
      }
    }
  };

  return {
    defaults,
    loading,
    error,
    updateDefaults,
    resetToDefault,
  };
} 