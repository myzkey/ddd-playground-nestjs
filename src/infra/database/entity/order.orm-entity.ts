import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm'

@Entity('order')
@Index('idx_order_shipper', ['shipperId'])
@Index('idx_order_status', ['status'])
export class OrderOrmEntity {
  @PrimaryColumn('text')
  id: string

  @Column('text', { name: 'shipper_id' })
  shipperId: string

  @Column('text', { name: 'status' })
  status: string // 'PLACED' | 'READY_TO_SHIP' | 'ASSIGNED' | 'DELIVERED' | 'CANCELLED'

  @Column('text', { name: 'pickup_address' })
  pickupAddress: string

  @Column('text', { name: 'dropoff_address' })
  dropoffAddress: string

  @Column('timestamp', { name: 'pickup_start_at', nullable: true })
  pickupStartAt: Date | null

  @Column('timestamp', { name: 'pickup_end_at', nullable: true })
  pickupEndAt: Date | null

  @Column('timestamp', { name: 'drop_start_at', nullable: true })
  dropStartAt: Date | null

  @Column('timestamp', { name: 'drop_end_at', nullable: true })
  dropEndAt: Date | null

  @Column('real', { name: 'total_weight_kg', default: 0 })
  totalWeightKg: number

  @Column('text', { name: 'notes', nullable: true })
  notes: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
