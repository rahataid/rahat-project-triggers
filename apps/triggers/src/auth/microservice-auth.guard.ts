import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JOBS, MS_TRIGGER_CLIENTS } from 'src/constant';
import { AbilityCheckResponse } from './ability-check-response.interface';
import {
  REQUIRE_ABILITY_KEY,
  RequireAbilityMetadata,
} from './require-ability.decorator';

@Injectable()
export class MicroserviceAuthGuard implements CanActivate {
  private readonly logger = new Logger(MicroserviceAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(MS_TRIGGER_CLIENTS.AUTH_SERVICE)
    private readonly authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredAbility = this.reflector.get<RequireAbilityMetadata>(
      REQUIRE_ABILITY_KEY,
      context.getHandler(),
    );

    if (!requiredAbility) {
      return true;
    }

    const payload = context.switchToRpc().getData();
    const userId = payload?.user?.id;
    const projectId = payload?.appId;

    if (!projectId) {
      throw new ForbiddenException('Project id not found.');
    }

    if (!userId) {
      throw new ForbiddenException('Authorization failed: missing user');
    }
    const checkRequest = {
      userId,
      projectId,
      action: requiredAbility.action,
      subject: requiredAbility.subject,
    };

    const result = await firstValueFrom(
      this.authClient.send<AbilityCheckResponse>(
        { cmd: JOBS.AUTH.CHECK_ABILITY },
        checkRequest,
      ),
    ).catch((err) => {
      this.logger.error('Auth service error:', err);
      throw new ForbiddenException('Authorization failed');
    });

    if (!result.allowed) {
      throw new ForbiddenException(result.reason || 'Access denied');
    }

    return true;
  }
}
