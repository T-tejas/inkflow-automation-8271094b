import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TATTOO_STYLES, LEAD_SOURCES } from '@/types/lead';
import { CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AdminFilters, DateRange } from '@/hooks/useAdminLeads';

interface Props {
  filters: AdminFilters;
  onChange: (f: AdminFilters) => void;
}

export function RevenueFilters({ filters, onChange }: Props) {
  const setRange = (r: DateRange) => onChange({ ...filters, dateRange: r });

  const toggleItem = (key: 'styles' | 'sources', val: string) => {
    const arr = filters[key];
    onChange({
      ...filters,
      [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val],
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(['today', 'week', 'month', 'all', 'custom'] as DateRange[]).map(r => (
        <Button
          key={r}
          size="sm"
          variant={filters.dateRange === r ? 'default' : 'outline'}
          className="text-xs h-8"
          onClick={() => setRange(r)}
        >
          {r === 'today' ? 'Today' : r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : r === 'all' ? 'All Time' : 'Custom'}
        </Button>
      ))}

      {filters.dateRange === 'custom' && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <CalendarIcon className="h-3 w-3" />
                {filters.customFrom ? format(filters.customFrom, 'dd MMM') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.customFrom}
                onSelect={d => onChange({ ...filters, customFrom: d })}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <CalendarIcon className="h-3 w-3" />
                {filters.customTo ? format(filters.customTo, 'dd MMM') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.customTo}
                onSelect={d => onChange({ ...filters, customTo: d })}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </>
      )}

      <div className="h-6 w-px bg-border mx-1" />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            <Filter className="h-3 w-3" />
            Style {filters.styles.length > 0 && `(${filters.styles.length})`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="max-h-48 overflow-y-auto space-y-1">
            {TATTOO_STYLES.map(s => (
              <button
                key={s}
                onClick={() => toggleItem('styles', s)}
                className={cn(
                  'w-full text-left text-xs px-2 py-1.5 rounded transition-colors',
                  filters.styles.includes(s) ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
            <Filter className="h-3 w-3" />
            Source {filters.sources.length > 0 && `(${filters.sources.length})`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div className="space-y-1">
            {LEAD_SOURCES.map(s => (
              <button
                key={s}
                onClick={() => toggleItem('sources', s)}
                className={cn(
                  'w-full text-left text-xs px-2 py-1.5 rounded transition-colors',
                  filters.sources.includes(s) ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {(filters.styles.length > 0 || filters.sources.length > 0 || filters.dateRange === 'custom') && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange({ dateRange: 'month', styles: [], sources: [] })}
        >
          Reset
        </Button>
      )}
    </div>
  );
}
