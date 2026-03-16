import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * EpisodeDetail is now a redirect shim.
 * All episode operations have been consolidated into EpisodeWorkspace (/episodes/:id).
 * Bookmarked URLs and external links to /episodes/:id/detail continue to work.
 */
export default function EpisodeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/episodes/${id}`, { replace: true });
  }, [id, navigate]);

  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
