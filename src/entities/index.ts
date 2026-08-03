import { PaypalSettingsEntity } from './paypal-settings.entity.js';

/** TypeORM entities owned by this plugin (ADR-0005). */
export const paypalEntities = [PaypalSettingsEntity] as const;

export { PaypalSettingsEntity };
