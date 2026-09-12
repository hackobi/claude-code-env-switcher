'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, PlayIcon, StopIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface PipelineStatus {
  running: boolean;
  step: number;
  stepName: string;
  subStep?: string;
  progress?: number;
  error?: string;
  pid?: number;
}

type PipelineMode = 'run' | 'dry-run';

export function PipelineControls() {
  const [selectedMode, setSelectedMode] = useState<PipelineMode>('run');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [status, setStatus] = useState<PipelineStatus>({
    running: false,
    step: 0,
    stepName: 'Idle',
  });
  const [isExecuting, setIsExecuting] = useState(false);

  // Connect to Server-Sent Events for real-time status
  useEffect(() => {
    const eventSource = new EventSource('/api/pipeline/status');
    
    eventSource.onmessage = (event) => {
      try {
        const newStatus = JSON.parse(event.data);
        setStatus(newStatus);
        setIsExecuting(newStatus.running);
      } catch (error) {
        console.error('Error parsing status update:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: selectedMode }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start pipeline');
      }

      console.log('Pipeline started:', result);
    } catch (error) {
      console.error('Error starting pipeline:', error);
      setIsExecuting(false);
      // You could show a toast notification here
    }
  };

  const getStatusIcon = () => {
    if (status.error) {
      return <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />;
    }
    if (status.running) {
      return <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />;
    }
    if (status.step === 5 && status.stepName === 'Completed') {
      return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
    }
    return <PlayIcon className="w-4 h-4 text-gray-400" />;
  };

  const getStatusColor = () => {
    if (status.error) return 'text-red-400';
    if (status.running) return 'text-blue-400';
    if (status.step === 5) return 'text-green-400';
    return 'text-gray-400';
  };

  const getProgressPercentage = () => {
    return status.progress || 0;
  };

  const modes = [
    { value: 'run' as PipelineMode, label: 'Run Pipeline', description: 'Execute full pipeline and send to Typefully' },
    { value: 'dry-run' as PipelineMode, label: 'Dry Run', description: 'Test pipeline without sending to Typefully' },
  ];

  const selectedModeData = modes.find(mode => mode.value === selectedMode);

  return (
    <div className="flex items-center gap-3">
      {/* Status Indicator */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-800/50 ${getStatusColor()}`}>
        {getStatusIcon()}
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {status.stepName}
          </span>
          {status.subStep && (
            <span className="text-xs opacity-70">
              {status.subStep}
            </span>
          )}
        </div>
        {status.running && status.progress !== undefined && (
          <div className="ml-2 w-16 bg-gray-700 rounded-full h-1">
            <div
              className="bg-blue-400 h-1 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        )}
      </div>

      {/* Pipeline Controls */}
      <div className="relative">
        {/* Mode Selector Dropdown */}
        <div className="flex items-center gap-0">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-l-md bg-[#2B36D9] text-white text-sm font-medium hover:bg-[#2B36D9]/90 transition-colors disabled:opacity-50"
            disabled={isExecuting}
          >
            {selectedModeData?.label}
            <ChevronDownIcon className="w-4 h-4" />
          </button>

          {/* Execute Button */}
          <button
            type="button"
            onClick={handleExecute}
            disabled={isExecuting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-r-md bg-[#2B36D9] text-white text-sm font-medium hover:bg-[#2B36D9]/90 transition-colors disabled:opacity-50 border-l border-white/20"
          >
            {isExecuting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4" />
                Execute
              </>
            )}
          </button>
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-80 bg-[#1a1b23] border border-white/10 rounded-md shadow-lg z-50">
            <div className="p-1">
              {modes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => {
                    setSelectedMode(mode.value);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedMode === mode.value
                      ? 'bg-[#2B36D9]/20 text-[#2B36D9]'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{mode.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Click outside to close */}
        {isDropdownOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>
    </div>
  );
}