import plugin from './src/fastivite-api-plugin.js';
import build from './src/fastivite-build.js';
import dev from './src/fastivite-dev.js';
import preview from './src/fastivite-preview.js';

export const createDevServer = dev.createDevServer;
export const buildVite = build.buildVite;
export const buildServer = build.buildServer;
export const previewServer = preview.previewServer;
export const createApiPlugin = plugin.createApiPlugin;

export default {
  createDevServer: dev.createDevServer,
  buildVite: build.buildVite,
  buildServer: build.buildServer,
  previewServer: preview.previewServer,
  createApiPlugin: plugin.createApiPlugin,
};
