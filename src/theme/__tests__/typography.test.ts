import { fonts, type } from '@/src/theme/typography';

// The project has no @types/node; these are the only Node APIs the test needs.
declare const require: (id: string) => any;
declare const __dirname: string;

const { readFileSync } = require('fs') as {
  readFileSync: (path: string, encoding: 'utf8') => string;
};
const { execSync } = require('child_process') as {
  execSync: (cmd: string, opts: { cwd: string; encoding: 'utf8' }) => string;
};
const { join } = require('path') as { join: (...parts: string[]) => string };

const ROOT = join(__dirname, '..', '..', '..');
const layout = readFileSync(join(ROOT, 'app/_layout.tsx'), 'utf8');

describe('typography', () => {
  it('loads every font family the type scale names', () => {
    for (const family of Object.values(fonts)) {
      expect(layout).toContain(`    ${family},`);
    }
  });

  it('loads every font family the screens name directly', () => {
    const used = execSync(
      "grep -rhoE \"fontFamily: *'[A-Za-z0-9_]+'\" app src/components || true",
      { cwd: ROOT, encoding: 'utf8' }
    )
      .split('\n')
      .map((line: string) => line.match(/'([^']+)'/)?.[1])
      .filter((name): name is string => !!name);
    expect(used.length).toBeGreaterThan(0);
    for (const family of new Set(used)) {
      expect(layout).toContain(`    ${family},`);
    }
  });

  it('keeps every style at 12pt or larger', () => {
    for (const style of Object.values(type)) {
      expect(style.fontSize).toBeGreaterThanOrEqual(12);
    }
  });
});
