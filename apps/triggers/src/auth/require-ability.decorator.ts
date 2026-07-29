import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ABILITY_KEY = 'require_ability';

export interface RequireAbilityMetadata {
  action: string;
  subject: string;
}

export const RequireAbility = (metadata: RequireAbilityMetadata) =>
  SetMetadata(REQUIRE_ABILITY_KEY, metadata);
