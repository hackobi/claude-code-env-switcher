import axios from 'axios';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

export interface LinearIssue {
  id: string;
  title: string;
  description?: string;
  state: {
    name: string;
    type: string;
  };
  labels: { name: string }[];
  completedAt?: string;
  createdAt: string;
}

export async function getLinearIssues(
  apiKey: string,
  teamId: string,
  filter: 'completed' | 'in_progress' | 'all' = 'completed'
): Promise<LinearIssue[]> {
  if (!apiKey) {
    throw new Error('LINEAR_API_KEY is required');
  }

  const stateFilter = filter === 'completed'
    ? '{ state: { type: { eq: "completed" } } }'
    : filter === 'in_progress'
    ? '{ state: { type: { eq: "started" } } }'
    : '{}';

  const query = `
    query {
      issues(
        filter: {
          team: { key: { eq: "${teamId}" } }
          ${stateFilter}
        }
        orderBy: updatedAt
        first: 50
      ) {
        nodes {
          id
          title
          description
          state {
            name
            type
          }
          labels {
            nodes {
              name
            }
          }
          completedAt
          createdAt
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      LINEAR_API_URL,
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
        },
      }
    );

    const issues = response.data?.data?.issues?.nodes || [];

    return issues.map((issue: any) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      state: issue.state,
      labels: issue.labels?.nodes || [],
      completedAt: issue.completedAt,
      createdAt: issue.createdAt,
    }));
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Invalid Linear API key');
    }
    throw new Error(`Failed to fetch Linear issues: ${error.message}`);
  }
}

export async function getRecentlyShippedFeatures(
  apiKey: string,
  teamId: string,
  daysAgo: number = 7
): Promise<LinearIssue[]> {
  const issues = await getLinearIssues(apiKey, teamId, 'completed');
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

  return issues.filter(issue => {
    if (!issue.completedAt) return false;
    return new Date(issue.completedAt) >= cutoffDate;
  });
}
