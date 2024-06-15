import { runCli } from '@graphql-codegen/cli';
import { createDevServer, CreateDevServerParams } from '@fastivite/core';
import { globSync } from 'glob';
import { buildSchema } from 'graphql';
import _ from 'lodash';
import mercurius from 'mercurius';
import { codegenMercurius, loadSchemaFiles } from 'mercurius-codegen';
import { join } from 'path';
import type { FastifyReply, FastifyRequest } from 'fastify';

export type CreateGraphqlDevServerParams = CreateDevServerParams & {
  graphqlSchemaCwd: string
  graphqlSchemaPattern: string | string[]
  graphqlResolverCwd: string
  graphqlResolverPattern: string[] | undefined
  graphqlLoaderCwd: string
  graphqlLoaderPattern: string[] | undefined
  graphqlContextCwd: string
  graphqlContextPattern: string[] | undefined
  graphqlCodegen: boolean
  graphqlOperationCodegen: boolean
  graphqlOperationCodegenConfigFile: string | undefined
  graphqlCodegenOut: string
}


export const createGraphqlDevServer = async ({
  host,
  port,
  base,
  registerVite,
  index,
  entryServer,
  configFile,
  apiCwd,
  apiFilePattern,
  graphqlSchemaCwd,
  graphqlSchemaPattern = [],
  graphqlResolverCwd,
  graphqlResolverPattern = [],
  graphqlLoaderCwd,
  graphqlLoaderPattern = [],
  graphqlContextCwd,
  graphqlContextPattern = [],
  graphqlCodegen = true,
  graphqlOperationCodegen = true,
  graphqlOperationCodegenConfigFile,
  graphqlCodegenOut,
  middleware = false,
}: CreateGraphqlDevServerParams) => {
  let server = await createDevServer({
    host,
    port,
    base,
    registerVite,
    index,
    entryServer,
    configFile,
    apiEnabled: false,
    apiCwd,
    apiFilePattern,
    middleware: true,
  });

  let codegenMercuriusOptions = {
    targetPath: graphqlCodegenOut,
    watchOptions: { enabled: graphqlCodegen },
  };

  
  let resolvers = {};
  let resolverPaths = globSync(graphqlResolverPattern, {
    cwd: graphqlResolverCwd,
  });
  for (let resolverPath of resolverPaths) {
    let resolverFile = join(graphqlResolverCwd, resolverPath);
    let resolver = await import(resolverFile)
    resolvers = _.defaultsDeep(resolvers, resolver?.default || {});
  }

  let loaders = {};
  let loaderPaths = globSync(graphqlLoaderPattern, {
    cwd: graphqlLoaderCwd,
  });
  for (let loaderPath of loaderPaths) {
    let loaderFile = join(graphqlLoaderCwd, loaderPath);
    let loader = await import(loaderFile)
    loaders = _.defaultsDeep(loaders, loader?.default || {});
  }

  let contextPaths = globSync(graphqlContextPattern, {
    cwd: graphqlContextCwd,
  });
  let contexts = await Promise.all(contextPaths.map(async contextPath => {
    let contextFile = join(graphqlContextCwd, contextPath);
    let ctx = await import(contextFile)
    return ctx?.default;
  }))

  let context = async (req: FastifyRequest, rep: FastifyReply) => {
    let context = {};
    for (let ctx of contexts) {
      if (ctx) context = _.defaultsDeep(context, await ctx(req, rep));
    }
    return context;
  }

  let graphqlSchemaPattern2: string[] = [];
  if (typeof graphqlSchemaPattern == 'string') graphqlSchemaPattern2 = [...graphqlSchemaPattern2, graphqlSchemaPattern];
  else graphqlSchemaPattern2 = [...graphqlSchemaPattern2, ...graphqlSchemaPattern];

  let { schema } = loadSchemaFiles(
    graphqlSchemaPattern2.map((p) => join(graphqlSchemaCwd, p)),
    {
      watchOptions: {
        enabled: true,
        onChange: (schema) => {
          server.graphql.replaceSchema(buildSchema(schema.join('\n')));
          server.graphql.defineResolvers(resolvers);

          codegenMercurius(server, codegenMercuriusOptions).catch(
            console.error
          );
        },
      },
    }
  );

  await server.register(mercurius, {
    schema,
    resolvers: resolvers,
    loaders: loaders,
    context: context,
    subscription: true,
    graphiql: true,
  });

  if (!middleware) {
    let address = await server.listen({ host: host, port: port });
    console.log('Fastivite dev server is listening at', address);
  }

  if (graphqlCodegen) {
    codegenMercurius(server, codegenMercuriusOptions).catch(console.error);
  }

  if (graphqlOperationCodegen) {
    try {
      await runCli(
        `--watch --verbose --debug ${graphqlOperationCodegenConfigFile ? `--config ${graphqlOperationCodegenConfigFile}` : ``}`
      );
    } catch (err) { }
  }

  return server;
};
