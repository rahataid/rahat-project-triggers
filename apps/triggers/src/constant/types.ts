export interface ActivityCommunicationData {
  communicationId?: string;
  groupType: 'STAKEHOLDERS' | 'BENEFICIARY';
  groupId: string;
  communicationType?: string;
  message?: string;
  audioURL?: { mediaURL: string; fileName: string };
  isScheduled?: boolean;
  scheduledAt?: string;
}

export enum SessionStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SCHEDULED = 'SCHEDULED',
}
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
