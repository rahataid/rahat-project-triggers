export const BQUEUE = {
  SCHEDULE: 'SCHEDULE',
  TRIGGER: 'TRIGGER',
  CONTRACT: 'CONTRACT',
  COMMUNICATION: 'COMMUNICATION',
  STELLAR: 'STELLAR',
  STELLAR_TRIGGER: 'STELLAR_TRIGGER',
  NOTIFICATION_TRIGGER: 'NOTIFICATION_TRIGGER',
  BLOCKCHAIN_TRANSFER: 'BLOCKCHAIN_TRANSFER',
};
export const CORE_MODULE = 'RAHAT_CORE_PROJECT_CLIENT';

export const JOBS = {
  BLOCKCHAIN: {
    ADD_TRIGGER_BATCH: 'rahat.jobs.addTriggerBatch',
    ACTIVATE_TRIGGER: 'rahat.jobs.activateTrigger',
    UPDATE_SOURCE_VALUE: 'rahat.jobs.updateSourceValue',
    UPDATE_SOURCE_VALUE_BATCH: 'rahat.jobs.updateSourceValueBatch',
    CREATE_PHASE: 'rahat.jobs.createPhase',
  },
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
      TRIGGER: 'rahat.jobs.activities.communication.trigger',
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
    GET_ALL_GROUPS_BY_UUIDS: 'aa.jobs.beneficiary.getAllGroupsByUuids',
  },

  STAKEHOLDERS: {
    GET_ONE_GROUP: 'aa.jobs.stakeholders.getOneGroup',
    GET_ALL_GROUPS_BY_UUIDS: 'aa.jobs.stakeholders.getAllGroupsByUuids',
  },
  STELLAR: {
    ADD_ONCHAIN_TRIGGER_QUEUE: 'aa.jobs.stellar.addTriggerOnChain',
    UPDATE_ONCHAIN_TRIGGER_PARAMS_QUEUE: 'aa.jobs.stellar.updateTriggerOnChain',
    DISBURSE: 'jobs.stellar.disburse',
  },
  CHAIN: {
    DISBURSE: 'aa.jobs.chain.disburse',
    SEND_OTP: 'aa.jobs.chain.sendOtp',
    SEND_ASSET: 'aa.jobs.chain.sendAsset',
  },
  STATS: {
    GET_STATS: 'ms.jobs.triggers.get_stats',
    GET_ONE: 'aa.jobs.stats.getOne',
    MS_TRIGGERS_STATS: 'rahat.jobs.ms.trigggers.stats',
  },
  NOTIFICATION: {
    CREATE: 'rahat.jobs.notification.create',
  },
};

export const MS_TRIGGERS_JOBS = {
  TRIGGER: {
    DEV_ONLY: 'ms.jobs.triggers.devOnly',
    GET_ALL: 'ms.jobs.triggers.getAll',
    GET_ONE: 'ms.jobs.triggers.getOne',
    ADD: 'ms.jobs.triggers.add',
    REMOVE: 'ms.jobs.triggers.remove',
    UPDATE: 'ms.jobs.triggers.update',
    UPDATE_TRANSCTION: 'ms.jobs.triggers.updateTransaction',
    ACTIVATE: 'ms.jobs.triggers.activate',
    GET_BY_LOCATION: 'ms.jobs.triggers.getByLocation',
  },

  PHASES: {
    CREATE: 'ms.jobs.phases.create',
    ACTIVATE: 'ms.jobs.phases.activate',
    GET_ONE: 'ms.jobs.phases.getOne',
    GET_ALL: 'ms.jobs.phases.getAll',
    GET_STATS: 'ms.jobs.phases.getStats',
    ADD_TRIGGERS: 'ms.jobs.phases.addTriggers',
    REVERT_PHASE: 'ms.jobs.phases.revertPhase',
    GET_BY_LOCATION: 'ms.jobs.phases.getByLocation',
    CONFIGURE_THRESHOLD: 'ms.jobs.phase.configureThreshold',
  },
  WATER_LEVELS: {
    GET_DHM: 'ms.jobs.waterLevels.getDhm',
    GET_DHM_SINGLE_SERIES: 'ms.jobs.waterLevels.getDhmSingleSeries',
    // GET_GLOFAS: 'ms.jobs.waterLevels.getGlofas',
    GET_GFH: 'ms.jobs.waterLevels.getGfh',
  },
  RAINFALL_LEVELS: {
    GET_DHM: 'ms.jobs.rainfallLevels.getDhm',
  },
  PROB_FLOOD: {
    GET_ALL_GLOFAS: 'ms.jobs.probFlood.getAllGlofas',
    GET_ONE_GLOFAS: 'ms.jobs.probFlood.getOneGlofas',
  },
  SOURCE: {
    GET_ALL: 'ms.jobs.sources.getAll',
    GET_ONE: 'ms.jobs.sources.getOne',
    GET_HEALTH: 'ms.jobs.sources.getHealth',
  },
  SOURCE_DATA: {
    GET_SERIES_BY_DATA_SOURCE: 'ms.jobs.sources-data.getSeriesByDataSource',
  },
  ACTIVITIES: {
    GET_ONE: 'ms.jobs.activities.getOne',
    GET_ALL: 'ms.jobs.activities.getAll',
    GET_HAVING_COMMS: 'ms.jobs.activities.getHavingComms',
    GET_COMMS: 'ms.jobs.activities.getComms',
    ADD: 'ms.jobs.activities.add',
    REMOVE: 'ms.jobs.activities.remove',
    UPDATE: 'ms.jobs.activities.update',
    UPDATE_STATUS: 'ms.jobs.activities.updateStatus',
    LIST_PROJECT_SPECIFIC: 'ms.jobs.activities.listProjectSpecific',
    COMMUNICATION: {
      TRIGGER: 'ms.jobs.activity.communication.trigger',
      SESSION_LOGS: 'ms.jobs.activities.communication.sessionLogs',
      // RETRY_FAILED: 'ms.jobs.activities.communication.retryFailed',
      GET_STATS: 'ms.jobs.activities.communication.getStats',
      GET_STATS_GROUP: 'ms.jobs.triggers.getTransportSessionStatsByGroup',
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
    GET_Gauge_Reading: 'ms.jobs.dailyMonitoring.getGaugeReading',
    GET_Gauge_Forecast: 'ms.jobs.dailyMonitoring.getGaugeForecast',
    GET_ONE: 'ms.jobs.dailyMonitoring.getOne',
    UPDATE: 'ms.jobs.dailyMonitoring.update',
    REMOVE: 'ms.jobs.dailyMonitoring.remove',
    DELETE: 'ms.jobs.dailyMonitoring.delete',
  },
  REVERT_PHASE: {
    CREATE: 'ms.jobs.revertPhase.create',
    GET_ALL: 'ms.jobs.revertPhase.getAll',
    GET_ONE: 'ms.jobs.revertPhase.getOne',
  },
  SETTINGS: {
    GET: 'ms.jobs.settings.get',
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
  NOTIFICATION: {
    CREATE: 'events.notification.create',
  },
};

export const MS_TRIGGER_CLIENTS = {
  RAHAT: 'RAHAT_TRIGGER_CLIENT',
};
