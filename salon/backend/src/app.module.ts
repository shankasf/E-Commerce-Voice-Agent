import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ServicesModule } from './services/services.module';
import { StylistsModule } from './stylists/stylists.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CallsModule } from './calls/calls.module';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(__dirname, '../../..', '.env'),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ServicesModule,
    StylistsModule,
    AppointmentsModule,
    CustomersModule,
    DashboardModule,
    CallsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
