import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { AccountOrmEntity } from '~/infra/database/entity/account.orm-entity'
import { OrderOrmEntity } from '~/infra/database/entity/order.orm-entity'
import { AssignmentOrmEntity } from '~/infra/database/entity/assignment.orm-entity'
import { DeliveryEventOrmEntity } from '~/infra/database/entity/delivery-event.orm-entity'

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'sample_nestjs',
  entities: [
    AccountOrmEntity,
    OrderOrmEntity,
    AssignmentOrmEntity,
    DeliveryEventOrmEntity,
  ],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
}
