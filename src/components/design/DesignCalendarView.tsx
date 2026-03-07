import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import type { DesignTask } from '@/hooks/useDesignTasks';
import { format, isSameDay, parseISO } from 'date-fns';

interface Props {
  tasks: DesignTask[];
}

export function DesignCalendarView({ tasks }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const dueDates = tasks.map(t => parseISO(t.design_due_date));
  const tattooDates = tasks.filter(t => t.final_tattoo_date).map(t => parseISO(t.final_tattoo_date!));

  const tasksForDate = selectedDate
    ? tasks.filter(t =>
        isSameDay(parseISO(t.design_due_date), selectedDate) ||
        (t.final_tattoo_date && isSameDay(parseISO(t.final_tattoo_date), selectedDate))
      )
    : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
      <div className="bg-card rounded-lg border border-border p-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          modifiers={{
            dueDate: dueDates,
            tattooDate: tattooDates,
          }}
          modifiersClassNames={{
            dueDate: 'bg-amber-500/20 text-amber-700 font-bold',
            tattooDate: 'bg-emerald-500/20 text-emerald-700 font-bold',
          }}
        />
        <div className="mt-3 flex gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Design Due</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Tattoo Date</span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          {selectedDate ? format(selectedDate, 'dd MMM yyyy') : 'Select a date'}
        </h3>
        {tasksForDate.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tasks on this date.</p>
        ) : (
          tasksForDate.map(task => (
            <div key={task.id} className="bg-card border border-border rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{task.client_name}</p>
                <Badge variant="outline" className="text-[10px]">{task.design_status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Artist: {task.artist_name}</p>
              <div className="flex gap-2 text-[10px]">
                {isSameDay(parseISO(task.design_due_date), selectedDate!) && (
                  <span className="text-amber-600">📐 Design Due</span>
                )}
                {task.final_tattoo_date && isSameDay(parseISO(task.final_tattoo_date), selectedDate!) && (
                  <span className="text-emerald-600">🎨 Tattoo Day</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
