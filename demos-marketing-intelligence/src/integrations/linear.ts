import { LinearClient, Issue, IssueConnection } from '@linear/sdk';

export interface LinearTask {
  id: string;
  title: string;
  description?: string;
  state: string;
  completedAt?: Date;
  createdAt: Date;
  url: string;
  labels: string[];
  assignee?: string;
}

export class LinearIntegration {
  private client: LinearClient;
  private teamId: string;

  constructor(apiKey: string, teamId: string) {
    this.client = new LinearClient({ apiKey });
    this.teamId = teamId;
  }

  /**
   * Get recently completed tasks
   */
  async getCompletedTasks(days = 7): Promise<LinearTask[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const issues = await this.client.issues({
        filter: {
          team: { id: { eq: this.teamId } },
          completedAt: { gte: since },
        },
      });

      return this.mapIssuesToTasks(issues);
    } catch (error: any) {
      console.error('Error fetching completed tasks:', error.message);
      return [];
    }
  }

  /**
   * Get tasks by label
   */
  async getTasksByLabel(label: string): Promise<LinearTask[]> {
    try {
      const issues = await this.client.issues({
        filter: {
          team: { id: { eq: this.teamId } },
          labels: { name: { contains: label } },
        },
      });

      return this.mapIssuesToTasks(issues);
    } catch (error: any) {
      console.error(`Error fetching tasks with label ${label}:`, error.message);
      return [];
    }
  }

  /**
   * Get shipped features (completed tasks with "shipped" label)
   */
  async getShippedFeatures(days = 30): Promise<LinearTask[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const issues = await this.client.issues({
        filter: {
          team: { id: { eq: this.teamId } },
          completedAt: { gte: since },
          labels: { name: { containsIgnoreCase: 'shipped' } },
        },
      });

      return this.mapIssuesToTasks(issues);
    } catch (error: any) {
      console.error('Error fetching shipped features:', error.message);
      return [];
    }
  }

  /**
   * Get upcoming milestones
   */
  async getUpcomingMilestones(): Promise<any[]> {
    try {
      const projects = await this.client.projects();

      const milestones = [];
      for await (const project of projects.nodes) {
        milestones.push({
          id: project.id,
          name: project.name,
          description: project.description,
          targetDate: project.targetDate,
          progress: project.progress,
        });
      }

      return milestones;
    } catch (error: any) {
      console.error('Error fetching milestones:', error.message);
      return [];
    }
  }

  /**
   * Get team velocity (completed issues per week)
   */
  async getTeamVelocity(weeks = 4): Promise<number> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - (weeks * 7));

      const issues = await this.client.issues({
        filter: {
          team: { id: { eq: this.teamId } },
          completedAt: { gte: since },
        },
      });

      const count = issues.nodes.length;
      return Math.round(count / weeks);
    } catch (error: any) {
      console.error('Error calculating velocity:', error.message);
      return 0;
    }
  }

  /**
   * Check if task is "shippable" (worth announcing)
   */
  isShippableTask(task: LinearTask): boolean {
    const title = task.title.toLowerCase();
    const description = task.description?.toLowerCase() || '';

    // Filter out minor tasks
    const minorKeywords = ['fix typo', 'update readme', 'minor', 'cleanup', 'refactor'];
    if (minorKeywords.some(kw => title.includes(kw))) {
      return false;
    }

    // Prioritize features
    const featureKeywords = ['feature', 'add', 'implement', 'integrate', 'support', 'launch'];
    if (featureKeywords.some(kw => title.includes(kw))) {
      return true;
    }

    // Check for shipped label
    if (task.labels.some(label => label.toLowerCase().includes('shipped'))) {
      return true;
    }

    return false;
  }

  /**
   * Map Linear issues to our task format
   */
  private async mapIssuesToTasks(issues: IssueConnection): Promise<LinearTask[]> {
    const tasks: LinearTask[] = [];

    for await (const issue of issues.nodes) {
      const state = await issue.state;
      const labels = await issue.labels();
      const assignee = await issue.assignee;

      tasks.push({
        id: issue.id,
        title: issue.title,
        description: issue.description || undefined,
        state: state?.name || 'Unknown',
        completedAt: issue.completedAt || undefined,
        createdAt: issue.createdAt,
        url: issue.url,
        labels: labels.nodes.map(label => label.name),
        assignee: assignee?.name || undefined,
      });
    }

    return tasks;
  }
}

export default LinearIntegration;
