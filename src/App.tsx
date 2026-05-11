import { useState } from 'react';
import { TabNav } from './components/TabNav';
import type { Tool } from './components/TabNav';
import { KeywordCheckerPage } from './pages/KeywordCheckerPage';
import { HeadingDuplicatesPage } from './pages/HeadingDuplicatesPage';
import { StructureComparePage } from './pages/StructureComparePage';

function App() {
  const [activeTool, setActiveTool] = useState<Tool>('keyword');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-900">SEO Tools</h1>
          <TabNav active={activeTool} onChange={setActiveTool} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        {activeTool === 'keyword' && <KeywordCheckerPage />}
        {activeTool === 'heading-duplicates' && <HeadingDuplicatesPage />}
        {activeTool === 'structure-compare' && <StructureComparePage />}
      </main>
    </div>
  );
}

export default App;
