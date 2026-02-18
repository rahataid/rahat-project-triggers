import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ABILITY_KEY,
  AbilityRequirement,
} from '../decorators/require-ability.decorator';
import { JOBS, MS_TRIGGER_CLIENTS } from 'src/constant';
import {
  AbilityCheckRequest,
  AbilityCheckResponse,
} from 'src/types/auth-guard.type';

@Injectable()
export class MicroserviceAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(MS_TRIGGER_CLIENTS.AUTH_SERVICE) private authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.get<AbilityRequirement>(
      ABILITY_KEY,
      context.getHandler(),
    );

    if (!requirement) {
      return true; // No ability requirement
    }
    // check if authClient is connected
    if (!this.authClient) {
      console.error('Auth client not available');
      throw new ForbiddenException('Authorization service unavailable');
    }

    const data = context.switchToRpc().getData();
    const user = data.user;

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // Build check request
    const checkRequest: AbilityCheckRequest = {
      user,
      action: requirement.action,
      subject: requirement.subject,
      subjectId: data.id || data[requirement.subject.toLowerCase() + 'Id'],
      conditions: requirement.conditions,
    };

    // Call Auth Service
    const result = await firstValueFrom(
      this.authClient.send<AbilityCheckResponse>(
        { cmd: JOBS.AUTH.CHECK_ABILITY },
        checkRequest,
      ),
    ).catch((err) => {
      console.error('Auth service error:', err);
      throw new ForbiddenException('Authorization failed');
    });
    if (!result.allowed) {
      throw new ForbiddenException(result.reason || 'Access denied');
    }
    return true;
  }
}
