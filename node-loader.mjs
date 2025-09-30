// Configuration de loader Node.js unifiée pour les scripts TypeScript
import { register } from 'ts-node/esm';
import { pathToFileURL } from 'url';

// Configuration ts-node pour ESM
register({
  esm: true,
  experimentalSpecifierResolution: 'node',
  compilerOptions: {
    module: 'ESNext',
    moduleResolution: 'node',
    allowImportingTsExtensions: false,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    target: 'ES2022'
  }
});