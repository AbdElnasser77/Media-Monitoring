import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Task, StatsSummary } from '../models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  protected readonly loading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tasks = signal<Task[]>([]);

  protected readonly selectedDate = signal<string>(this.toDateInputValue(new Date()));
  protected dayModel: string = this.selectedDate();

  protected readonly todaysTasks = computed(() => {
    const selectedDay = this.selectedDate(); // YYYY-MM-DD format
    return this.tasks().filter((t) => {
      // First try DayISO if available
      if (t.DayISO) {
        return t.DayISO.startsWith(selectedDay);
      }
      // Fallback: try to parse the Date field
      if (t.Date) {
        const parsed = this.parseDate(t.Date);
        if (parsed) {
          return parsed === selectedDay;
        }
      }
      // Fallback: try ScheduleDate if available
      if (t.ScheduleDate) {
        const parsed = this.parseDate(t.ScheduleDate);
        if (parsed) {
          return parsed === selectedDay;
        }
      }
      return false;
    });
  });

  protected readonly stats = computed<StatsSummary>(() => this.calculateStats(this.todaysTasks()));

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // Use data that's already loaded by APP_INITIALIZER
    if (this.api.isDataLoaded()) {
      const tasks = this.api.getCurrentTasks();
      this.tasks.set(tasks);
      this.loading.set(false);
      console.log('Loaded tasks from shared data:', tasks.length);
      console.log('Default filter date:', this.selectedDate());
      console.log('Filtered tasks on load:', this.todaysTasks().length);
      if (this.todaysTasks().length === 0 && tasks.length > 0) {
        console.log('Sample task dates:', tasks.slice(0, 3).map(t => ({ Date: t.Date, ScheduleDate: t.ScheduleDate, DayISO: t.DayISO })));
      }
    } else {
      // Fallback: wait for data to be loaded
      this.api.loadOnce().subscribe({
        next: (tasks) => {
          this.tasks.set(tasks);
          this.loading.set(false);
          console.log('Loaded tasks:', tasks.length);
          console.log('Default filter date:', this.selectedDate());
          console.log('Filtered tasks on load:', this.todaysTasks().length);
          if (this.todaysTasks().length === 0 && tasks.length > 0) {
            console.log('Sample task dates:', tasks.slice(0, 3).map(t => ({ Date: t.Date, ScheduleDate: t.ScheduleDate, DayISO: t.DayISO })));
          }
        },
        error: (err) => {
          this.error.set('Failed to load data');
          this.loading.set(false);
          console.error(err);
        }
      });
    }
  }

  protected applyDayFilter(): void {
    this.selectedDate.set(this.dayModel);
    console.log('Filtering by date:', this.dayModel);
    console.log('Total tasks:', this.tasks().length);
    console.log('Filtered tasks:', this.todaysTasks().length);
    if (this.todaysTasks().length > 0) {
      console.log('Sample task dates:', this.todaysTasks().slice(0, 3).map(t => ({ Date: t.Date, ScheduleDate: t.ScheduleDate, DayISO: t.DayISO })));
    }
  }

  protected trackByTask = (_: number, t: Task) => `${t.SubTask || t.MainTask || ''}|${t.Date || ''}|${t.AssignedTo || ''}`;

  private calculateStats(tasks: Task[]): StatsSummary {
    const total = tasks.length;
    const completed = tasks.filter((t) => ['Done', 'Completed'].includes(t.Status ?? '')).length;
    const inProgress = tasks.filter((t) => ['In Progress', 'Working'].includes(t.Status ?? '')).length;
    const pending = tasks.filter((t) => !t.Status || ['Pending', 'To Do'].includes(t.Status)).length;
    const avgProgress = tasks.reduce((sum, t) => sum + (parseInt(String(t.PercentComplete ?? 0)) || 0), 0) / (total || 1);
    const copyApproved = tasks.filter((t) => ['Yes', 'Approved'].includes(t.CopywriterApproval ?? '')).length;
    const creativeApproved = tasks.filter((t) => ['Yes', 'Approved'].includes(t.CreativeDirectorApproval ?? '')).length;
    const completionRate = total ? (completed / total) * 100 : 0;
    return { total, completed, inProgress, pending, avgProgress: +avgProgress.toFixed(1), copyApproved, creativeApproved, completionRate: +completionRate.toFixed(1) };
  }

  private toDateInputValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    return `${y}-${m}-${d}`;
  }

  private parseDate(dateStr: string): string | null {
    if (!dateStr) return null;
    // Try DD/MM/YYYY format
    const m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    // Try DD/MM/YY format
    const m2 = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
    if (m2) {
      const dd = m2[1].padStart(2, '0');
      const mm = m2[2].padStart(2, '0');
      const yy = Number(m2[3]);
      const yyyy = yy < 50 ? 2000 + yy : 1900 + yy;
      return `${yyyy}-${mm}-${dd}`;
    }
    // If it's already in YYYY-MM-DD format, return as is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dateStr;
    }
    return null;
  }
}

