import { z } from 'zod';
import {
  activityCommunicationConfigSchema,
  internalEventConfigSchema,
  msEventConfigSchema,
  webhookConfigSchema,
} from './validation/callback-config.schema';

export type ActivityCommunicationConfig = z.infer<
  typeof activityCommunicationConfigSchema
>;
export type WebhookConfig = z.infer<typeof webhookConfigSchema>;
export type MsEventConfig = z.infer<typeof msEventConfigSchema>;
export type InternalEventConfig = z.infer<typeof internalEventConfigSchema>;

export interface TriggerCallbackContext {
  event: 'trigger.activated';
  triggeredAt: string;
  trigger: {
    uuid: string;
    repeatKey: string;
    title: string | null;
    logicKey: string | null;
    source: string | null;
    isMandatory: boolean;
    triggeredBy: string | null;
    triggerStatement: unknown;
  };
  phase: {
    uuid: string;
    name: string;
    activeYear: string;
    riverBasin: string;
  } | null;
  appId?: string;
}

export interface CallbackDispatchJobData {
  callbackUuid: string;
  triggerUuid: string;
  appId?: string;
  context: TriggerCallbackContext;
}
