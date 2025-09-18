import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm'

@Entity('assignment')
@Index('idx_assignment_courier', ['courierId'])
@Index('idx_assignment_status', ['status'])
@Unique('uq_assignment_order', ['orderId'])
export class AssignmentOrmEntity {
  @PrimaryColumn('text')
  id: string

  @Column('text', { name: 'order_id', unique: true })
  orderId: string

  @Column('text', { name: 'courier_id' })
  courierId: string

  @Column('text', { name: 'status' })
  status: string // 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'

  @CreateDateColumn({ name: 'offered_at' })
  offeredAt: Date

  @Column('timestamp', { name: 'responded_at', nullable: true })
  respondedAt: Date | null
}
