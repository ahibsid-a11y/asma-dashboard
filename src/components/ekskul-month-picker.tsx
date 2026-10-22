import { Checkbox } from '@/components/ui/checkbox';

export function EkskulMonthPicker({ options, selected, onChange, disabled = [] }: {
  options: { value: string; label: string }[];
  selected: string[];
  disabled?: string[];
  onChange: (values: string[]) => void;
}) {
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
    {options.map(option => <label key={option.value} className="flex min-w-0 items-center gap-2 text-xs text-foreground">
      <Checkbox checked={selected.includes(option.value)} disabled={disabled.includes(option.value)}
        onCheckedChange={checked => onChange(checked ? [...selected, option.value] : selected.filter(value => value !== option.value))} />
      <span>{option.label}</span>
    </label>)}
  </div>;
}