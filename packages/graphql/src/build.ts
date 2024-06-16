import { BuildServerParams, buildVite } from '@fastivite/core';
import { build as esbuild } from 'esbuild';
import { readFileSync, rmSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
import { loadSchemaFiles } from 'mercurius-codegen';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

export type BuildGraphqlServerParams = BuildServerParams & {
  graphqlSchemaCwd: string;
  graphqlSchemaPattern: string | string[];
  graphqlResolverCwd: string;
  graphqlResolverPattern: string | string[];
  graphqlLoaderCwd: string;
  graphqlLoaderPattern: string | string[];
  graphqlContextCwd: string;
  graphqlContextPattern: string | string[];
};

let _filename = '';
try {
  _filename = fileURLToPath(import.meta.url);
} catch (err) {
  _filename = __filename;
}

export const buildGraphqlServer = async (params: BuildGraphqlServerParams) => {
  // Build vite
  await buildVite(params);

  // Build graphql server
  // == Schema
  let graphqlSchemaPatterns: string[] = [];
  if (typeof params?.graphqlSchemaPattern == 'string')
    graphqlSchemaPatterns = [
      ...graphqlSchemaPatterns,
      params?.graphqlSchemaPattern,
    ];
  else
    graphqlSchemaPatterns = [
      ...graphqlSchemaPatterns,
      ...params?.graphqlSchemaPattern,
    ];

  let { schema } = loadSchemaFiles(
    graphqlSchemaPatterns.map((p) => join(params?.graphqlSchemaCwd, p))
  );
  writeFileSync(`${params?.outDir}/schema.gql`, schema.join('\n\n'));

  // == Resolver
  let resolverDistPaths: string[] = [];
  let resolverPaths = globSync(params?.graphqlResolverPattern, {
    cwd: params?.graphqlResolverCwd,
  });
  for (let resolverPath of resolverPaths) {
    await esbuild({
      format: 'esm',
      platform: 'node',
      entryPoints: [join(params?.graphqlResolverCwd, resolverPath)],
      outfile: join(
        `${params?.outDir}`,
        'resolvers',
        resolverPath.replace('.ts', '.js')
      ),
    });
    resolverDistPaths = [
      ...resolverDistPaths,
      join('./resolvers', resolverPath.replace('.js', '').replace('.ts', '')),
    ];
  }
  writeFileSync(
    join(`${params?.outDir}`, 'resolvers.json'),
    JSON.stringify(resolverDistPaths)
  );

  // == Loader
  let loaderDistPaths: string[] = [];
  let loaderPaths = globSync(params?.graphqlLoaderPattern, {
    cwd: params?.graphqlLoaderCwd,
  });
  for (let loaderPath of loaderPaths) {
    await esbuild({
      format: 'esm',
      platform: 'node',
      entryPoints: [join(params?.graphqlLoaderCwd, loaderPath)],
      outfile: join(
        `${params?.outDir}`,
        'loaders',
        loaderPath.replace('.ts', '.js')
      ),
    });
    loaderDistPaths = [
      ...loaderDistPaths,
      join('./loaders', loaderPath.replace('.js', '').replace('.ts', '')),
    ];
  }
  writeFileSync(
    join(`${params?.outDir}`, 'loaders.json'),
    JSON.stringify(loaderDistPaths)
  );

  // == Context
  let contextDistPaths: string[] = [];
  let contextPaths = globSync(params?.graphqlContextPattern, {
    cwd: params?.graphqlContextCwd,
  });
  for (let contextPath of contextPaths) {
    await esbuild({
      format: 'esm',
      platform: 'node',
      entryPoints: [join(params?.graphqlContextCwd, contextPath)],
      outfile: join(
        `${params?.outDir}`,
        'contexts',
        contextPath.replace('.ts', '.js')
      ),
    });
    contextDistPaths = [
      ...contextDistPaths,
      join('./contexts', contextPath.replace('.js', '').replace('.ts', '')),
    ];
  }
  writeFileSync(
    join(`${params?.outDir}`, 'contexts.json'),
    JSON.stringify(contextDistPaths)
  );

  // Build fastify server
  let tmpJs = `${params?.outDir}/server.js`;
  writeFileSync(tmpJs, readFileSync(join(dirname(_filename), 'server.js')));
  await esbuild({
    bundle: true,
    minify: true,
    external: ['vite', 'fsevents'],
    format: 'cjs',
    platform: 'node',
    entryPoints: [tmpJs],
    outfile: `${params?.outDir}/server.cjs`,
  });

  rmSync(tmpJs, { recursive: true, force: true });
  rmSync(`${params?.outDir}/server`, { recursive: true, force: true });
};
