import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { AuthModule } from './auth/auth.module';
import { MainAuthGuard } from './auth/main-auth.guard';
import { DbModule } from './db/db.module';
import { EventBusModule } from './eventbus/eventbus.module';
import { DbIndicator } from './health/db.indicator';
import { HealthController } from './health/health.controller';
import { QueueModule } from './queue/queue.module';
import { SupabaseModule } from './supabase/supabase.module';
import { PaginationService } from './utils/pagination.service';

@Module({
  imports: [
    DbModule,
    SupabaseModule,
    EventBusModule,
    QueueModule,
    TerminusModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    DbIndicator,
    PaginationService,
    { provide: APP_GUARD, useClass: MainAuthGuard },
  ],
  exports: [
    DbModule,
    SupabaseModule,
    EventBusModule,
    QueueModule,
    AuthModule,
    PaginationService,
  ],
})
export class CommonModule {}
