import { SetMetadata } from '@nestjs/common';

export interface AbilityRequirement {
  action: string; // 'create', 'read', 'update', 'delete'
  subject: string; // 'Triggers', 'Activities', 'Sources', etc.
  conditions?: any;
}

export const ABILITY_KEY = 'ability';
export const RequireAbility = (requirement: AbilityRequirement) =>
  SetMetadata(ABILITY_KEY, requirement);
