import { describe, expect, it, vi } from 'vitest';

import {
  MIGRATIONS_TABLE_NAME,
  PLUGIN_ID,
  entities,
  migrations,
} from './database.js';
import paypalPlugin, {
  DEFAULT_PAYPAL_CONFIG,
  mapPaypalEventToWebhookResult,
  paypalConfigSchema,
  paypalPaymentProvider,
} from './index.js';
import { PaypalInit1722800000000 } from './migrations/1722800000000-PaypalInit.js';

function createQueryRunnerMock() {
  const queries: string[] = [];
  return {
    queries,
    query: vi.fn(async (sql: string) => {
      queries.push(sql);
    }),
  };
}

describe('@opoha/plugin-paypal', () => {
  it('exports definePlugin definition with paypal id', () => {
    expect(paypalPlugin.id).toBe('paypal');
    expect(typeof paypalPlugin.boot).toBe('function');
  });

  it('parses default config schema', () => {
    const parsed = paypalConfigSchema.parse({});
    expect(parsed.enabled).toBe(true);
    expect(parsed.liveMode).toBe(false);
    expect(DEFAULT_PAYPAL_CONFIG).toEqual(parsed);
  });

  it('registers payment provider with ops, GraphQL, and admin via boot context', () => {
    const payments: Array<{
      code: string;
      displayName: string;
      hasAuthorize: boolean;
      hasWebhook: boolean;
    }> = [];
    const graphql: Array<{ name: string; kind: string }> = [];
    const admin: unknown[] = [];

    paypalPlugin.boot?.({
      pluginId: 'paypal',
      registerGraphQL(input) {
        graphql.push({ name: input.name, kind: input.kind });
      },
      registerProvider() {},
      registerListener() {},
      registerAdmin(contribution) {
        admin.push(contribution);
      },
      registerPaymentProvider(provider) {
        payments.push({
          code: provider.code,
          displayName: provider.displayName,
          hasAuthorize: typeof provider.authorize === 'function',
          hasWebhook: typeof provider.handleWebhook === 'function',
        });
      },
      registerShippingMethod() {},
      registerStorageAdapter() {},
      registerTaxProvider() {},
      registerPromotionRuleProvider() {},
      registerNotificationProvider() {},
      registerSearchProvider() {},
      registerFXProvider() {},
      registerScheduledJob() {},
      registerRuleAction() {},
    });

    expect(payments).toEqual([
      {
        code: 'paypal',
        displayName: 'PayPal',
        hasAuthorize: true,
        hasWebhook: true,
      },
    ]);
    expect(graphql).toEqual([{ name: 'paypalPaymentConfig', kind: 'query' }]);
    expect(admin).toHaveLength(1);
  });

  it('authorize/capture/refund return PayPal-shaped stubs', async () => {
    const auth = await paypalPaymentProvider.authorize({
      paymentId: 'p1',
      orderId: 'o1',
      amount: { amountMinor: '2500', currencyCode: 'USD' },
      idempotencyKey: 'idem-1',
    });
    expect(auth.status).toBe('authorized');
    expect(auth.externalId).toMatch(/^PAYPAL-ORDER-/);
    expect(auth.raw).toMatchObject({
      status: 'APPROVED',
      intent: 'CAPTURE',
      purchase_units: [
        { reference_id: 'o1', amount: { currency_code: 'USD', value: '25.00' } },
      ],
    });

    const cap = await paypalPaymentProvider.capture({
      paymentId: 'p1',
      orderId: 'o1',
      amount: { amountMinor: '2500', currencyCode: 'USD' },
      externalId: auth.externalId,
    });
    expect(cap.status).toBe('captured');
    expect(cap.raw).toMatchObject({
      status: 'COMPLETED',
      amount: { currency_code: 'USD', value: '25.00' },
    });

    const ref = await paypalPaymentProvider.refund({
      paymentId: 'p1',
      orderId: 'o1',
      amount: { amountMinor: '2500', currencyCode: 'USD' },
      externalId: auth.externalId,
    });
    expect(ref.status).toBe('refunded');
    expect(ref.raw).toMatchObject({
      status: 'COMPLETED',
      amount: { currency_code: 'USD', value: '25.00' },
    });
  });

  it('handleWebhook maps PayPal event types to engine actions', async () => {
    const captured = await paypalPaymentProvider.handleWebhook?.({
      headers: { 'paypal-transmission-id': 'stub' },
      body: {
        id: 'WH-1',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'PAYPAL-CAPTURE-ABC', status: 'COMPLETED' },
      },
    });
    expect(captured).toEqual({
      handled: true,
      externalEventId: 'WH-1',
      paymentExternalId: 'PAYPAL-CAPTURE-ABC',
      action: 'capture',
    });

    const failed = mapPaypalEventToWebhookResult({
      id: 'WH-2',
      event_type: 'PAYMENT.CAPTURE.DENIED',
      resource: { id: 'PAYPAL-CAPTURE-DEF' },
    });
    expect(failed.action).toBe('fail');

    const ignored = await paypalPaymentProvider.handleWebhook?.({
      headers: {},
      body: { not: 'a paypal event' },
    });
    expect(ignored).toEqual({ handled: false, action: 'ignore' });
  });

  it('exposes plugin-owned entities and namespaced migrations table', () => {
    expect(PLUGIN_ID).toBe('paypal');
    expect(MIGRATIONS_TABLE_NAME).toBe('opoha_migrations_paypal');
    expect(entities).toHaveLength(1);
    expect(migrations).toHaveLength(1);
    expect(migrations[0]).toBe(PaypalInit1722800000000);
  });

  it('migration up/down owns only paypal_settings', async () => {
    const migration = new PaypalInit1722800000000();
    const upRunner = createQueryRunnerMock();
    await migration.up(upRunner as never);
    expect(upRunner.queries.join('\n')).toContain(
      'CREATE TABLE "paypal_settings"',
    );
    expect(upRunner.queries.join('\n')).not.toMatch(
      /ALTER TABLE "(users|roles|payments)"/i,
    );

    const downRunner = createQueryRunnerMock();
    await migration.down(downRunner as never);
    expect(downRunner.queries.join('\n')).toContain(
      'DROP TABLE IF EXISTS "paypal_settings"',
    );
  });
});
