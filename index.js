import plugin from './src/fastivite-api-plugin.js';
import build from './src/fastivite-build.js';
import dev from './src/fastivite-dev.js';
import preview from './src/fastivite-preview.js';

export const createDevServer = dev.createDevServer;
export const buildServer = build.buildServer;
export const previewServer = preview.previewServer;
export const createApiPlugin = plugin.createApiPlugin;

// exports.createDevServer = dev.createDevServer;
// exports.buildServer = build.buildServer;
// exports.previewServer = preview.previewServer;
// exports.createApiPlugin = plugin.createApiPlugin;

export default {
  createDevServer: dev.createDevServer,
  buildServer: build.buildServer,
  previewServer: preview.previewServer,
  createApiPlugin: plugin.createApiPlugin,
};
