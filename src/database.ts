import 'reflect-metadata';

/**
 * Plugin-owned TypeORM surface for CLI / host migration aggregation (ADR-0005).
 * Core never imports this package statically — hosts load via dynamic import.
 */

import { PaypalSettingsEntity } from './entities/paypal-settings.entity.js';
import { paypalEntities } from './entities/index.js';
import { PaypalInit1722800000000 } from './migrations/1722800000000-PaypalInit.js';
import { paypalMigrations } from './migrations/index.js';

export const PLUGIN_ID = 'paypal' as const;

/** Namespaced migrations table — never shares core `migrations`. */
export const MIGRATIONS_TABLE_NAME = 'opoha_migrations_paypal' as const;

export const entities = paypalEntities;
export const migrations = paypalMigrations;

export {
  PaypalSettingsEntity,
  PaypalInit1722800000000,
  paypalEntities,
  paypalMigrations,
};
