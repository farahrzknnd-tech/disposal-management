import { describe, expect, it } from 'vitest';
import { affectedWorkflowQueries, queryKeys } from '../queryKeys';

describe('query keys', () => {
  it('uses canonical workflow keys for invalidation', () => {
    expect(affectedWorkflowQueries).toContain(queryKeys.suratJalan);
    expect(affectedWorkflowQueries).toContain(queryKeys.batches);
    expect(affectedWorkflowQueries).toContain(queryKeys.spks);
    expect(affectedWorkflowQueries).toContain(queryKeys.monitoring);
    expect(affectedWorkflowQueries).toContain(queryKeys.dashboard);
  });
});
