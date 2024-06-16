import { program } from 'commander';
import { buildGraphqlServer } from './build.js';
import { createGraphqlDevServer } from './dev.js';
import { previewGraphqlServer } from './preview.js';

(async () => {
  program
    .command('dev')
    .description('dev')
    .option('--host <host>', 'Host', '127.0.0.1')
    .option('--port <port>', 'Port', parseInt, 8081)
    .option('--base <base>', 'Base', '')
    .option('--index <index>', 'index.html', './index.html')
    .option(
      '--entry-server <entry-server>',
      'entry-server.(j|t)sx',
      './src/entry-server.tsx'
    )
    .option(
      '--config-file <config-file>',
      'vite.config.(j|t)sx',
      './vite.config.ts'
    )
    .option(
      '--api-cwd <api-cwd>',
      'APIs working directory. e.g: src/pages',
      './src/pages'
    )
    .option(
      '--api-file-pattern <api-file-pattern...>',
      'APIs file pattern. e.g: **/api.ts',
      ['**/api.ts', '**/api/index.ts']
    )
    .option(
      '--graphql-schema-cwd <graphql-schema-cwd>',
      'graphql schema working directory. e.g: ./graphql/schema',
      './src/graphql/schema'
    )
    .option(
      '--graphql-schema-pattern <graphql-schema-pattern...>',
      'graphql schema pattern. e.g: **/*.gql',
      ['**/*.gql', '**/*.graphql']
    )
    .option(
      '--graphql-resolver-cwd <graphql-resolver-cwd>',
      'graphql resolver working directory. e.g: ./graphql/resolver',
      './src'
    )
    .option(
      '--graphql-resolver-pattern <graphql-resolver-pattern...>',
      'graphql resolver pattern. e.g: **/*.resolver.ts',
      ['**/*.resolver.ts', '**/*.resolver.js']
    )
    .option(
      '--graphql-loader-cwd <graphql-loader-cwd>',
      'graphql loader working directory. e.g: ./graphql/loader',
      './src'
    )
    .option(
      '--graphql-loader-pattern <graphql-loader-pattern...>',
      'graphql loader pattern. e.g: **/*.loader.js',
      ['**/*.loader.ts', '**/*.loader.js']
    )
    .option(
      '--graphql-context-cwd <graphql-context-cwd>',
      'graphql context working directory. e.g: ./graphql/context',
      './src'
    )
    .option(
      '--graphql-context-pattern <graphql-context-pattern...>',
      'graphql context pattern. e.g: **/*.context.js',
      ['**/*.context.ts', '**/*.context.js']
    )
    .option(
      '--graphql-codegen <graphql-codegen>',
      'is codegen enabled',
      true
    )
    .option(
      '--graphql-codegen-out <graphql-codegen-out...>',
      'graphql-codegen-out. e.g: gen.ts',
      './src/graphql/gen.ts'
    )
    .option(
      '--graphql-operation-codegen <graphql-operation-codegen>',
      'graphql-operation-codegen',
      true
    )
    .option(
      '--graphql-operation-codegen-config-file <graphql-operation-codegen-config-file>',
      'graphql-operation-codegen-config-file',
      './codegen.js'
    )
    
    .action((params) => {
      createGraphqlDevServer(params);
    });

// graphqlSchemaCwd: string;
// graphqlSchemaPattern: string | string[];
// graphqlResolverCwd: string;
// graphqlResolverPattern: string | string[];
// graphqlLoaderCwd: string;
// graphqlLoaderPattern: string | string[];
// graphqlContextCwd: string;
// graphqlContextPattern: string | string[];

  program
    .command('build')
    .description('build')
    .option('--out-dir <out-dir>', 'Output directory', 'dist')
    .option(
      '--config-file <config-file>',
      'vite.config.(j|t)sx',
      './vite.config.ts'
    )
    .option(
      '--entry-server <entry-server>',
      'entry-server.(j|t)sx',
      './src/entry-server.tsx'
    )
    .option(
      '--api-cwd <api-cwd>',
      'APIs working directory. e.g: src/pages',
      './src/pages'
    )
    .option(
      '--api-file-pattern <api-file-pattern...>',
      'APIs file pattern. e.g: **/api.ts',
      ['**/api.ts', '**/api/index.ts']
    )
    .option(
      '--graphql-schema-cwd <graphql-schema-cwd>',
      'graphql schema working directory. e.g: ./graphql/schema',
      './src/graphql/schema'
    )
    .option(
      '--graphql-schema-pattern <graphql-schema-pattern...>',
      'graphql schema pattern. e.g: **/*.gql',
      ['**/*.gql', '**/*.graphql']
    )
    .option(
      '--graphql-resolver-cwd <graphql-resolver-cwd>',
      'graphql resolver working directory. e.g: ./graphql/resolver',
      './src'
    )
    .option(
      '--graphql-resolver-pattern <graphql-resolver-pattern...>',
      'graphql resolver pattern. e.g: **/*.resolver.ts',
      ['**/*.resolver.ts', '**/*.resolver.js']
    )
    .option(
      '--graphql-loader-cwd <graphql-loader-cwd>',
      'graphql loader working directory. e.g: ./graphql/loader',
      './src'
    )
    .option(
      '--graphql-loader-pattern <graphql-loader-pattern...>',
      'graphql loader pattern. e.g: **/*.loader.js',
      ['**/*.loader.ts', '**/*.loader.js']
    )
    .option(
      '--graphql-context-cwd <graphql-context-cwd>',
      'graphql context working directory. e.g: ./graphql/context',
      './src'
    )
    .option(
      '--graphql-context-pattern <graphql-context-pattern...>',
      'graphql context pattern. e.g: **/*.context.js',
      ['**/*.context.ts', '**/*.context.js']
    )
    .action((params) => {
      buildGraphqlServer(params);
    });

  program
    .command('preview')
    .description('preview')
    .option('--cwd <cwd>', 'Working directory', './dist')
    .option('--server-file <server-file>', 'Server file', 'server.cjs')
    .action((params) => {
      previewGraphqlServer(params);
    });

  program.parse(process.argv);
})();
