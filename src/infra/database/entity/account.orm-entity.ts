import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm'

@Entity('account')
@Index('idx_account_role', ['role'])
export class AccountOrmEntity {
  @PrimaryColumn('text')
  id: string

  @Column('text', { name: 'name' })
  name: string

  @Column('text', { name: 'role' })
  role: string // 'SHIPPER' | 'COURIER'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
