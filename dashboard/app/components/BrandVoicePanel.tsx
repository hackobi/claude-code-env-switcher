'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Loader2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { BrandVoiceProfile } from '../types/content';

export function BrandVoicePanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<BrandVoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/brand-voice');
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to load brand voice profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#0D0E13] border border-white/10 border-r-0 rounded-l-lg p-2 hover:bg-white/5 transition-colors"
      >
        <ChevronLeft size={20} className="text-gray-400" />
      </button>
    );
  }

  return (
    <div className="w-80 bg-[#0D0E13] border-l border-white/10 p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold text-white">Brand Voice</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProfile}
            className="p-1 text-gray-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 text-gray-400 hover:text-white"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#2B36D9] animate-spin" />
        </div>
      ) : !profile ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm mb-4">No brand voice profile found</p>
          <p className="text-xs text-gray-500">
            Run <code className="bg-white/5 px-1 py-0.5 rounded">/sc:marketing learn</code> to generate one
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Samples" value={profile.samplesAnalyzed} />
            <Stat label="Last Updated" value={formatDate(profile.lastUpdated)} />
            <Stat label="Twitter" value={profile.sources.twitter} />
            <Stat label="Paragraph" value={profile.sources.paragraph} />
          </div>

          {/* Voice Meters */}
          <Section title="Voice Characteristics">
            <Meter label="Technical" value={profile.voiceCharacteristics.technicalLevel} />
            <Meter label="Casual" value={profile.voiceCharacteristics.casualness} />
            <Meter label="Enthusiasm" value={profile.voiceCharacteristics.enthusiasm} />
          </Section>

          {/* Tone */}
          <Section title="Tone">
            <div className="flex flex-wrap gap-1">
              {profile.voiceCharacteristics.tone.map((t, i) => (
                <Tag key={i}>{t}</Tag>
              ))}
            </div>
          </Section>

          {/* Common Phrases */}
          <Section title="Use These Phrases">
            <ul className="space-y-1">
              {profile.voiceCharacteristics.commonPhrases.slice(0, 5).map((phrase, i) => (
                <li key={i} className="text-xs text-green-400 flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-300">{phrase}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Avoided Phrases */}
          <Section title="Avoid These">
            <ul className="space-y-1">
              {profile.voiceCharacteristics.avoidedPhrases.slice(0, 5).map((phrase, i) => (
                <li key={i} className="text-xs text-red-400 flex items-start gap-2">
                  <span className="text-red-500">✗</span>
                  <span className="text-gray-300">{phrase}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-md p-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">{percent}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#2B36D9] rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-[#2B36D9]/10 text-[#2B36D9] border border-[#2B36D9]/20">
      {children}
    </span>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 168) return `${Math.round(diffHours / 24)}d ago`;
  return date.toLocaleDateString();
}
