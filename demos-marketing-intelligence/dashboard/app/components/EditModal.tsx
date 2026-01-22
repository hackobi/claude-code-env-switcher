'use client';

import { useState, useEffect } from 'react';
import { X, Save, Loader2, ChevronDown, ChevronUp, MessageSquare, Lightbulb, Tag, Type, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { ContentItem, ContentType, ContentStatus, CONTENT_TYPE_CONFIG, SourceContext } from '../types/content';

interface EditModalProps {
  item: ContentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: ContentItem) => Promise<void>;
}

export function EditModal({ item, isOpen, onClose, onSave }: EditModalProps) {
  const [editedItem, setEditedItem] = useState<ContentItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(true); // Default expanded
  const [customTagline, setCustomTagline] = useState('');
  const [regeneratingOverlay, setRegeneratingOverlay] = useState(false);

  useEffect(() => {
    if (item) {
      setEditedItem({ ...item });
      setCustomTagline(''); // Reset tagline when opening a new item
    }
  }, [item]);

  const handleRegenerateOverlay = async () => {
    if (!editedItem?.imageUrl || !customTagline.trim()) return;

    setRegeneratingOverlay(true);
    setError(null);

    try {
      // Use regenerate-overlay endpoint - this only updates the text overlay,
      // not the entire image
      const response = await fetch('/api/regenerate-overlay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editedItem.id,
          imageUrl: editedItem.imageUrl,
          tagline: customTagline.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update tagline');
      }

      const result = await response.json();
      setEditedItem({ ...editedItem, imageUrl: result.imageUrl });
      setCustomTagline(''); // Clear after successful update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tagline');
    } finally {
      setRegeneratingOverlay(false);
    }
  };

  if (!isOpen || !editedItem) return null;

  const handleSave = async () => {
    if (!editedItem) return;

    setSaving(true);
    setError(null);

    try {
      await onSave(editedItem);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const typeConfig = CONTENT_TYPE_CONFIG[editedItem.type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[#0D0E13] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-xl">{typeConfig.icon}</span>
            <h2 className="text-lg font-semibold text-white">Edit {typeConfig.label}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Source Context - shows original trigger info for editing reference */}
          {(editedItem.sourceContext || editedItem.sourceText) && (
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowContext(!showContext)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Lightbulb size={16} className="text-yellow-500" />
                  Original Context
                </div>
                {showContext ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
              </button>

              {showContext && (
                <div className="px-4 py-3 space-y-3 bg-white/[0.01]">
                  {/* Source text label */}
                  {editedItem.sourceText && (
                    <div className="text-xs text-gray-400">
                      {editedItem.sourceText}
                    </div>
                  )}

                  {/* Influencer tweet info */}
                  {editedItem.sourceContext?.type === 'influencer_tweet' && editedItem.sourceContext?.influencerUsername && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
                        <MessageSquare size={12} />
                        Influencer Tweet
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-[#2B36D9] font-medium">
                          @{editedItem.sourceContext.influencerUsername}
                        </span>
                        {editedItem.sourceContext.engagement && (
                          <span className="text-xs text-gray-500">
                            {editedItem.sourceContext.engagement.likes.toLocaleString()} likes · {editedItem.sourceContext.engagement.retweets.toLocaleString()} RTs
                          </span>
                        )}
                      </div>
                      {editedItem.sourceContext.sampleTweets?.[0] && (
                        <div className="text-sm text-white/80 pl-3 border-l-2 border-[#2B36D9]/30 leading-relaxed">
                          "{editedItem.sourceContext.sampleTweets[0]}"
                        </div>
                      )}
                      {editedItem.sourceContext.influencerTweetUrl && (
                        <a
                          href={editedItem.sourceContext.influencerTweetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-xs text-[#2B36D9] hover:underline"
                        >
                          View original tweet →
                        </a>
                      )}
                    </div>
                  )}

                  {/* Trend topic */}
                  {editedItem.sourceContext?.topic && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1">
                        <Tag size={12} />
                        Trending Topic
                      </div>
                      <div className="text-sm text-white/90">
                        {editedItem.sourceContext.topic}
                      </div>
                    </div>
                  )}

                  {/* Relevance to Web3 */}
                  {editedItem.sourceContext?.relevanceToWeb3 && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">Why relevant to Demos</div>
                      <div className="text-sm text-white/80">
                        {editedItem.sourceContext.relevanceToWeb3}
                      </div>
                    </div>
                  )}

                  {/* Sample tweets */}
                  {editedItem.sourceContext?.sampleTweets && editedItem.sourceContext.sampleTweets.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-2">
                        <MessageSquare size={12} />
                        Sample Tweets ({editedItem.sourceContext.sampleTweets.length})
                      </div>
                      <div className="space-y-2">
                        {editedItem.sourceContext.sampleTweets.map((tweet, i) => (
                          <div
                            key={i}
                            className="text-xs text-gray-400 pl-3 border-l-2 border-white/10 leading-relaxed"
                          >
                            "{tweet}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Linear task info */}
                  {editedItem.sourceContext?.taskTitle && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">Linear Task</div>
                      <div className="text-sm text-white/90 font-medium">
                        {editedItem.sourceContext.taskTitle}
                      </div>
                      {editedItem.sourceContext.taskDescription && (
                        <div className="text-xs text-gray-400 mt-1">
                          {editedItem.sourceContext.taskDescription}
                        </div>
                      )}
                      {editedItem.sourceContext.taskLabels && editedItem.sourceContext.taskLabels.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {editedItem.sourceContext.taskLabels.map((label, i) => (
                            <span key={i} className="px-2 py-0.5 text-[10px] bg-white/5 rounded text-gray-400">
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI reasoning */}
                  {editedItem.sourceContext?.reasoning && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">AI Reasoning</div>
                      <div className="text-xs text-gray-500 italic">
                        {editedItem.sourceContext.reasoning}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Content Type
            </label>
            <select
              value={editedItem.type}
              onChange={(e) => setEditedItem({ ...editedItem, type: e.target.value as ContentType })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#2B36D9]"
            >
              <option value="tweet">Tweet</option>
              <option value="thread">Thread</option>
              <option value="article">Article</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>

          {/* Status Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              value={editedItem.status}
              onChange={(e) => setEditedItem({ ...editedItem, status: e.target.value as ContentStatus })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#2B36D9]"
            >
              <option value="idea">Idea</option>
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Main Content */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Content
              {editedItem.type === 'tweet' && (
                <span className="ml-2 text-xs text-gray-500">
                  ({editedItem.content?.length || 0}/280)
                </span>
              )}
            </label>
            <textarea
              value={editedItem.content || ''}
              onChange={(e) => setEditedItem({ ...editedItem, content: e.target.value })}
              maxLength={editedItem.type === 'tweet' ? 280 : undefined}
              rows={editedItem.type === 'tweet' ? 4 : 6}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#2B36D9] resize-none"
              placeholder="Write your content..."
            />
          </div>

          {/* Thread Parts (for threads) */}
          {editedItem.type === 'thread' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Thread Parts
              </label>
              <div className="space-y-2">
                {(editedItem.threadParts || ['']).map((part, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="flex items-center justify-center w-8 h-8 text-xs text-gray-500 bg-white/5 rounded">
                      {index + 1}
                    </span>
                    <textarea
                      value={part}
                      onChange={(e) => {
                        const newParts = [...(editedItem.threadParts || [''])];
                        newParts[index] = e.target.value;
                        setEditedItem({ ...editedItem, threadParts: newParts });
                      }}
                      maxLength={280}
                      rows={2}
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#2B36D9] resize-none text-sm"
                      placeholder={`Tweet ${index + 1}...`}
                    />
                    {(editedItem.threadParts?.length || 1) > 1 && (
                      <button
                        onClick={() => {
                          const newParts = [...(editedItem.threadParts || [])];
                          newParts.splice(index, 1);
                          setEditedItem({ ...editedItem, threadParts: newParts });
                        }}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newParts = [...(editedItem.threadParts || ['']), ''];
                    setEditedItem({ ...editedItem, threadParts: newParts });
                  }}
                  className="w-full py-2 text-sm text-[#2B36D9] hover:bg-[#2B36D9]/10 border border-dashed border-white/10 rounded-lg transition-colors"
                >
                  + Add Tweet
                </button>
              </div>
            </div>
          )}

          {/* Article Body (for articles) */}
          {editedItem.type === 'article' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Article Body (Markdown)
              </label>
              <textarea
                value={editedItem.articleBody || ''}
                onChange={(e) => setEditedItem({ ...editedItem, articleBody: e.target.value })}
                rows={10}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#2B36D9] resize-none font-mono text-sm"
                placeholder="# Article Title

Write your article content in markdown..."
              />
            </div>
          )}

          {/* Brand Score (read-only) */}
          {editedItem.brandScore !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Brand Score
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all',
                      editedItem.brandScore >= 80 ? 'bg-green-500' :
                      editedItem.brandScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    )}
                    style={{ width: `${editedItem.brandScore}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-white">
                  {editedItem.brandScore}%
                </span>
              </div>
            </div>
          )}

          {/* Image URL */}
          {editedItem.imageUrl && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Generated Image
              </label>
              <div className="rounded-lg overflow-hidden border border-white/10">
                <img
                  src={editedItem.imageUrl}
                  alt="Generated"
                  className="w-full h-48 object-contain bg-black/50"
                />
              </div>

              {/* Tagline Editor */}
              <div className="p-3 bg-white/[0.02] border border-white/10 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Type size={14} />
                  Edit Image Tagline
                </div>
                <p className="text-xs text-gray-500">
                  Don't like the text on the image? Enter a new tagline and regenerate.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTagline}
                    onChange={(e) => setCustomTagline(e.target.value)}
                    placeholder="Enter new tagline (e.g., One Identity. Every Chain.)"
                    className="flex-1 px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#2B36D9]"
                    maxLength={60}
                  />
                  <button
                    onClick={handleRegenerateOverlay}
                    disabled={regeneratingOverlay || !customTagline.trim()}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[#FF4808] text-white rounded-lg hover:bg-[#FF4808]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {regeneratingOverlay ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    {regeneratingOverlay ? 'Regenerating...' : 'Update'}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500">
                  Note: This will generate a new image with the same visual style but your custom tagline.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#2B36D9] text-white rounded-lg hover:bg-[#2B36D9]/80 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
