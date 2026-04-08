/**
 * Query Invalidation Strategy
 * FASE 4: Skill - Comprehensive Query Cache Invalidation
 *
 * Defines all query keys and exhaustive invalidation patterns
 * for different entity types and events.
 */

import type { QueryClient } from '@tanstack/react-query';

export type EntityType = 'episode' | 'content' | 'distribution' | 'publication' | 'user' | 'system';

export interface QueryInvalidationMap {
  entity: EntityType;
  keys: (id?: string) => (string | (string | string[])[][])[];
  triggers: ('create' | 'update' | 'delete' | 'publish' | 'error')[];
}

/**
 * Query invalidation patterns by entity
 */
export const QUERY_INVALIDATION_PATTERNS: Record<EntityType, QueryInvalidationMap> = {
  episode: {
    entity: 'episode',
    keys: (id) => [
      id ? ['episode', id] : ['episode'],
      id ? ['episode-detail', id] : ['episode-list'],
      id ? ['episode-metrics-summary', id] : ['episode-metrics'],
      id ? ['automation-logs', id] : ['automation-logs'],
      id ? ['episode-draft', id] : ['drafts'],
    ],
    triggers: ['create', 'update', 'delete', 'publish', 'error'],
  },
  content: {
    entity: 'content',
    keys: (id) => [
      id ? ['content', id] : ['content'],
      id ? ['content-pieces', id] : ['content-list'],
      ['content-factory-cache'],
    ],
    triggers: ['create', 'update', 'delete', 'publish'],
  },
  distribution: {
    entity: 'distribution',
    keys: (id) => [
      id ? ['distribution', id] : ['distribution'],
      ['distribution-queue'],
      ['distribution-history'],
      ['platform-sync-status'],
    ],
    triggers: ['create', 'update', 'delete', 'publish', 'error'],
  },
  publication: {
    entity: 'publication',
    keys: (id) => [
      id ? ['publication', id] : ['publication'],
      ['publications-list'],
      ['publication-schedule'],
    ],
    triggers: ['create', 'update', 'delete', 'publish'],
  },
  user: {
    entity: 'user',
    keys: () => [
      ['user-profile'],
      ['user-preferences'],
      ['user-integrations'],
      ['user-auth-status'],
    ],
    triggers: ['update', 'error'],
  },
  system: {
    entity: 'system',
    keys: () => [
      ['system-health'],
      ['system-config'],
      ['integration-status'],
      ['cron-status'],
    ],
    triggers: ['update', 'error'],
  },
};

/**
 * Invalidate all queries for an entity
 */
export async function invalidateEntity(
  queryClient: QueryClient,
  entityType: EntityType,
  entityId?: string,
) {
  const pattern = QUERY_INVALIDATION_PATTERNS[entityType];
  const keys = pattern.keys(entityId);

  await Promise.all(
    keys.map((key) =>
      queryClient.invalidateQueries({
        queryKey: key as any,
      }),
    ),
  );
}

/**
 * Invalidate queries on 401 error (session expired)
 */
export async function invalidateOnSessionError(queryClient: QueryClient) {
  // User-specific queries should be invalidated
  await invalidateEntity(queryClient, 'user');
  // System health might be affected
  await invalidateEntity(queryClient, 'system');
}

/**
 * Invalidate queries after successful operation
 */
export async function invalidateAfterOperation(
  queryClient: QueryClient,
  entityType: EntityType,
  entityId?: string,
  _trigger?: 'create' | 'update' | 'delete' | 'publish' = 'update',
) {
  await invalidateEntity(queryClient, entityType, entityId);
}

/**
 * Refetch specific queries immediately
 */
export async function refetchEntity(
  queryClient: QueryClient,
  entityType: EntityType,
  entityId?: string,
) {
  const pattern = QUERY_INVALIDATION_PATTERNS[entityType];
  const keys = pattern.keys(entityId);

  return Promise.all(
    keys.map((key) =>
      queryClient.refetchQueries({
        queryKey: key as any,
      }),
    ),
  );
}
