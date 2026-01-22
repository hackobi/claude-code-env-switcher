'use client';

import { useState, useEffect } from 'react';

interface Stats {
  tweets: number;
  tweetsProcessed: number;
  tasks: number;
  tasksProcessed: number;
  articles: number;
  generated: number;
  pipelineRuns: number;
}

interface Last24h {
  tweets: number;
  generated: number;
  pipelineRuns: number;
}

interface PipelineRun {
  id: number;
  started_at: string;
  completed_at: string | null;
  tweets_processed: number;
  tasks_processed: number;
  drafts_created: number;
  errors: string[] | null;
  status: string;
}

interface StatsData {
  stats: Stats | null;
  last24h: Last24h;
  statusBreakdown: Record<string, number>;
  sourceBreakdown: Record<string, number>;
  tweetSourceBreakdown: Record<string, number>;
  recentRuns: PipelineRun[];
  topContent: { content: string; brand_score: number; relevance_score: number }[];
  error?: string;
}

function StatCard({
  label,
  value,
  subValue,
  icon,
  color = 'blue'
}: {
  label: string;
  value: number | string;
  subValue?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'orange' | 'cyan' | 'magenta' | 'green';
}) {
  const colors = {
    blue: 'bg-[#2B36D9]/10 text-[#2B36D9] border-[#2B36D9]/20',
    orange: 'bg-[#FF4808]/10 text-[#FF4808] border-[#FF4808]/20',
    cyan: 'bg-[#00DAFF]/10 text-[#00DAFF] border-[#00DAFF]/20',
    magenta: 'bg-[#FF35F9]/10 text-[#FF35F9] border-[#FF35F9]/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
          {subValue && (
            <p className="text-xs text-gray-500 mt-1">{subValue}</p>
          )}
        </div>
        <div className="opacity-50">{icon}</div>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function StatsPanel() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0D0E13] border-t border-white/10 p-4">
        <div className="animate-pulse flex gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 h-20 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.error || !data.stats) {
    return (
      <div className="bg-[#0D0E13] border-t border-white/10 p-4">
        <p className="text-gray-500 text-sm text-center">
          {data?.error || 'Database not available - run the pipeline to populate data'}
        </p>
      </div>
    );
  }

  const { stats, last24h, recentRuns, statusBreakdown, tweetSourceBreakdown } = data;

  return (
    <div className="bg-[#0D0E13] border-t border-white/10">
      {/* Compact Stats Row */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-400">Pipeline Statistics</h3>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#2B36D9] hover:text-[#2B36D9]/80 transition-colors"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard
            label="Tweets Monitored"
            value={stats.tweets}
            subValue={`${last24h.tweets} in 24h`}
            color="cyan"
            icon={
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            }
          />
          <StatCard
            label="Tasks Tracked"
            value={stats.tasks}
            subValue={`${stats.tasksProcessed} processed`}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />
          <StatCard
            label="Content Generated"
            value={stats.generated}
            subValue={`${last24h.generated} in 24h`}
            color="orange"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />
          <StatCard
            label="Pipeline Runs"
            value={stats.pipelineRuns}
            subValue={`${last24h.pipelineRuns} in 24h`}
            color="magenta"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          />
          <StatCard
            label="Draft"
            value={statusBreakdown.draft || 0}
            color="blue"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <StatCard
            label="Approved"
            value={statusBreakdown.approved || 0}
            color="green"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* Expanded Section */}
      {expanded && (
        <div className="border-t border-white/5 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Pipeline Runs */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-3">Recent Pipeline Runs</h4>
              <div className="space-y-2">
                {recentRuns.slice(0, 5).map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        run.status === 'completed' ? 'bg-emerald-400' :
                        run.status === 'running' ? 'bg-[#2B36D9] animate-pulse' :
                        'bg-red-400'
                      }`} />
                      <div>
                        <p className="text-sm text-white">
                          Run #{run.id}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(run.started_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-300">
                        {run.tweets_processed} tweets • {run.tasks_processed} tasks
                      </p>
                      <p className="text-xs text-gray-500">
                        {run.drafts_created} drafts created
                      </p>
                    </div>
                  </div>
                ))}
                {recentRuns.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No pipeline runs yet
                  </p>
                )}
              </div>
            </div>

            {/* Tweet Sources */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-3">Tweet Sources</h4>
              <div className="space-y-2">
                {Object.entries(tweetSourceBreakdown).map(([source, count]) => (
                  <div
                    key={source}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <span className="text-sm text-gray-300 capitalize">{source}</span>
                    <span className="text-sm font-medium text-white">{count}</span>
                  </div>
                ))}
                {Object.keys(tweetSourceBreakdown).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No tweet data yet
                  </p>
                )}
              </div>

              {/* Content Status Breakdown */}
              <h4 className="text-sm font-medium text-gray-400 mb-3 mt-6">Content Status</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusBreakdown).map(([status, count]) => (
                  <span
                    key={status}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      status === 'draft' ? 'bg-[#2B36D9]/20 text-[#2B36D9]' :
                      status === 'review' ? 'bg-[#FF4808]/20 text-[#FF4808]' :
                      status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      status === 'scheduled' ? 'bg-[#00DAFF]/20 text-[#00DAFF]' :
                      status === 'published' ? 'bg-[#FF35F9]/20 text-[#FF35F9]' :
                      'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {status}: {count}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
