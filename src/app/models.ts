export interface SheetData {
  SheetName: string;
  Data: PostData[];
}

export interface PostData {
  Type?: string;
  Format?: string;
  CaptionAndHashtags?: string;
  Tasks?: LegacyTaskBlock[];
}

export interface Task {
  MainTask?: string;
  SubTask?: string;
  Description?: string;
  AssignedTo?: string;
  Status?: string;
  PercentComplete?: string | number;
  Date?: string; // ISO or arbitrary string from API
  ScheduleDate?: string; // Schedule date from API
  CopywriterApproval?: string;
  CreativeDirectorApproval?: string;
  // Enriched fields
  SheetName?: string;
  Type?: string;
  Format?: string;
  Caption?: string;
  DayISO?: string; // YYYY-MM-DD derived when possible
  MonthKey?: string; // YYYY-MM derived when possible
}

export interface StatsSummary {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  avgProgress: number;
  copyApproved: number;
  creativeApproved: number;
  completionRate: number;
}

export interface TeamMemberAnalytics {
  name: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  avgProgress: number;
  completionRate: number;
  copyApproved: number;
  creativeApproved: number;
}

export interface LegacyTaskBlock {
  Task?: string; // e.g., 'Post Creation'
  SubTasks?: LegacySubTask[];
}

export interface LegacySubTask {
  SubTask?: string;
  AssignedTo?: string;
  Description?: string;
  Status?: string;
  Date?: string;
  SchedualeDate?: string;
  CopywriterApproval?: string;
  CreativeDirectorApproval?: string;
  PercentComplete?: string;
  PublishingLink?: string;
  Comments?: string;
}

