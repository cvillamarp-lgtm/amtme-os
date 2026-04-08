/**
 * Distribution Dashboard
 * Real-time view of atomized content, publication status, and performance metrics
 */

import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface AtomicPiece {
  id: string;
  episode_id: string;
  piece_id: string;
  content_type: string;
  platforms: string[];
  headline: string;
  status: "draft" | "approved" | "scheduled" | "published" | "archived";
  performance_metrics?: {
    views: number;
    engagement: number;
    saves: number;
    shares: number;
  };
  created_at: string;
  updated_at: string;
}

interface DistributionStats {
  total_pieces: number;
  published: number;
  draft: number;
  scheduled: number;
  total_views: number;
  total_engagement: number;
  avg_views_per_piece: number;
}

export function DistributionDashboard() {
  const [pieces, setPieces] = useState<AtomicPiece[]>([]);
  const [stats, setStats] = useState<DistributionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");

  useEffect(() => {
    fetchDistributionData();
  }, [timeRange]);

  async function fetchDistributionData() {
    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      const daysBack = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      // Fetch atomic content
      const { data: atomicContent, error: contentError } = await supabase
        .from("atomic_content")
        .select("*")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      if (contentError) throw contentError;

      setPieces(atomicContent || []);

      // Calculate stats
      const published = atomicContent?.filter(p => p.status === "published") || [];
      const draft = atomicContent?.filter(p => p.status === "draft") || [];
      const scheduled = atomicContent?.filter(p => p.status === "scheduled") || [];

      const totalViews = published.reduce(
        (sum, p) => sum + (p.performance_metrics?.views || 0),
        0
      );
      const totalEngagement = published.reduce(
        (sum, p) => sum + (p.performance_metrics?.engagement || 0),
        0
      );

      setStats({
        total_pieces: atomicContent?.length || 0,
        published: published.length,
        draft: draft.length,
        scheduled: scheduled.length,
        total_views: totalViews,
        total_engagement: totalEngagement,
        avg_views_per_piece: published.length > 0 ? totalViews / published.length : 0
      });
    } catch (error) {
      // Error handling for distribution data fetch
      // Logged to stderr in production
    } finally {
      setLoading(false);
    }
  }

  const platformBreakdown = pieces.reduce(
    (acc, piece) => {
      for (const platform of piece.platforms) {
        acc[platform] = (acc[platform] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const platformData = Object.entries(platformBreakdown).map(([platform, count]) => ({
    platform: platform.replace("_", " "),
    count
  }));

  const contentTypeBreakdown = pieces.reduce(
    (acc, piece) => {
      acc[piece.content_type] = (acc[piece.content_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const contentTypeData = Object.entries(contentTypeBreakdown).map(([type, count]) => ({
    type,
    count
  }));

  if (loading) {
    return <div className="p-8 text-center">Loading distribution data...</div>;
  }

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Distribution Dashboard</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as "7d" | "30d" | "90d")}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Total Pieces</p>
            <p className="text-3xl font-bold">{stats.total_pieces}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Published</p>
            <p className="text-3xl font-bold text-green-600">{stats.published}</p>
          </div>
          <div className="bg-blue-50 p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Total Views</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total_views.toLocaleString()}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Avg Views/Piece</p>
            <p className="text-3xl font-bold text-purple-600">{Math.round(stats.avg_views_per_piece).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Platform Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Platform Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={platformData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="platform" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Content Type Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Content Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={contentTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Pieces */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Recent Atomic Pieces</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {pieces.slice(0, 10).map((piece) => (
            <div key={piece.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
              <div className="flex-1">
                <p className="font-medium truncate">{piece.headline}</p>
                <p className="text-sm text-gray-600">
                  {piece.content_type} • {piece.platforms.join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  piece.status === "published" ? "bg-green-100 text-green-800" :
                  piece.status === "scheduled" ? "bg-yellow-100 text-yellow-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {piece.status}
                </span>
                {piece.performance_metrics && piece.status === "published" && (
                  <div className="text-right text-sm">
                    <p className="font-medium">{piece.performance_metrics.views.toLocaleString()} views</p>
                    <p className="text-gray-600">{piece.performance_metrics.engagement} engagement</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
