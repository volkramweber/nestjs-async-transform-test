// https://gist.github.com/flisboac/6af02b5254088558362757593dc54f9c

import {
  Abstract,
  DynamicModule,
  INestApplicationContext,
  Type,
} from '@nestjs/common';
import { ContextId } from '@nestjs/core';
import {
  ClassConstructor,
  ClassTransformOptions,
  plainToClass,
  TransformOptions,
  TransformationType,
  TransformFnParams,
} from 'class-transformer';

export interface Transformer {
  transform(params: TransformFnParams): Promise<unknown>;
}

export interface TransformerFunction {
  (params: AsyncTransformerParams): Promise<unknown>;
}

export interface TransformerResolver {
  resolveTransformer(options: TransformerResolverOptions): Promise<Transformer>;
}

export type TransformerResolverOptions = {
  strict: boolean;
  scoped: boolean;
  contextId?: ContextId;
  token: ResolvedTransformerToken;
};

export type BaseTransformOptions = TransformOptions & {
  select?: Type<any> | DynamicModule;
  strict?: boolean;
  scoped?: boolean;
};

export type AsyncTransformWithOptions = BaseTransformOptions & {
  token?: TransformerToken;
};

export type AsyncTransformOptions = BaseTransformOptions & {
  body?: TransformerFunction;
};

export type AnyTransformOptions =
  | AsyncTransformOptions
  | AsyncTransformWithOptions;

export type AsyncTransformerParams = Omit<TransformFnParams, 'options'> & {
  options: AnyTransformOptions;
};

export type TransformEntry = {
  propertyKey: string | symbol;
  options: AnyTransformOptions;
};

type Token<T> = string | symbol | Type<T> | Abstract<T>;
type AbstractTransformerType = Abstract<Transformer>;
type TransformerType = Type<Transformer>;
type TransformerToken =
  | string
  | symbol
  | (() => AbstractTransformerType | TransformerType);
type ResolvedTransformerToken =
  | string
  | symbol
  | AbstractTransformerType
  | TransformerType;

const TRANSFORM_ENTRIES = Symbol('TRANSFORM_ENTRIES');

class TransformContext implements TransformerResolver {
  constructor(
    //
    public appContext: INestApplicationContext,
    public appContextId: ContextId | undefined,
    public resolverToken: Token<TransformerResolver> | undefined,
  ) {}

  async getTransformer(
    options: AsyncTransformWithOptions,
  ): Promise<Transformer> {
    const resolvedOptions = this.resolveOptions(options);
    const { nestContext, strict, token } = resolvedOptions;
    const resolver = this.resolverToken
      ? nestContext.get(this.resolverToken, { strict })
      : this;
    const instance = await resolver.resolveTransformer(resolvedOptions);

    if (!instance) {
      const transformerName =
        typeof token === 'function' ? token.name : String(token);
      throw new Error(
        `No instance for transformer of type ${transformerName} was created, or \`useContainer\` was not called yet.`,
      );
    }

    return instance;
  }

  async resolveTransformer(
    options: TransformerResolverOptions & {
      nestContext: INestApplicationContext;
    },
  ): Promise<Transformer> {
    const { nestContext, strict, contextId, scoped, token } = options;

    if (scoped) {
      return nestContext.resolve(token, contextId, { strict });
    }

    return nestContext.get(token, { strict });
  }

  addTransformEntry<T>(
    type: Type<T> | Abstract<T>,
    options: TransformEntry,
  ): void {
    if (typeof type === 'function' && 'prototype' in type) {
      type = type.prototype;
    }

    const constructor = type.constructor;
    const entries: TransformEntry[] =
      Reflect.getMetadata(TRANSFORM_ENTRIES, constructor) || [];
    entries.push(options);
    Reflect.defineMetadata(TRANSFORM_ENTRIES, entries, constructor);
  }

  listTransformEntries<T>(type: Type<T> | Abstract<T>): TransformEntry[] {
    if (typeof type === 'function' && 'prototype' in type) {
      type = type.prototype;
    }

    const constructor = type.constructor;
    return Reflect.getMetadata(TRANSFORM_ENTRIES, constructor) || [];
  }

