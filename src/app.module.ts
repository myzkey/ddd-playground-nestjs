import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AccountModule } from './module/account.module'
import { OrderModule } from './module/order.module'
import { AssignmentModule } from './module/assignment.module'
import { DeliveryEventModule } from './module/delivery-event.module'
import { databaseConfig } from './config/database.config'

@Module({
  imports: [
    TypeOrmModule.forRoot(databaseConfig),
    AccountModule,
    OrderModule,
    AssignmentModule,
    DeliveryEventModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
