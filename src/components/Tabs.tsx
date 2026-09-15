type Tab<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  tabs: Tab<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function Tabs<T extends string>({ label, tabs, value, onChange }: Props<T>) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          className={value === tab.value ? "tab is-active" : "tab"}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
