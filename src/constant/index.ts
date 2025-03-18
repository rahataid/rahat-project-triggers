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
    ASSIGN_TOKEN: 'rahat.jobs.payout.assign_token',
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
      GET_SESSION: 'rahat.jobs.communication.session',
      GET_TRANSPORT_DETAILS: 'rahat.jobs.communication.transport_details ',
      BROAD_CAST_CREATE: 'rahat.jobs.communication.broad_cast_create',
    },
  },

  BENEFICIARY: {
    GET_BENEFICIARIES_COUNT: 'rahat.jobs.beneficiary.count',
    GET_ONE_GROUP: 'aa.jobs.beneficiary.getOneGroup',
  },

  STAKEHOLDERS: {
    GET_ONE_GROUP: 'aa.jobs.stakeholders.getOneGroup',
  },
};

export const MS_TRIGGERS_JOBS = {
  TRIGGER: {
    DEV_ONLY: 'ms.jobs.triggers.devOnly',
    GET_ALL: 'ms.jobs.triggers.getAll',
    GET_ONE: 'ms.jobs.triggers.getOne',
    ADD: 'ms.jobs.triggers.add',
    REMOVE: 'ms.jobs.triggers.remove',
    ACTIVATE: 'ms.jobs.triggers.activate',
    GET_BY_LOCATION: 'ms.jobs.triggers.getByLocation',
  },

  PHASES: {
    GET_ONE: 'ms.jobs.phases.getOne',
    GET_ALL: 'ms.jobs.phases.getAll',
    GET_STATS: 'ms.jobs.phases.getStats',
    ADD_TRIGGERS: 'ms.jobs.phases.addTriggers',
    REVERT_PHASE: 'ms.jobs.phases.revertPhase',
  },
  RIVER_STATIONS: {
    GET_DHM: 'ms.jobs.riverStations.getDhm',
  },
  WATER_LEVELS: {
    GET_DHM: 'ms.jobs.waterLevels.getDhm',
    GET_GLOFAS: 'ms.jobs.waterLevels.getGlofas',
  },
  ACTIVITIES: {
    GET_ONE: 'ms.jobs.activities.getOne',
    GET_ALL: 'ms.jobs.activities.getAll',
    GET_HAVING_COMMS: 'ms.jobs.activities.getHavingComms',
    ADD: 'ms.jobs.activities.add',
    REMOVE: 'ms.jobs.activities.remove',
    UPDATE: 'ms.jobs.activities.update',
    UPDATE_STATUS: 'ms.jobs.activities.updateStatus',
    COMMUNICATION: {
      TRIGGER: 'ms.jobs.activity.communication.trigger',
      SESSION_LOGS: 'ms.jobs.activities.communication.sessionLogs',
      // RETRY_FAILED: 'ms.jobs.activities.communication.retryFailed',
      GET_STATS: 'ms.jobs.activities.communication.getStats',
    },
  },
  CATEGORIES: {
    GET_ALL: 'ms.jobs.categories.getAll',
    ADD: 'ms.jobs.categories.add',
    REMOVE: 'ms.jobs.categories.remove',
  },

  DAILY_MONITORING: {
    ADD: 'ms.jobs.dailyMonitoring.add',
    GET_ALL: 'ms.jobs.dailyMonitoring.getAll',
    GET_ONE: 'ms.jobs.dailyMonitoring.getOne',
    UPDATE: 'ms.jobs.dailyMonitoring.update',
    REMOVE: 'ms.jobs.dailyMonitoring.remove',
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

export enum ValidationAddress {
  ANY = 'ANY',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export enum TransportType {
  SMTP = 'SMTP',
  VOICE = 'VOICE',
  API = 'API',
  SES = 'SES',
  ECHO = 'ECHO',
}
