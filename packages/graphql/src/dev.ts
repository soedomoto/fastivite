import { createDevServer, CreateDevServerParams } from '@fastivite/core';
import { generate, loadContext } from '@graphql-codegen/cli';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { globSync } from 'glob';
import { buildSchema } from 'graphql';
import _ from 'lodash';
import mercurius from 'mercurius';
import { codegenMercurius, loadSchemaFiles } from 'mercurius-codegen';
import { join } from 'path';

export type CreateGraphqlDevServerParams = CreateDevServerParams & {
  graphqlSchemaCwd: string;
  graphqlSchemaPattern: string | string[];
  graphqlResolverCwd: string;
  graphqlResolverPattern: string[] | undefined;
  graphqlLoaderCwd: string;
  graphqlLoaderPattern: string[] | undefined;
  graphqlContextCwd: string;
  graphqlContextPattern: string[] | undefined;
  graphqlCodegen: boolean;
  graphqlOperationCodegen: boolean;
  graphqlOperationCodegenConfigFile: string | undefined;
  graphqlCodegenOut: string;
};

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

  // let tmpBuild = './build';
  // mkdirSync(tmpBuild, { recursive: true });

  // let resolverPaths = globSync(graphqlResolverPattern, { cwd: graphqlResolverCwd })
  //   .map(resolverPath => join(graphqlResolverCwd, resolverPath))
  //   .map(resolverPath => resolverPath.replace('.js', '').replace('.ts', ''));

  // writeFileSync(
  //   join(tmpBuild, 'resolvers.json'),
  //   JSON.stringify(resolverPaths)
  // );

  // resolverPaths = (await import(join('./', tmpBuild, 'resolvers.json')))?.default || [];

  // let resolvers = {};
  // for (let resolverPath of resolverPaths) {
  //   let resolver = null;
  //   try {
  //     resolver = await import(`${resolverPath}.ts`);
  //   } catch (err) {
  //     try {
  //       resolver = await import(`${resolverPath}.js`);
  //     } catch (err) {}
  //   }
  //   if (resolver) resolvers = _.defaultsDeep(resolvers, resolver?.default || {});
  // }

  // == Resolver
  let resolvers = {};
  let resolverPaths = globSync(graphqlResolverPattern, {
    cwd: graphqlResolverCwd,
  })
    .map(resolverPath => join(graphqlResolverCwd, resolverPath))
    .map(resolverPath => resolverPath.replace('.js', '').replace('.ts', ''));

  for (let resolverPath of resolverPaths) {
    let resolver = null;
    try {
      resolver = await import(`${resolverPath}.ts`);
    } catch (err) {
      try {
        resolver = await import(`${resolverPath}.js`);
      } catch (err) { }
    }
    if (resolver) resolvers = _.defaultsDeep(resolvers, resolver?.default || {});
  }

  // == Loader
  let loaders = {};
  let loaderPaths = globSync(graphqlLoaderPattern, {
    cwd: graphqlLoaderCwd,
  })
    .map(loaderPath => join(graphqlLoaderCwd, loaderPath))
    .map(loaderPath => loaderPath.replace('.js', '').replace('.ts', ''));

  for (let loaderPath of loaderPaths) {
    let loader = null;
    try {
      loader = await import(`${loaderPath}.ts`);
    } catch (err) {
      try {
        loader = await import(`${loaderPath}.js`);
      } catch (err) { }
    }
    if (loader) loaders = _.defaultsDeep(loaders, loader?.default || {});
  }

  // == Context
  let contextPaths = globSync(graphqlContextPattern, {
    cwd: graphqlContextCwd,
  })
    .map(contextPath => join(graphqlContextCwd, contextPath))
    .map(contextPath => contextPath.replace('.js', '').replace('.ts', ''));

  let contexts = await Promise.all(
    contextPaths.map(async (contextPath) => {
      let context = null;
      try {
        context = await import(`${contextPath}.ts`);
      } catch (err) {
        try {
          context = await import(`${contextPath}.js`);
        } catch (err) { }
      }
      if (context) return context?.default;
      return null;
    }).filter(context => !!context)
  );

  let context = async (req: FastifyRequest, rep: FastifyReply) => {
    let context = {};
    for (let ctx of contexts) {
      if (ctx) context = _.defaultsDeep(context, await ctx(req, rep));
    }
    return context;
  };

  let graphqlSchemaPatterns: string[] = [];
  if (typeof graphqlSchemaPattern == 'string')
    graphqlSchemaPatterns = [...graphqlSchemaPatterns, graphqlSchemaPattern];
  else
    graphqlSchemaPatterns = [...graphqlSchemaPatterns, ...graphqlSchemaPattern];

  let { schema } = loadSchemaFiles(
    graphqlSchemaPatterns.map((p) => join(graphqlSchemaCwd, p)),
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
      const context = await loadContext(graphqlOperationCodegenConfigFile);
      context.updateConfig({
        watch: true,
        verbose: true,
        debug: true,
      });

      generate(context);
    } catch (err) {
      console.log(`WARNING: GraphQL operation codegen failed: ${err?.message}`);
    }
  }

  return server;
};
