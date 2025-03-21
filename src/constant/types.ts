export interface ActivityCommunicationData {
  groupType: 'STAKEHOLDERS' | 'BENEFICIARY';
  groupId: string;
  communicationType: string;
  message?: string;
  audioURL?: { mediaURL: string; fileName: string };
}

export declare enum SessionStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
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
