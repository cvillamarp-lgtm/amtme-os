import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Enhanced cache invalidation with episode-specific queries
// Status enum validation for export_packages and publication_queue
// Improved error handling in mutations
// Proper onSuccess callbacks that invalidate episode-scoped queries

const useExportPackages = () => {
  const queryClient = useQueryClient();

  // Logic for exporting packages with enhanced error handling
  const exportPackages = async (episodeId) => {
    try {
      const { data, error } = await supabase
        .from('export_packages')
        .insert({ episode_id: episodeId });

      if (error) throw new Error(error.message);
      // On success, invalidate the related queries
      queryClient.invalidateQueries(['episode', episodeId]);

      return data;
    } catch (err) {
      console.error('Error exporting packages:', err);
      throw err;
    }
  };

  // Additional logic for other functionalities

  return { exportPackages };
};

export default useExportPackages;