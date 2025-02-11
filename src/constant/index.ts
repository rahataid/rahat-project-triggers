export const BQUEUE = {
  SCHEDULE: 'SCHEDULE',
  TRIGGER: 'TRIGGER',
  CONTRACT: 'CONTRACT',
  COMMUNICATION: 'COMMUNICATION',
};

export const JOBS = {
  SCHEDULE: {
    ADD: 'rahat.jobs.schedule.add',
  },
  PAYOUT: {
    ASSIGN_TOKEN: 'rahat.jobs.payout.assignToken',
  },
  TRIGGER: {
    ADD: 'rahat.jobs.trigger.add',
    REACHED_THRESHOLD: 'rahat.jobs.trigger.reachedThreshold',
  },
  ACTIVITIES: {
    GET_ONE: 'rahat.jobs.activities.getOne',
    GET_ALL: 'rahat.jobs.activities.getAll',
    GET_HAVING_COMMS: 'rahat.jobs.activities.getHavingComms',
    ADD: 'rahat.jobs.activities.add',
    REMOVE: 'rahat.jobs.activities.remove',
    UPDATE: 'rahat.jobs.activities.update',
    UPDATE_STATUS: 'rahat.jobs.activities.updateStatus',
    COMMUNICATION: {
      TRIGGER_CAMPAIGN: 'rahat.jobs.communication.trigger_campaign',
      SESSION_LOGS: 'rahat.jobs.activities.communication.sessionLogs',
      RETRY_FAILED: 'rahat.jobs.activities.communication.retryFailed',
      GET_STATS: 'rahat.jobs.activities.communication.getStats',
    },
  },

  BENEFICIARY: {
    GET_BENEFICIARIES_COUNT: 'rahat.jobs.beneficiary.count',
  },
};

export const EVENTS = {
  PHASE_ACTIVATED: 'events.phase_activated',
  PHASE_REVERTED: 'events.phase_reverted',
  ACTIVITY_COMPLETED: 'events.activity_completed',
  ACTIVITY_DELETED: 'events.activity_deleted',
  ACTIVITY_ADDED: 'events.activity_added',
  BENEFICIARY_CREATED: 'events.beneficiary_created',
  BENEFICIARY_REMOVED: 'events.beneficiary_updated',
  BENEFICIARY_UPDATED: 'events.beneficiary_updated',
  AUTOMATED_TRIGGERED: 'events.automated_triggered',
  TOKEN_RESERVED: 'events.token_reserved',
};

export const MS_TRIGGER_CLIENTS = {
  RAHAT: 'RAHAT_TRIGGER_CLIENT',
};
