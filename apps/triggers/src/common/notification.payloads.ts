
export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH', // web + mobile push
}

export enum AudienceType {
  USER = 'USER',
  ROLE = 'ROLE',
  PERMISSION = 'PERMISSION',
  PROJECT_MEMBERS = 'PROJECT_MEMBERS',
  ALL = 'ALL',
}

export type NotificationPermission = { action: string; subject: string };

export type NotificationAudienceSelector = {
  permissions?: NotificationPermission[];
  roles?: string[];
  userIds?: string[];
  projectMembers?: boolean;
  all?: boolean;
};

export type NotificationAudience = NotificationAudienceSelector & {
  exclude?: NotificationAudienceSelector;
};

/** The ONE payload every sender sends to `rahat.jobs.notification.create`. */
export type NotificationPayload = {
  projectId?: string;
  title: string;
  description: string;
  group: string;
  audience: NotificationAudience;
  channels: NotificationChannel[];
};