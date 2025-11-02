import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Task, StatsSummary, TeamMemberAnalytics } from '../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  protected readonly loading = signal<boolean>(true);
  protected readonly initialLoad = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tasks = signal<Task[]>([]);

  protected readonly selectedPerson = signal<string>('all');
  protected readonly selectedMonth = signal<string>('all');

  protected readonly people = computed(() =>
    Array.from(new Set(this.tasks().map((t) => t.AssignedTo!).filter(Boolean))).sort()
  );
  protected readonly months = computed(() =>
    Array.from(new Set(this.tasks().map((t) => t.MonthKey!).filter(Boolean))).sort()
  );

  protected readonly filteredTasks = computed(() => {
    const person = this.selectedPerson();
    const month = this.selectedMonth();
    return this.tasks().filter((t) => (person === 'all' || t.AssignedTo === person) && (month === 'all' || t.MonthKey === month));
  });

  protected readonly stats = computed<StatsSummary>(() => this.calculateStats(this.filteredTasks()));

  protected readonly teamMemberAnalytics = computed<TeamMemberAnalytics[]>(() => {
    const people = this.people();
    return people.map(person => {
      const personTasks = this.tasks().filter(t => t.AssignedTo === person);
      return this.calculateMemberAnalytics(person, personTasks);
    });
  });

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // Fetch data on component start
    this.api
      .loadOnce()
      .subscribe({
        next: (tasks) => {
          this.tasks.set(tasks);
          this.loading.set(false);
          this.initialLoad.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load data');
          this.loading.set(false);
          this.initialLoad.set(false);
          console.error(err);
        }
      });
  }

  protected trackByTask = (_: number, t: Task) => `${t.SubTask || t.MainTask || ''}|${t.Date || ''}|${t.AssignedTo || ''}`;
  
  protected trackByMember = (_: number, member: TeamMemberAnalytics) => member.name;

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

  private calculateMemberAnalytics(name: string, tasks: Task[]): TeamMemberAnalytics {
    const total = tasks.length;
    const completed = tasks.filter((t) => ['Done', 'Completed'].includes(t.Status ?? '')).length;
    const inProgress = tasks.filter((t) => ['In Progress', 'Working'].includes(t.Status ?? '')).length;
    const pending = tasks.filter((t) => !t.Status || ['Pending', 'To Do'].includes(t.Status)).length;
    const avgProgress = tasks.reduce((sum, t) => sum + (parseInt(String(t.PercentComplete ?? 0)) || 0), 0) / (total || 1);
    const completionRate = total ? (completed / total) * 100 : 0;
    const copyApproved = tasks.filter((t) => ['Yes', 'Approved'].includes(t.CopywriterApproval ?? '')).length;
    const creativeApproved = tasks.filter((t) => ['Yes', 'Approved'].includes(t.CreativeDirectorApproval ?? '')).length;
    return {
      name,
      total,
      completed,
      inProgress,
      pending,
      avgProgress: +avgProgress.toFixed(1),
      completionRate: +completionRate.toFixed(1),
      copyApproved,
      creativeApproved
    };
  }
}

