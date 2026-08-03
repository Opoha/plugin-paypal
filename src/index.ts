import { definePlugin } from '@opoha/plugin-sdk';
import type {
  PaymentAuthorizeInput,
  PaymentCaptureInput,
  PaymentProvider,
  PaymentRefundInput,
  PaymentWebhookInput,
  PaymentWebhookResult,
} from '@opoha/plugin-sdk';
import { z } from 'zod';

/** Zod schema for PayPal admin settings (client secret stays in env — never persisted here). */
export const paypalConfigSchema = z.object({
  clientId: z.string().default(''),
  liveMode: z.boolean().default(false),
  enabled: z.boolean().default(true),
});

export type PaypalConfig = z.infer<typeof paypalConfigSchema>;

/** Default config returned by the GraphQL config query until settings persistence lands. */
export const DEFAULT_PAYPAL_CONFIG: PaypalConfig = paypalConfigSchema.parse(
  {},
);

/** PayPal Orders v2 Order-shaped stub (no PayPal SDK — E-01 scaffold only). */
export type PaypalOrderStub = {
  id: string;
  status:
    | 'CREATED'
    | 'SAVED'
    | 'APPROVED'
    | 'VOIDED'
    | 'COMPLETED'
    | 'PAYER_ACTION_REQUIRED';
  intent: 'CAPTURE' | 'AUTHORIZE';
  purchase_units: Array<{
    reference_id: string;
    amount: { currency_code: string; value: string };
  }>;
};

/** PayPal Capture-shaped stub. */
export type PaypalCaptureStub = {
  id: string;
  status: 'COMPLETED' | 'DECLINED' | 'PENDING' | 'REFUNDED';
  amount: { currency_code: string; value: string };
};

/** PayPal Refund-shaped stub. */
export type PaypalRefundStub = {
  id: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  amount: { currency_code: string; value: string };
};

/** Minimal PayPal webhook event shape used by the webhook stub. */
export type PaypalEventStub = {
  id: string;
  event_type: string;
  resource: {
    id?: string;
    status?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    [key: string]: unknown;
  };
};

function amountMinorToValue(amountMinor: string): string {
  const n = Number(amountMinor);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw new Error(`Invalid amountMinor: ${amountMinor}`);
  }
  return (n / 100).toFixed(2);
}

function stubOrderId(paymentId: string): string {
  return `PAYPAL-ORDER-${paymentId.replace(/-/g, '').slice(0, 17).toUpperCase()}`;
}

function stubCaptureId(paymentId: string): string {
  return `PAYPAL-CAPTURE-${paymentId.replace(/-/g, '').slice(0, 14).toUpperCase()}`;
}

