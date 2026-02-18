export interface UserContext {
  userId: string;
  email: string;
  tenantId: string;
  roles: string[]; // Role IDs or names for this tenant
  permissions?: string[]; // Cached permission list
  metadata?: Record<string, any>; // Additional context like department, project
}
export interface AuthenticatedPayload {
  user: UserContext;
  [key: string]: any;
}

export interface AbilityCheckRequest {
  user: UserContext;
  action: string;
  subject: string;
  subjectId?: string; // ID of the resource being accessed
  conditions?: Record<string, any>; // Runtime conditions
}

export interface AbilityCheckResponse {
  allowed: boolean;
  reason?: string;
  grantedPermissions?: string[];
}
