#! /usr/bin/env node

import { program } from 'commander';
import { createGraphqlDevServer } from './dev.js';
import { buildGraphqlServer } from './build.js';
import { previewGraphqlServer } from './preview.js';

(async () => {
  program
    .command('dev')
    .description('dev')
    .option('--host <host>', 'Host', '127.0.0.1')
    .option('--port <port>', 'Port', '6754')
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
      './graphql/schema'
    )
    .option(
      '--graphql-schema-pattern <graphql-schema-pattern...>',
      'graphql schema pattern. e.g: **/*.gql',
      ['**/*.gql', '**/*.graphql', '**/*.graphqls']
    )
    .option(
      '--graphql-codegen-out <graphql-codegen-out...>',
      'graphql-codegen-out. e.g: gen.ts',
      './graphql/schema-gen.ts'
    )
    .option('--build-dir <build-dir>', 'Build directory', 'build')
    .action((params) => {
      createGraphqlDevServer(params);
    });

  program
    .command('build')
    .description('build')
    .option('--out-dir <out-dir>', 'Output directory', 'dist')
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
      './graphql/schema'
    )
    .option(
      '--graphql-schema-pattern <graphql-schema-pattern...>',
      'graphql schema pattern. e.g: **/*.gql',
      ['**/*.gql', '**/*.graphql', '**/*.graphqls']
    )
    .option(
      '--graphql-codegen-out <graphql-codegen-out...>',
      'graphql-codegen-out. e.g: gen.ts',
      './graphql/schema-gen.ts'
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
