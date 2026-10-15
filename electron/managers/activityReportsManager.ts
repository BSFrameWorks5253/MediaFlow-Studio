import fs from 'fs';
import path from 'path';
import { app, shell } from 'electron';

export interface ActivityItem {
  id: string;
  timestamp: string;
  stage: string;
  action: string;
  count: number;
  summary: string;
  type: 'info' | 'success' | 'warning' | 'danger';
}

export interface ReportItem {
  id: string;
  title: string;
  path: string;
  type: 'excel' | 'csv' | 'json';
  timestamp: string;
  rowCount?: number;
  status: string;
}

export class ActivityReportsManager {
  private activityFile: string;
  private reportsFile: string;
  private activities: ActivityItem[] = [];
  private reports: ReportItem[] = [];

  constructor() {
    const userData = app.getPath('userData');
    this.activityFile = path.join(userData, 'activity_log.json');
    this.reportsFile = path.join(userData, 'reports_log.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.activityFile)) {
        this.activities = JSON.parse(fs.readFileSync(this.activityFile, 'utf-8'));
      }
    } catch {
      this.activities = [];
    }
    try {
      if (fs.existsSync(this.reportsFile)) {
        this.reports = JSON.parse(fs.readFileSync(this.reportsFile, 'utf-8'));
      }
    } catch {
      this.reports = [];
    }
  }

  private saveActivities() {
    try {
      fs.writeFileSync(this.activityFile, JSON.stringify(this.activities.slice(-500), null, 2), 'utf-8');
    } catch {}
  }

  private saveReports() {
    try {
      fs.writeFileSync(this.reportsFile, JSON.stringify(this.reports.slice(-500), null, 2), 'utf-8');
    } catch {}
  }

  logActivity(item: Omit<ActivityItem, 'id' | 'timestamp'>) {
    const act: ActivityItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.activities.unshift(act);
    this.saveActivities();
    return act;
  }

  logReport(item: Omit<ReportItem, 'id' | 'timestamp'>) {
    const rep: ReportItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.reports.unshift(rep);
    this.saveReports();
    return rep;
  }

  getActivities(): ActivityItem[] {
    return this.activities;
  }

  getReports(): ReportItem[] {
    return this.reports;
  }

  async openPath(targetPath: string): Promise<string> {
    const clean = path.resolve(targetPath.replace(/^file:\/\/\/?/, ''));
    if (fs.existsSync(clean)) {
      return await shell.openPath(clean);
    }
    throw new Error('The requested file or directory could not be found.');
  }

  showItemInFolder(targetPath: string) {
    const clean = path.resolve(targetPath.replace(/^file:\/\/\/?/, ''));
    if (fs.existsSync(clean)) {
      shell.showItemInFolder(clean);
    }
  }
}
