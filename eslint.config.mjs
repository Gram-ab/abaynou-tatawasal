import {defineConfig,globalIgnores} from 'eslint/config';
import {fixupConfigRules} from '@eslint/compat';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
// Official compatibility bridge until Next's bundled React/import/a11y plugins adopt ESLint 10 APIs.
export default defineConfig([...fixupConfigRules([...nextVitals,...nextTs]),globalIgnores(['.next/**','node_modules/**','test-results/**','playwright-report/**','next-env.d.ts','design/**','.local/**'])]);
