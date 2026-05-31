const baseUrl = process.env.INTEGRATION_BASE_URL ?? 'http://localhost:3000';

describe('repositories HTTP integration', () => {
  it('returns scored repositories for a valid search request', async () => {
    const response = await requestJson(
      '/repositories?language=Go&createdAfter=2024-06-01&limit=10&offset=0'
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('returns empty data for a future createdAfter date', async () => {
    const response = await requestJson(
      '/repositories?language=Go&createdAfter=2999-01-01&limit=10&offset=0'
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [] });
  });

  it('rejects requests without language', async () => {
    const response = await requestJson(
      '/repositories?createdAfter=2024-06-01&limit=10&offset=0'
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Language is required' });
  });

  it('rejects requests with invalid createdAfter', async () => {
    const response = await requestJson(
      '/repositories?language=Go&createdAfter=bad-date&limit=10&offset=0'
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'createdAfter must be an ISO date'
    });
  });

  it('rejects requests with non-integer limit', async () => {
    const response = await requestJson(
      '/repositories?language=Go&createdAfter=2024-06-01&limit=abc&offset=0'
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'Limit must be an integer between 1 and 100'
    });
  });

  it('rejects requests with limit below one', async () => {
    const response = await requestJson(
      '/repositories?language=Go&createdAfter=2024-06-01&limit=0&offset=0'
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'Limit must be an integer between 1 and 100'
    });
  });

  it('rejects requests with limit above one hundred', async () => {
    const response = await requestJson(
      '/repositories?language=Go&createdAfter=2024-06-01&limit=101&offset=0'
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'Limit must be an integer between 1 and 100'
    });
  });

  it('rejects requests with non-integer offset', async () => {
    const response = await requestJson(
      '/repositories?language=Go&createdAfter=2024-06-01&limit=10&offset=abc'
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'Offset must be a non-negative integer'
    });
  });

  it('rejects requests with negative offset', async () => {
    const response = await requestJson(
      '/repositories?language=Go&createdAfter=2024-06-01&limit=10&offset=-1'
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'Offset must be a non-negative integer'
    });
  });
});

async function requestJson(path: string): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`);
  } catch (error) {
    throw new Error(
      `Integration app is not reachable at ${baseUrl}. Start it before running this test.`,
      { cause: error }
    );
  }

  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>
  };
}