  private resolveOptions(
    options: AsyncTransformWithOptions,
  ): TransformerResolverOptions & { nestContext: INestApplicationContext } {
    const { select } = options;
    let nestContext = this.appContext;

    if (select) {
      nestContext = this.appContext.select(select);
    }

    const strict = options.strict ?? !!module;
    const scoped = options.scoped ?? false;
    const token = resolveToken(options.token);

    return { strict, scoped, token, nestContext };
  }
}

let context: TransformContext;

function getContext(): TransformContext {
  if (!context) {
    throw new Error('Async Transform context was not initialized yet.');
  }
  return context;
}

function resolveToken(token: TransformerToken): ResolvedTransformerToken {
  return typeof token === 'function' ? token() : token;
}

export interface UseContainerOptions {
  contextId?: ContextId;
  resolver?: Token<TransformerResolver>;
}

export async function useContainer(
  _appContext: INestApplicationContext,
  options: UseContainerOptions = {},
): Promise<void> {
  if (context) {
    throw new Error('The InjectedTransform mechanism was already initialized.');
  }

  context = new TransformContext(
    _appContext,
    options.contextId,
    options.resolver,
  );
}

export function AsyncTransform(
  fn: TransformerFunction,
  options?: AsyncTransformOptions,
): PropertyDecorator;
export function AsyncTransform(
  options: AsyncTransformOptions & { body: TransformerToken },
): PropertyDecorator;
export function AsyncTransform(
  _body:
    | TransformerFunction
    | (AsyncTransformOptions & { body: TransformerToken }),
  _options: AsyncTransformOptions = {},
): PropertyDecorator {
  let options = _options;

  if (typeof _body === 'function') {
    options.body = _body;
  } else {
    options = _body;
  }

  return (type: any, propertyKey) => {
    getContext().addTransformEntry(type, { propertyKey, options });
  };
}

export function AsyncTransformWith(
  useClass: TransformerToken,
  options?: AsyncTransformWithOptions,
): PropertyDecorator;
export function AsyncTransformWith(
  options: AsyncTransformWithOptions & { token: TransformerToken },
): PropertyDecorator;
export function AsyncTransformWith(
  _token:
    | TransformerToken
    | (AsyncTransformWithOptions & { token: TransformerToken }),
  _options: AsyncTransformWithOptions = {},
): PropertyDecorator {
  let options = _options;

  if (
    typeof _token === 'string' ||
    typeof _token === 'symbol' ||
    typeof _token === 'function'
  ) {
    options = { ..._options, token: _token };
  } else {
    options = _token;
  }

  return (type: any, propertyKey) => {
    getContext().addTransformEntry(type, { propertyKey, options });
  };
}

export function asyncPlainToClass<T, V>(
  type: ClassConstructor<T>,
  plain: V[],
  options?: ClassTransformOptions,
): Promise<T[]>;
export function asyncPlainToClass<T, V>(
  type: ClassConstructor<T>,
  plain: V,
  options?: ClassTransformOptions,
): Promise<T>;
export async function asyncPlainToClass<T, V>(
  type: ClassConstructor<T>,
  plains: V[] | V,
  callOptions: ClassTransformOptions = {},
): Promise<T[] | T> {
  const entries = getContext().listTransformEntries(type);
  for (const entry of entries) {
    const { propertyKey, options: decoratorOptions } = entry;
    const options: AnyTransformOptions = {
      ...callOptions,
      ...decoratorOptions,
    };

    const postTransform = async (transformed: T): Promise<T> => {
      const value = transformed[propertyKey];
      const key = String(propertyKey);
      const obj = transformed;
      const type = TransformationType.PLAIN_TO_CLASS;
      let propValue: unknown;

      if ('body' in decoratorOptions) {
        propValue = await decoratorOptions.body({
          value,
          key,
          obj,
          type,
          options,
        });
      } else if ('token' in decoratorOptions) {
        const transformer = await getContext().getTransformer(decoratorOptions);
        propValue = await transformer.transform({
          value,
          key,
          obj,
          type,
          options,
        });
      } else {
        // should never happen, tho
        throw new Error('Invalid transform configuration');
      }

      transformed[propertyKey] = propValue;
      return transformed;
    };

    if (Array.isArray(plains)) {
      const transformed = plainToClass(type, plains, callOptions);
      const result = await Promise.all(transformed.map(postTransform));
      return result;
    }

    const transformed = plainToClass(type, plains, callOptions);
    const result = await postTransform(transformed);
    return result;
  }
}
