export type Tool = 'keyword' | 'heading-duplicates' | 'structure-compare';

interface Tab {
  id: Tool;
  label: string;
}

const TABS: Tab[] = [
  { id: 'keyword', label: 'Keyword Checker' },
  { id: 'heading-duplicates', label: 'Heading Duplicates' },
  { id: 'structure-compare', label: 'Structure Compare' },
];

interface TabNavProps {
  active: Tool;
  onChange: (tool: Tool) => void;
}

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav className="flex gap-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={[
            'rounded-md px-4 py-2 text-sm font-medium transition',
            active === tab.id
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
