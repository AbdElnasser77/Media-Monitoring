import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { SheetData, Task, LegacyTaskBlock, LegacySubTask } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly endpoint = 'https://n8n.maprojects.net/webhook/a8fdcdba-2685-4348-b93e-ee7964c4fcdf';

  private readonly allTasksSignal = signal<Task[]>([]);
  readonly tasks = computed(() => this.allTasksSignal());

  constructor(private http: HttpClient) {}

  fetch(): Observable<Task[]> {
    return this.http.get<SheetData[]>(this.endpoint).pipe(
      map((sheets) => {
        console.log('RAW API SHEETS', sheets);
        const tasks = this.flattenTasks(sheets);
        console.log('FLATTENED TASKS (preview first 5)', tasks.slice(0, 5));
        return tasks;
      }),
      map((tasks) => tasks.filter((t) => !!t.AssignedTo)) // ignore unassigned
    );
  }

  loadOnce(): Observable<Task[]> {
    const stream$ = this.fetch();
    stream$.subscribe({ next: (tasks) => this.allTasksSignal.set(tasks) });
    return stream$;
  }

  private flattenTasks(sheets: SheetData[]): Task[] {
    const flat: Task[] = [];
    for (const sheet of sheets ?? []) {
      const posts = Array.isArray(sheet?.Data) ? sheet.Data : [];
      for (const post of posts) {
        const blocks: LegacyTaskBlock[] = Array.isArray(post?.Tasks) ? post.Tasks as any : [];
        for (const block of blocks) {
          const subTasks: LegacySubTask[] = Array.isArray(block?.SubTasks) ? block.SubTasks : [];
          for (const st of subTasks) {
            const normalized = this.normalizeSubTask(st);
            const enriched: Task = {
              MainTask: block?.Task ?? '',
              SubTask: normalized.SubTask,
              AssignedTo: normalized.AssignedTo,
              Description: normalized.Description,
              Status: normalized.Status,
              PercentComplete: normalized.PercentComplete,
              Date: normalized.Date,
              ScheduleDate: st?.SchedualeDate?.trim() || '',
              CopywriterApproval: normalized.CopywriterApproval,
              CreativeDirectorApproval: normalized.CreativeDirectorApproval,
              SheetName: sheet?.SheetName,
              Type: post?.Type ?? '',
              Format: post?.Format ?? '',
              Caption: post?.CaptionAndHashtags ?? '',
              DayISO: normalized.DayISO,
              MonthKey: normalized.MonthKey
            };
            flat.push(enriched);
          }
        }
      }
    }
    return flat;
  }

  private normalizeSubTask(st: LegacySubTask): LegacySubTask & { DayISO?: string; MonthKey?: string; Status?: string; PercentComplete?: string | number } {
    const rawStatus = st?.Status ?? '';
    const status = this.normalizeStatus(rawStatus);
    const percent = this.normalizePercent(st?.PercentComplete ?? '');
    const dateStr = st?.Date?.trim() || st?.SchedualeDate?.trim() || '';
    const { dayISO, monthKey } = this.parseDateToIso(dateStr);
    return {
      ...st,
      Status: status,
      PercentComplete: percent,
      Date: dateStr,
      DayISO: dayISO,
      MonthKey: monthKey
    } as any;
  }

  private normalizeStatus(s: string): string {
    const v = (s || '').toLowerCase();
    if (!v) return 'Pending';
    if (v.includes('publish')) return 'Completed';
    if (v.includes('complete') || v.includes('✅')) return 'Completed';
    if (v.includes('progress') || v.includes('working')) return 'In Progress';
    return 'Pending';
  }

  private normalizePercent(s: string | number): number {
    if (typeof s === 'number') return s;
    const str = (s || '').toString();
    const m = str.match(/(\d{1,3})/);
    const n = m ? Number(m[1]) : 0;
    return Math.max(0, Math.min(100, isFinite(n) ? n : 0));
  }

  private parseDateToIso(d: string): { dayISO: string | undefined; monthKey: string | undefined } {
    if (!d) return { dayISO: undefined, monthKey: undefined };
    // Try DD/MM/YYYY variants, ignore trailing noise
    const m = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3];
      const dayISO = `${yyyy}-${mm}-${dd}`;
      const monthKey = `${yyyy}-${mm}`;
      return { dayISO, monthKey };
    }
    // Try DD/MM/YY
    const m2 = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})/);
    if (m2) {
      const dd = m2[1].padStart(2, '0');
      const mm = m2[2].padStart(2, '0');
      const yy = Number(m2[3]);
      const yyyy = yy < 50 ? 2000 + yy : 1900 + yy;
      const dayISO = `${yyyy}-${mm}-${dd}`;
      const monthKey = `${yyyy}-${mm}`;
      return { dayISO, monthKey };
    }
    return { dayISO: undefined, monthKey: undefined };
  }
}

