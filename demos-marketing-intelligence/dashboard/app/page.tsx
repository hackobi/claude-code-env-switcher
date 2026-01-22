import { KanbanBoard } from './components/KanbanBoard';
import { BrandVoicePanel } from './components/BrandVoicePanel';
import { StatsPanel } from './components/StatsPanel';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#010109] flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0D0E13] flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">Demos Marketing Intelligence</h1>
              <p className="text-sm text-gray-400 mt-1">Content Pipeline • Kanban View</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#2B36D9]/10 text-[#2B36D9] text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-[#2B36D9] animate-pulse" />
                Live
              </span>
              <a
                href="https://typefully.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-md bg-[#FF4808] text-white text-sm font-medium hover:bg-[#FF4808]/90 transition-colors"
              >
                Open Typefully
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Kanban Board */}
        <main className="flex-1 p-6 overflow-hidden">
          <KanbanBoard />
        </main>

        {/* Brand Voice Panel */}
        <BrandVoicePanel />
      </div>

      {/* Stats Panel */}
      <StatsPanel />
    </div>
  );
}
