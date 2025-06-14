import { BaseService } from './base.service';
import { ExportService } from './export.service';
import * as cron from 'node-cron';

export class ExportSchedulerService extends BaseService {
  private exportService: ExportService;
  private cleanupTask?: cron.ScheduledTask;

  constructor() {
    super('ExportSchedulerService');
    this.exportService = new ExportService();
  }

  /**
   * Start the export scheduler with background tasks
   */
  start() {
    return this.withLogging('start', async () => {
      // Schedule cleanup of old export files every day at 2 AM
      this.cleanupTask = cron.schedule('0 2 * * *', async () => {
        try {
          await this.exportService.cleanupOldFiles();
          console.log('Scheduled export cleanup completed');
        } catch (error) {
          console.error('Scheduled export cleanup failed:', error);
        }
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      // Start the scheduled task
      this.cleanupTask.start();
      
      console.log('Export scheduler started');
    });
  }

  /**
   * Stop the export scheduler
   */
  stop() {
    return this.withLogging('stop', async () => {
      if (this.cleanupTask) {
        this.cleanupTask.stop();
        this.cleanupTask.destroy();
        this.cleanupTask = undefined;
      }
      
      console.log('Export scheduler stopped');
    });
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.cleanupTask?.getStatus() === 'scheduled',
      nextCleanup: this.cleanupTask ? '2:00 AM UTC' : null
    };
  }

  /**
   * Manually trigger cleanup
   */
  async triggerCleanup(): Promise<unknown> {
    return this.withLogging('triggerCleanup', async () => {
      await this.exportService.cleanupOldFiles();
    });
  }
}

// Singleton instance
let schedulerInstance: ExportSchedulerService | null = null;

export function getExportScheduler(): ExportSchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new ExportSchedulerService();
  }
  return schedulerInstance;
}