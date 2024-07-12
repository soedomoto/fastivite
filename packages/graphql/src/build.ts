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
  // Read server.js template
  let tmpJs = `${params?.outDir}/server.js`;
  let strServerJs = readFileSync(
    join(dirname(_filename), 'server.js')
  ).toString();

  strServerJs = strServerJs
    // Render lodash to server.js template
    .replace(`// import lodash;`, `import _ from 'lodash';`);

  // Build vite
  await buildVite(params);

  // Build prisma client
  if (!!params?.prismaClientFile) {
    await esbuild({
      format: 'esm',
      platform: 'node',
      entryPoints: [params?.prismaClientFile],
      outfile: `${params?.outDir}/prisma-client.js`,
    });

    strServerJs = strServerJs
      // Render prismaClient to server.js template
      .replace(
        `// import prismaClient;`,
        `import prismaClient from './prisma-client.js';`
      )
      .replace(
        `server.decorate('prisma', null);`,
        `server.decorate('prisma', prismaClient);
        server.addHook('onRequest', async (req)=>{
          // @ts-ignore
          req.prisma = server.prisma;
        });
      `
      );
  }

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
  // writeFileSync(`${params?.outDir}/schema.gql`, schema.join('\n\n'));

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
  strServerJs = strServerJs
    // Render schema.gql to server.js template
    .replace(
      `readFileSync(join(_dirname, 'schema.gql'), 'utf-8')`,
      '`' + schema.join('\n\n') + '`'
    )
    // Render resolver to server.js template
    .replace(
      `// import resolverPaths;`,
      resolverDistPaths
        .map((r, i) => `import resolver${i} from './${r}.js';`)
        .join('\n')
    )
    .replace(
      `let resolvers = {};`,
      `let resolvers = {};\n${resolverDistPaths.map((_, i) => `resolvers = _.defaultsDeep(resolvers, resolver${i});`).join('\n')}`
    )
    // Render loader to server.js template
    .replace(
      `// import loaderPaths;`,
      loaderDistPaths
        .map((r, i) => `import loader${i} from './${r}.js';`)
        .join('\n')
    )
    .replace(
      `let loaders = {};`,
      `let loaders = {};\n${loaderDistPaths.map((_, i) => `loaders = _.defaultsDeep(loaders, loader${i});`).join('\n')}`
    )
    // Render context to server.js template
    .replace(
      `// import contextPaths;`,
      contextDistPaths
        .map((r, i) => `import context${i} from './${r}.js';`)
        .join('\n')
    )
    .replace(
      `let contexts = [];`,
      `let contexts = [${contextDistPaths.map((_, i) => `context${i} || (async (req, rep)=>({})),`).join('\n')}];`
    );

  writeFileSync(tmpJs, strServerJs);

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
  rmSync(`${params?.outDir}/resolvers.json`, { recursive: true, force: true });
  rmSync(`${params?.outDir}/loaders.json`, { recursive: true, force: true });
  rmSync(`${params?.outDir}/contexts.json`, { recursive: true, force: true });
  rmSync(`${params?.outDir}/resolvers`, { recursive: true, force: true });
  rmSync(`${params?.outDir}/loaders`, { recursive: true, force: true });
  rmSync(`${params?.outDir}/contexts`, { recursive: true, force: true });
  rmSync(`${params?.outDir}/schema.gql`, { recursive: true, force: true });
  rmSync(`${params?.outDir}/prisma-client.js`, {
    recursive: true,
    force: true,
  });
};
