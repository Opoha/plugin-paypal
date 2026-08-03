import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** OWNER: @opoha/plugin-paypal — settings row for PayPal config (ADR-0005). */
@Entity({ name: 'paypal_settings' })
export class PaypalSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Client id placeholder — never commit real secrets. */
  @Column({ name: 'client_id', type: 'text', default: '' })
  clientId!: string;

  /** Client secret is env-only; this flag tracks whether live mode is intended. */
  @Column({ name: 'live_mode', type: 'boolean', default: false })
  liveMode!: boolean;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
