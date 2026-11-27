import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS } from 'src/constant';
import { TriggerCallbackService } from './trigger-callback.service';

/**
 * Keeps trigger callbacks in sync when the trigger or activity they link to changes.
 * Triggers and activities are soft-deleted, so the DB cascade never runs; these
 * handlers do that cleanup. Errors are logged and swallowed so they never fail the
 * delete/update request that emitted the event.
 */
@Injectable()
export class TriggerCallbackListener {
  private readonly logger = new Logger(TriggerCallbackListener.name);

  constructor(private readonly triggerCallbackService: TriggerCallbackService) {}

  @OnEvent(EVENTS.TRIGGER_DELETED)
  async onTriggerDeleted(event: { triggerUuid?: string }) {
    if (!event?.triggerUuid) return;
    try {
      const result = await this.triggerCallbackService.removeByTrigger(
        event.triggerUuid,
      );
      this.logger.log(
        `Removed ${result?.count ?? 0} callback(s) of deleted trigger ${event.triggerUuid}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to remove callbacks for deleted trigger ${event.triggerUuid}: ${error.message}`,
      );
    }
  }

  @OnEvent(EVENTS.ACTIVITY_DELETED)
  async onActivityDeleted(event: { activityUuid?: string }) {
    if (!event?.activityUuid) return;
    try {
      const result = await this.triggerCallbackService.removeByActivity(
        event.activityUuid,
      );
      this.logger.log(
        `Removed ${result?.count ?? 0} callback(s) linked to deleted activity ${event.activityUuid}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to remove callbacks for deleted activity ${event.activityUuid}: ${error.message}`,
      );
    }
  }

  @OnEvent(EVENTS.ACTIVITY_COMMUNICATIONS_REMOVED)
  async onActivityCommunicationsRemoved(event: {
    activityUuid?: string;
    communicationIds?: string[];
  }) {
    if (!event?.activityUuid || !event.communicationIds?.length) return;
    try {
      await this.triggerCallbackService.pruneCommunications(
        event.activityUuid,
        event.communicationIds,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to prune callbacks for activity ${event.activityUuid}: ${error.message}`,
      );
    }
  }
}
