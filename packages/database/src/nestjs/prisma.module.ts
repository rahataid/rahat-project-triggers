import { DynamicModule, Module, Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PrismaModuleAsyncOptions,
  PrismaModuleOptions,
  PrismaOptionsFactory,
} from './interfaces';
import { PRISMA_SERVICE_OPTIONS } from './prisma.constants';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {
  private static readonly logger = new Logger(PrismaModule.name);

  /**
   * Register PrismaModule with automatic DATABASE_URL construction from environment variables
   * Priority: DATABASE_URL > individual DB_* variables
   */
  static forRootWithConfig(
    options: Omit<PrismaModuleOptions, 'prismaServiceOptions'> = {},
  ): DynamicModule {
    return {
      global: options.isGlobal,
      module: PrismaModule,
      imports: [],
      providers: [
        {
          provide: PRISMA_SERVICE_OPTIONS,
          useFactory: (configService: ConfigService) => {
            return this.createPrismaOptionsFromConfig(configService);
          },
          inject: [ConfigService],
        },
        PrismaService,
      ],
      exports: [PrismaService],
    };
  }

  /**
   * Create Prisma options from ConfigService with automatic DATABASE_URL construction
   */
  private static createPrismaOptionsFromConfig(configService: ConfigService) {
    // Check if DATABASE_URL is directly provided
    let databaseUrl = configService.get<string>('DATABASE_URL');

    if (databaseUrl) {
      this.logger.log('Using DATABASE_URL from environment variables');
    } else {
      // Construct DATABASE_URL from individual components
      const dbHost = configService.get('DB_HOST', 'localhost');
      const dbPort = configService.get('DB_PORT', '5432');
      const dbUser = configService.get(
        'DB_USERNAME',
        configService.get<string>('DB_USER', 'postgres'),
      );
      const dbPassword = configService.get('DB_PASSWORD', 'postgres');
      const dbName = configService.get(
        'DB_NAME',
        configService.get<string>('DB_DATABASE', 'postgres'),
      );
      const dbSchema = configService.get('DB_SCHEMA', 'public');

      databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=${dbSchema}`;
      this.logger.log(
        'Constructed DATABASE_URL from individual environment variables',
      );
    }

    this.logger.debug(
      `Database URL: ${databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`,
    ); // Log with masked credentials

    return {
      explicitConnect: true,
      prismaOptions: {
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      },
    };
  }

  static forRoot(options: PrismaModuleOptions = {}): DynamicModule {
    return {
      global: options.isGlobal,
      module: PrismaModule,
      providers: [
        {
          provide: PRISMA_SERVICE_OPTIONS,
          useValue: options.prismaServiceOptions,
        },
      ],
    };
  }

  static forRootAsync(options: PrismaModuleAsyncOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: PrismaModule,
      imports: options.imports || [],
      providers: this.createAsyncProviders(options),
    };
  }

  private static createAsyncProviders(
    options: PrismaModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return this.createAsyncOptionsProvider(options);
    }

    const providers = [...this.createAsyncOptionsProvider(options)];

    if (options.useClass) {
      providers.push({
        provide: options.useClass,
        useClass: options.useClass,
      });
    }

    return providers;
  }

  private static createAsyncOptionsProvider(
    options: PrismaModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: PRISMA_SERVICE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    const injectionToken = options.useExisting || options.useClass;
    if (!injectionToken) {
      throw new Error('Either useExisting or useClass must be provided');
    }

    return [
      {
        provide: PRISMA_SERVICE_OPTIONS,
        useFactory: async (optionsFactory: PrismaOptionsFactory) =>
          await optionsFactory.createPrismaOptions(),
        inject: [injectionToken],
      },
    ];
  }
}