function stubRefundId(paymentId: string): string {
  return `PAYPAL-REFUND-${paymentId.replace(/-/g, '').slice(0, 15).toUpperCase()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asPaypalEvent(body: unknown): PaypalEventStub | null {
  if (!isRecord(body)) return null;
  if (typeof body.id !== 'string' || typeof body.event_type !== 'string') {
    return null;
  }
  if (!isRecord(body.resource)) return null;
  return body as unknown as PaypalEventStub;
}

function paymentExternalIdFromEvent(event: PaypalEventStub): string | undefined {
  const resource = event.resource;
  const relatedOrderId = resource.supplementary_data?.related_ids?.order_id;
  if (typeof relatedOrderId === 'string') {
    return relatedOrderId;
  }
  if (typeof resource.id === 'string') {
    return resource.id;
  }
  return undefined;
}

/**
 * Map PayPal `event_type` → PaymentEngine webhook actions.
 * Signature verification is deferred until live PayPal secrets land.
 */
export function mapPaypalEventToWebhookResult(
  event: PaypalEventStub,
): PaymentWebhookResult {
  const paymentExternalId = paymentExternalIdFromEvent(event);
  switch (event.event_type) {
    case 'CHECKOUT.ORDER.APPROVED':
      return {
        handled: true,
        externalEventId: event.id,
        paymentExternalId,
        action: 'authorize',
      };
    case 'PAYMENT.CAPTURE.COMPLETED':
      return {
        handled: true,
        externalEventId: event.id,
        paymentExternalId,
        action: 'capture',
      };
    case 'PAYMENT.CAPTURE.REFUNDED':
      return {
        handled: true,
        externalEventId: event.id,
        paymentExternalId,
        action: 'refund',
      };
    case 'PAYMENT.CAPTURE.DENIED':
    case 'CHECKOUT.ORDER.VOIDED':
      return {
        handled: true,
        externalEventId: event.id,
        paymentExternalId,
        action: 'fail',
      };
    default:
      return {
        handled: true,
        externalEventId: event.id,
        paymentExternalId,
        action: 'ignore',
      };
  }
}

/**
 * PayPal payment provider stubs — shapes match PayPal Orders v2 order /
 * capture / refund / webhook-event APIs so live SDK wiring can replace
 * stubs without changing engine contracts.
 */
export const paypalPaymentProvider: PaymentProvider = {
  code: 'paypal',
  displayName: 'PayPal',
  configSchema: paypalConfigSchema,

  async authorize(input: PaymentAuthorizeInput) {
    const value = amountMinorToValue(input.amount.amountMinor);
    const id = stubOrderId(input.paymentId);
    const raw: PaypalOrderStub = {
      id,
      status: 'APPROVED',
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.orderId,
          amount: {
            currency_code: input.amount.currencyCode.toUpperCase(),
            value,
          },
        },
      ],
    };
    return {
      status: 'authorized' as const,
      externalId: id,
      raw,
    };
  },

  async capture(input: PaymentCaptureInput) {
    const value = amountMinorToValue(input.amount.amountMinor);
    const id = stubCaptureId(input.paymentId);
    const raw: PaypalCaptureStub = {
      id,
      status: 'COMPLETED',
      amount: {
        currency_code: input.amount.currencyCode.toUpperCase(),
        value,
      },
    };
    return {
      status: 'captured' as const,
      externalId: id,
      raw,
    };
  },

  async refund(input: PaymentRefundInput) {
    const value = amountMinorToValue(input.amount.amountMinor);
    const id = stubRefundId(input.paymentId);
    const raw: PaypalRefundStub = {
      id,
      status: 'COMPLETED',
      amount: {
        currency_code: input.amount.currencyCode.toUpperCase(),
        value,
      },
    };
    return {
      status: 'refunded' as const,
      externalId: id,
      raw,
    };
  },

  async handleWebhook(
    input: PaymentWebhookInput,
  ): Promise<PaymentWebhookResult> {
    const event = asPaypalEvent(input.body);
    if (!event) {
      return { handled: false, action: 'ignore' };
    }
    return mapPaypalEventToWebhookResult(event);
  },
};

/**
 * Official PayPal payment plugin (Phase 9 E-01).
 * Registers payment provider stubs + admin settings + GraphQL config query.
 * Live PayPal SDK / secrets are intentionally out of scope for this scaffold —
 * mirrors the stripe/omise stub pattern (ADR-0003).
 */
export default definePlugin({
  id: 'paypal',
  boot(ctx) {
    ctx.registerPaymentProvider(paypalPaymentProvider);
    ctx.registerGraphQL({
      name: 'paypalPaymentConfig',
      kind: 'query',
      descriptor: {
        resolve: (): PaypalConfig => DEFAULT_PAYPAL_CONFIG,
      },
    });
    ctx.registerAdmin({
      navigation: [
        {
          id: 'paypal-nav',
          label: 'PayPal',
          path: '/plugins/paypal',
          permission: 'plugin:paypal:read',
        },
      ],
      settings: [
        {
          id: 'paypal-settings',
          title: 'PayPal',
          path: '/plugins/paypal/settings',
          permission: 'plugin:paypal:configure',
        },
      ],
      permissions: ['plugin:paypal:read', 'plugin:paypal:configure'],
    });
  },
});
