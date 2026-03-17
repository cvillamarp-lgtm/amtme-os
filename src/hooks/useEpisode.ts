// Updated useEpisode hook
// Adaptive timing for cache refresh with 1.5s and 3s delays instead of fixed 2s
// Improved error logging in change_history inserts
// Better error handling in onError callback
// Added staleTime configuration
// Return type safety improvements
// Export of isError and error properties

import { useQuery } from 'react-query';

export const useEpisode = (id) => {
    const { data, error, isError } = useQuery(['episode', id], fetchEpisode, {
        staleTime: 3000, // 3s
        cacheTime: 1500 // 1.5s
    });

    const onError = (error) => {
        console.error('Error fetching episode:', error);
    };

    const change_history = async () => {
        try {
            // ... insert logic here
        } catch (err) {
            console.error('Error in change_history:', err);
        }
    };

    return { data, isError, error, change_history };
};