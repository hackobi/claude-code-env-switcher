'use client';

import { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronUp, Image, Send, Edit2, XCircle, RotateCcw, CheckCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { ContentItem, CONTENT_TYPE_CONFIG, BRAND_SCORE_THRESHOLD } from '../types/content';

interface ContentCardProps {
  item: ContentItem;
  index: number;
  isGeneratingImage?: boolean;
  onEdit?: (item: ContentItem) => void;
  onReject?: (id: string) => void;
  onSchedule?: (item: ContentItem) => void;
  onGenerateImage?: (item: ContentItem) => void;
  onRestore?: (id: string) => void;
}

export function ContentCard({ item, index, isGeneratingImage, onEdit, onReject, onSchedule, onGenerateImage, onRestore }: ContentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = CONTENT_TYPE_CONFIG[item.type];

  const passesThreshold = (item.brandScore ?? 0) >= BRAND_SCORE_THRESHOLD;
  const scoreColor = item.brandScore
    ? passesThreshold ? 'bg-green-500/10 text-green-400 border-green-500/20'
    : item.brandScore >= 60 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    : 'bg-red-500/10 text-red-400 border-red-500/20'
    : 'bg-gray-500/10 text-gray-400 border-gray-500/20';

  // Use sourceContext.type for more accurate labeling when available
  const contextType = item.sourceContext?.type;
  const sourceLabel = contextType === 'influencer_tweet'
    ? `@${item.sourceContext?.influencerUsername || 'Influencer'}`
    : contextType === 'trend'
    ? 'Trending Topic'
    : contextType === 'linear_task'
    ? 'Linear Task'
    : {
        linear: 'Linear Task',
        trend: 'Trending Topic',
        'sdk-update': 'SDK Update',
        manual: 'Manual',
      }[item.source] || item.source;

  const displayContent = item.type === 'thread' && item.threadParts
    ? item.threadParts[0]
    : item.type === 'article' && item.articleBody
    ? item.articleBody.slice(0, 200) + '...'
    : item.content;

  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={clsx(
            'bg-[#0D0E13] border border-white/5 rounded-lg p-4 mb-3 transition-all',
            snapshot.isDragging && 'shadow-xl shadow-[#2B36D9]/20 border-[#2B36D9]/50'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">{typeConfig.icon}</span>
              <span className="text-xs font-medium text-gray-400">{sourceLabel}</span>
              {item.brandScore !== undefined && (
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded border flex items-center gap-1', scoreColor)}>
                  {passesThreshold ? (
                    <CheckCircle size={10} className="text-green-400" />
                  ) : (
                    <AlertCircle size={10} className="text-yellow-400" />
                  )}
                  {item.brandScore}%
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Brand Score Progress Bar */}
          {item.brandScore !== undefined && (
            <div className="mb-3">
              <div className="relative h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'absolute left-0 top-0 h-full rounded-full transition-all',
                    passesThreshold ? 'bg-green-500' : item.brandScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${item.brandScore}%` }}
                />
                {/* Threshold marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-white/50"
                  style={{ left: `${BRAND_SCORE_THRESHOLD}%` }}
                />
              </div>
              {!passesThreshold && (
                <div className="text-[10px] text-yellow-400/70 mt-1">
                  Needs {BRAND_SCORE_THRESHOLD - item.brandScore}% more to pass
                </div>
              )}
            </div>
          )}

          {/* Content Preview */}
          <div className="text-sm text-white/90 leading-relaxed mb-3 whitespace-pre-wrap line-clamp-3">
            {displayContent}
          </div>

          {/* Image Preview / Loading State */}
          {(item.imageUrl || isGeneratingImage) && (
            <div className="mb-3 rounded-md overflow-hidden border border-white/5 relative">
              {isGeneratingImage ? (
                <div className="w-full aspect-video bg-black/50 flex flex-col items-center justify-center gap-3">
                  <Loader2 size={32} className="text-[#2B36D9] animate-spin" />
                  <span className="text-xs text-gray-400">Generating image...</span>
                  <span className="text-[10px] text-gray-500">This may take 15-30 seconds</span>
                </div>
              ) : (
                <>
                  <img
                    src={item.imageUrl}
                    alt="Generated"
                    className="w-full aspect-video object-contain bg-black/50"
                  />
                  {/* Regenerate button overlay */}
                  <button
                    onClick={() => onGenerateImage?.(item)}
                    className="absolute top-2 right-2 p-1.5 rounded bg-black/60 text-gray-300 hover:bg-black/80 hover:text-white transition-colors"
                    title="Regenerate image"
                  >
                    <RefreshCw size={14} />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Thread Expansion */}
          {item.type === 'thread' && item.threadParts && item.threadParts.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-[#2B36D9] hover:text-[#2B36D9]/80 mb-3"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? 'Collapse' : `Show ${item.threadParts.length - 1} more tweets`}
            </button>
          )}

          {expanded && item.threadParts && (
            <div className="space-y-2 mb-3 pl-3 border-l-2 border-white/10">
              {item.threadParts.slice(1).map((part, i) => (
                <div key={i} className="text-xs text-gray-400 whitespace-pre-wrap">
                  {part}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-white/5">
            {item.status === 'rejected' ? (
              // Rejected items: show restore button to move back to draft
              <button
                onClick={() => onRestore?.(item.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-500/10 text-green-400 rounded hover:bg-green-500/20"
              >
                <RotateCcw size={12} />
                Restore to Draft
              </button>
            ) : (
              <>
                {item.status === 'review' && (
                  <button
                    onClick={() => onSchedule?.(item)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[#2B36D9] text-white rounded hover:bg-[#2B36D9]/80"
                  >
                    <Send size={12} />
                    Schedule
                  </button>
                )}
                {!item.imageUrl && !isGeneratingImage && (
                  <button
                    onClick={() => onGenerateImage?.(item)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white/5 text-gray-300 rounded hover:bg-white/10"
                  >
                    <Image size={12} />
                    Image
                  </button>
                )}
                {isGeneratingImage && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#2B36D9]">
                    <Loader2 size={12} className="animate-spin" />
                    Generating...
                  </span>
                )}
              </>
            )}
            <button
              onClick={() => onEdit?.(item)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white/5 text-gray-300 rounded hover:bg-white/10"
            >
              <Edit2 size={12} />
            </button>
            {item.status !== 'rejected' && item.status !== 'published' && (
              <button
                onClick={() => onReject?.(item.id)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 rounded hover:text-red-400 hover:bg-red-500/10 ml-auto"
                title="Reject - move to rejected column"
              >
                <XCircle size={12} />
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
