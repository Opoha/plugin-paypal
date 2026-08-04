import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial settings table for PayPal plugin (ADR-0005).
 * Table prefix: plugin id `paypal` → `paypal_*`.
 */
export class PaypalInit1722800000000 implements MigrationInterface {
  name = 'PaypalInit1722800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "paypal_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "client_id" text NOT NULL DEFAULT '',
        "live_mode" boolean NOT NULL DEFAULT false,
        "enabled" boolean NOT NULL DEFAULT true,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "paypal_settings_pkey" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "paypal_settings"`);
  }
}
