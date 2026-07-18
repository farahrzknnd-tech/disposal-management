import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../supabase', () => ({ supabase: { rpc: vi.fn() } }));

import { supabase } from '../supabase';
import { deleteBatchSafely, deleteSuratJalanSafely } from '../workflows';

describe('safe deletion RPC boundary', () => {
  beforeEach(() => vi.mocked(supabase.rpc).mockReset());

  it('calls delete_surat_jalan_safely', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { deleted_count: 1 }, error: null });
    await deleteSuratJalanSafely(['sj-id']);
    expect(supabase.rpc).toHaveBeenCalledWith('delete_surat_jalan_safely', { p_surat_jalan_ids: ['sj-id'] });
  });

  it('calls delete_batch_safely', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: { released_count: 10 }, error: null });
    await deleteBatchSafely('batch-id');
    expect(supabase.rpc).toHaveBeenCalledWith('delete_batch_safely', { p_batch_id: 'batch-id' });
  });

  it('returns clear missing batch error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'Batch tidak ditemukan.' } });
    await expect(deleteBatchSafely('missing')).rejects.toThrow('Batch tidak ditemukan.');
  });
});
