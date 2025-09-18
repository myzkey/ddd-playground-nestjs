import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm'

@Entity('delivery_event')
@Index('idx_event_order_time', ['orderId', 'occurredAt'])
@Index('idx_event_type', ['type'])
export class DeliveryEventOrmEntity {
  @PrimaryColumn('text')
  id: string

  @Column('text', { name: 'order_id' })
  orderId: string

  @Column('text', { name: 'courier_id', nullable: true })
  courierId: string | null

  @Column('text', { name: 'type' })
  type: string

  @Column('text', { name: 'payload_json', nullable: true })
  payloadJson: string | null

  @CreateDateColumn({ name: 'occurred_at' })
  occurredAt: Date
}
