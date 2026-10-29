import { z } from 'zod';
import { TriggerCallbackType } from '@lib/database';

export const activityCommunicationConfigSchema = z.object({
  activityUuid: z.string().min(1, 'activityUuid is required'),
  communicationIds: z.array(z.string()).optional(),
  appId: z.string().optional(),
});

export const webhookConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['POST', 'PUT', 'PATCH']).optional().default('POST'),
  headers: z.record(z.string()).optional(),
  secret: z.string().optional(),
  timeoutMs: z.number().int().positive().optional().default(15000),
  includePayload: z.boolean().optional().default(true),
});

export const msEventConfigSchema = z.object({
  cmd: z.string().min(1, 'cmd is required'),
  appId: z.string().optional(),
  payload: z.record(z.any()).optional(),
});

export const internalEventConfigSchema = z.object({
  event: z.string().min(1, 'event is required'),
  payload: z.record(z.any()).optional(),
});

const configSchemaByType: Record<TriggerCallbackType, z.ZodTypeAny> = {
  [TriggerCallbackType.ACTIVITY_COMMUNICATION]:
    activityCommunicationConfigSchema,
  [TriggerCallbackType.WEBHOOK]: webhookConfigSchema,
  [TriggerCallbackType.MS_EVENT]: msEventConfigSchema,
  [TriggerCallbackType.INTERNAL_EVENT]: internalEventConfigSchema,
};

export function parseCallbackConfig(
  type: TriggerCallbackType,
  config: unknown,
) {
  const schema = configSchemaByType[type];
  const result = schema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid config for callback type ${type}: ${result.error.message}`,
    );
  }
  return result.data;
}
