import "reflect-metadata";
import {
  Controller,
  Get,
  Inject,
  Module,
  ValidationPipe,
  type DynamicModule,
  type INestApplication,
  type OnApplicationShutdown,
  type Type,
} from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { JwtAuthGuard, Public } from "./auth";
import { Database } from "./database";
import { EventBus } from "./event-bus";

// Everything the eight services set up the same way: database, event bus,
// auth guard, /health, and OpenAPI docs. A service's own module only has to
// list its controllers and providers (the three layers from the paper:
// REST controller -> service -> repository).

export const SERVICE_NAME = "WAH_SERVICE_NAME";

export interface ServiceOptions {
  // short name, also the URL prefix behind Kong: /api/<name>/...
  name: string;
  // absolute path to the service's db/ folder
  migrationsDir: string;
}

function requireEnv(key: string) {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not set`);
  return value;
}

@Controller()
class HealthController {
  constructor(
    @Inject(SERVICE_NAME) private readonly name: string,
    private readonly database: Database,
    private readonly bus: EventBus,
  ) {}

  // Kong, Docker's healthcheck, and the IT portal's Architecture tab all read this
  @Public()
  @Get("health")
  async health() {
    const database = await this.database.isHealthy();
    return {
      service: this.name,
      status: database ? "up" : "degraded",
      database: database ? "up" : "down",
      // a service with the bus down still serves requests; events wait in memory
      eventBus: this.bus.isConnected ? "up" : "reconnecting",
      checkedAt: new Date().toISOString(),
    };
  }
}

class ShutdownHooks implements OnApplicationShutdown {
  constructor(
    private readonly database: Database,
    private readonly bus: EventBus,
  ) {}

  async onApplicationShutdown() {
    await this.bus.close();
    await this.database.close();
  }
}

@Module({})
export class WahServiceModule {
  static register(options: ServiceOptions): DynamicModule {
    return {
      module: WahServiceModule,
      global: true,
      controllers: [HealthController],
      providers: [
        { provide: SERVICE_NAME, useValue: options.name },
        {
          provide: Database,
          useFactory: async () => {
            const database = new Database({
              connectionString: requireEnv("DATABASE_URL"),
              migrationsDir: options.migrationsDir,
              seed: process.env.SEED_DATABASE !== "false",
              ssl: process.env.DATABASE_SSL === "require" ? "require" : undefined,
            });
            await database.connect();
            return database;
          },
        },
        {
          provide: EventBus,
          inject: [Database],
          useFactory: async (database: Database) => {
            const bus = new EventBus(requireEnv("RABBITMQ_URL"), options.name, database);
            // doesn't throw: if RabbitMQ isn't up yet it keeps retrying in the background
            await bus.connect();
            return bus;
          },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        {
          provide: ShutdownHooks,
          inject: [Database, EventBus],
          useFactory: (database: Database, bus: EventBus) => new ShutdownHooks(database, bus),
        },
      ],
      exports: [SERVICE_NAME, Database, EventBus],
    };
  }
}

export interface BootstrapOptions {
  name: string;
  title: string;
  description: string;
}

// The global prefix matches the public path, so Kong forwards /api/<name>/...
// as is. We tried stripping the prefix at Kong, but then the Swagger UI
// asset links pointed at the wrong place.
export async function bootstrapService(appModule: Type<unknown>, options: BootstrapOptions) {
  const app: INestApplication = await NestFactory.create(appModule, { bufferLogs: false });
  const prefix = `api/${options.name}`;
  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle(options.title)
      .setDescription(options.description)
      .setVersion("0.1.0")
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup(`${prefix}/docs`, app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`[${options.name}] listening on :${port}, docs at /${prefix}/docs`);
  return app;
}
