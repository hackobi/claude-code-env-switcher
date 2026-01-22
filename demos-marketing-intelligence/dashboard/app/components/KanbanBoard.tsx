'use client';

import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { RefreshCw, Loader2, Plus, Download, CloudDownload } from 'lucide-react';
import clsx from 'clsx';
import { ContentItem, ContentStatus, COLUMN_CONFIG, BRAND_SCORE_THRESHOLD } from '../types/content';
import { ContentCard } from './ContentCard';
import { EditModal } from './EditModal';

interface KanbanBoardProps {
  initialItems?: ContentItem[];
}

const COLUMN_ORDER: ContentStatus[] = ['draft', 'review', 'scheduled', 'published', 'rejected'];

export function KanbanBoard({ initialItems = [] }: KanbanBoardProps) {
  const [items, setItems] = useState<ContentItem[]>(initialItems);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [generatingImageIds, setGeneratingImageIds] = useState<Set<string>>(new Set());
  const [syncingTypefully, setSyncingTypefully] = useState(false);
  const [brandThreshold, setBrandThreshold] = useState(() => {
    // Load from localStorage or use default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('brandThreshold');
      return saved ? parseInt(saved) : BRAND_SCORE_THRESHOLD;
    }
    return BRAND_SCORE_THRESHOLD;
  });
  const [isDraggingThreshold, setIsDraggingThreshold] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const response = await fetch(`/api/content?threshold=${brandThreshold}`);
      if (!response.ok) throw new Error('Failed to fetch content');
      const data = await response.json();
      setItems(data.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, [brandThreshold]);

  useEffect(() => {
    fetchItems();
    // Poll every 5 seconds for updates
    const interval = setInterval(fetchItems, 5000);
    return () => clearInterval(interval);
  }, [fetchItems]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as ContentStatus;
    const itemIndex = items.findIndex(item => item.id === draggableId);
    if (itemIndex === -1) return;

    const item = items[itemIndex];

    // If moving to "scheduled", send to Typefully first
    if (newStatus === 'scheduled' && source.droppableId !== 'scheduled') {
      // Optimistic update
      const updatedItems = [...items];
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: newStatus };
      setItems(updatedItems);

      try {
        // Send to Typefully
        const scheduleResponse = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: draggableId }),
        });

        if (!scheduleResponse.ok) {
          const errorData = await scheduleResponse.json();
          throw new Error(errorData.error || 'Failed to schedule to Typefully');
        }

        const scheduleResult = await scheduleResponse.json();

        // Update with Typefully ID
        setItems(prev =>
          prev.map(i =>
            i.id === draggableId
              ? { ...i, status: 'scheduled' as ContentStatus, typefullyId: scheduleResult.typefullyId }
              : i
          )
        );
      } catch (err) {
        // Revert on error
        fetchItems();
        setError(err instanceof Error ? err.message : 'Failed to schedule to Typefully. Check API key.');
        setTimeout(() => setError(null), 5000);
      }
      return;
    }

    // Standard status update for other columns
    const updatedItems = [...items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: newStatus };
    setItems(updatedItems);

    // Persist to server
    try {
      const response = await fetch('/api/content/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draggableId, status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');
    } catch (err) {
      // Revert on error
      fetchItems();
      setError('Failed to update status. Reverting...');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Move this content to rejected? You can review and improve it later.')) return;

    // Optimistic update to rejected status
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'rejected' as ContentStatus } : item
    ));

    try {
      const response = await fetch('/api/content/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected' }),
      });

      if (!response.ok) throw new Error('Failed to reject');
    } catch (err) {
      fetchItems();
      setError('Failed to reject. Reverting...');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRestore = async (id: string) => {
    // Optimistic update back to draft status
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'draft' as ContentStatus } : item
    ));

    try {
      const response = await fetch('/api/content/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'draft' }),
      });

      if (!response.ok) throw new Error('Failed to restore');
    } catch (err) {
      fetchItems();
      setError('Failed to restore. Reverting...');
      setTimeout(() => setError(null), 3000);
    }
  };

  const getColumnItems = (status: ContentStatus) => {
    return items.filter(item => item.status === status);
  };

  const handleEdit = (item: ContentItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (updatedItem: ContentItem) => {
    try {
      // Check if this is a new item (temporary ID) or existing item
      const isNewItem = updatedItem.id.startsWith('draft-');

      const response = await fetch('/api/content', {
        method: isNewItem ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
      });

      if (!response.ok) throw new Error('Failed to save');

      const result = await response.json();

      // Update local state
      if (isNewItem) {
        // Add the new item with the real ID from the database
        const newItem = result.item || { ...updatedItem, id: result.id };
        setItems(prev => [newItem, ...prev]);
      } else {
        // Update existing item
        setItems(prev =>
          prev.map(item => (item.id === updatedItem.id ? updatedItem : item))
        );
      }
    } catch (err) {
      throw err;
    }
  };

  const handleSchedule = async (item: ContentItem) => {
    if (!confirm(`Schedule this ${item.type} to Typefully?`)) return;

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });

      if (!response.ok) throw new Error('Failed to schedule');

      const result = await response.json();

      // Update local state
      setItems(prev =>
        prev.map(i =>
          i.id === item.id
            ? { ...i, status: 'scheduled' as ContentStatus, typefullyId: result.typefullyId }
            : i
        )
      );
    } catch (err) {
      setError('Failed to schedule. Check API key.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleGenerateImage = async (item: ContentItem) => {
    // Skip confirmation if regenerating - user clicked the regenerate button intentionally
    const isRegenerate = !!item.imageUrl;
    if (!isRegenerate && !confirm('Generate an image for this content?')) return;
    if (isRegenerate && !confirm('Regenerate image? This will replace the current one.')) return;

    // Add to generating set
    setGeneratingImageIds(prev => new Set(prev).add(item.id));

    try {
      setError(null);
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          prompt: item.content?.slice(0, 200) || 'Demos Network cross-chain technology',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate image');

      const result = await response.json();

      // Update local state
      setItems(prev =>
        prev.map(i =>
          i.id === item.id ? { ...i, imageUrl: result.imageUrl } : i
        )
      );
    } catch (err) {
      setError('Failed to generate image. Check Google AI or OpenAI API key.');
      setTimeout(() => setError(null), 3000);
    } finally {
      // Remove from generating set
      setGeneratingImageIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleAddDraft = () => {
    const newItem: ContentItem = {
      id: `draft-${Date.now()}`,
      type: 'tweet',
      status: 'draft',
      content: '',
      source: 'manual',
      createdAt: new Date().toISOString(),
    };
    setEditingItem(newItem);
    setIsEditModalOpen(true);
  };

  const handleImportIdeas = async () => {
    if (importing) return;

    setImporting(true);
    setError(null);

    try {
      const response = await fetch('/api/import-ideas', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to import ideas');
      }

      const result = await response.json();
      console.log('Import result:', result);

      // Refresh the content list
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import ideas');
      setTimeout(() => setError(null), 5000);
    } finally {
      setImporting(false);
    }
  };

  const handleTypefullySync = async () => {
    if (syncingTypefully) return;

    setSyncingTypefully(true);
    setError(null);

    try {
      const response = await fetch('/api/typefully-sync', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to sync with Typefully');
      }

      const result = await response.json();
      console.log('Typefully sync result:', result);

      // Refresh the content list to show updated statuses
      await fetchItems();

      // Show success message if items were updated
      if (result.synced > 0 || result.newlyPublished > 0) {
        console.log(`Synced ${result.synced} items, ${result.newlyPublished} newly published`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync with Typefully');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSyncingTypefully(false);
    }
  };

  const handleThresholdMouseDown = (e: React.MouseEvent) => {
    const sliderRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setIsDraggingThreshold(true);
    
    const updateThreshold = (clientX: number) => {
      const x = clientX - sliderRect.left;
      const percentage = Math.max(0, Math.min(100, (x / sliderRect.width) * 100));
      const newThreshold = Math.round(percentage);
      setBrandThreshold(newThreshold);
      localStorage.setItem('brandThreshold', newThreshold.toString());
    };

    updateThreshold(e.clientX);

    const handleMouseMove = (e: MouseEvent) => updateThreshold(e.clientX);
    const handleMouseUp = () => {
      setIsDraggingThreshold(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#2B36D9] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Brand Score Threshold Slider */}
      <div className="mb-4 p-3 bg-white/[0.02] border border-white/5 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Brand Score Threshold</span>
          <span className="text-xs font-medium text-[#2B36D9]">{brandThreshold}% required to pass</span>
        </div>
        <div 
          className="relative h-4 bg-white/5 rounded-full overflow-hidden cursor-pointer select-none"
          onMouseDown={handleThresholdMouseDown}
        >
          <div
            className="absolute left-0 top-1 h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-30"
            style={{ width: '100%' }}
          />
          <div
            className={`absolute top-0 h-full w-1 rounded-full transition-colors ${
              isDraggingThreshold ? 'bg-[#2B36D9]' : 'bg-white hover:bg-gray-200'
            }`}
            style={{ left: `${brandThreshold}%`, transform: 'translateX(-50%)' }}
          />
          {/* Click target area */}
          <div className="absolute inset-0" />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-500">
          <span>0%</span>
          <span className="text-green-400">{brandThreshold}%+</span>
          <span>100%</span>
        </div>
        <div className="text-center mt-1">
          <span className="text-[10px] text-gray-400">
            {isDraggingThreshold ? 'Drag to adjust threshold' : 'Click or drag to adjust threshold'}
          </span>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={handleAddDraft}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[#2B36D9] rounded-md hover:bg-[#2B36D9]/80 transition-colors"
          >
            <Plus size={14} />
            Add Draft
          </button>
          <button
            onClick={handleImportIdeas}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[#FF4808] rounded-md hover:bg-[#FF4808]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {importing ? 'Importing...' : 'Import Ideas'}
          </button>
          <button
            onClick={handleTypefullySync}
            disabled={syncingTypefully}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[#00DAFF] rounded-md hover:bg-[#00DAFF]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sync status from Typefully"
          >
            {syncingTypefully ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CloudDownload size={14} />
            )}
            {syncingTypefully ? 'Syncing...' : 'Sync Typefully'}
          </button>
        </div>
        <button
          onClick={fetchItems}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-white/5 rounded-md hover:bg-white/10 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Kanban Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-3 h-[calc(100vh-320px)] overflow-hidden">
          {COLUMN_ORDER.map((status) => {
            const config = COLUMN_CONFIG[status];
            const columnItems = getColumnItems(status);

            return (
              <div
                key={status}
                className={clsx(
                  "flex flex-col bg-white/[0.02] rounded-lg border overflow-hidden",
                  status === 'rejected' ? 'border-red-500/20' : 'border-white/5'
                )}
              >
                {/* Column Header */}
                <div className={clsx(
                  "flex items-center justify-between px-3 py-2 border-b bg-white/[0.02]",
                  status === 'rejected' ? 'border-red-500/20' : 'border-white/5'
                )}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{config.icon}</span>
                    <span className="font-medium text-white text-sm">{config.label}</span>
                  </div>
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {columnItems.length}
                  </span>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={clsx(
                        'flex-1 p-2 overflow-y-auto transition-colors',
                        snapshot.isDraggingOver && 'bg-[#2B36D9]/5'
                      )}
                    >
                      {columnItems.length === 0 ? (
                        <div className="text-center text-gray-500 text-xs py-6">
                          {status === 'rejected' ? 'Rejected items appear here' : 'No items'}
                        </div>
                      ) : (
                        columnItems.map((item, index) => (
                          <ContentCard
                            key={item.id}
                            item={item}
                            index={index}
                            isGeneratingImage={generatingImageIds.has(item.id)}
                            onEdit={handleEdit}
                            onReject={handleReject}
                            onSchedule={handleSchedule}
                            onGenerateImage={handleGenerateImage}
                            onRestore={handleRestore}
                          />
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Edit Modal */}
      <EditModal
        item={editingItem}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
