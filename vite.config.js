import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function copyPublicScripts() {
  return {
    name: 'copy-root-public-scripts',
    generateBundle() {
      for (const name of ['operator-hotfix.js', 'visitor-profile-mobile-fix.js']) {
        const file = resolve(process.cwd(), name);
        this.emitFile({
          type: 'asset',
          fileName: name,
          source: readFileSync(file, 'utf8')
        });
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyPublicScripts()]
});
