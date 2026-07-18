import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const files = ['src/pages/surat-jalan/SuratJalanData.tsx', 'src/pages/batch/BatchList.tsx'];

describe('safe deletion frontend boundary', () => {
  it('does not call generic delete from workflow pages', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/\.from\(['"](?:surat_jalan|batch)['"]\)\.delete/);
    }
  });
});
