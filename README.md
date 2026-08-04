# PayPal Payment Plugin

Official `@opoha/plugin-paypal` — registers a PayPal payment provider with the Opoha payment engine.

## What it registers

- Payment provider `paypal` (authorize / capture / refund / webhook stubs)
- GraphQL config contribution for PayPal settings
- Admin settings + nav under `/plugins/paypal`

Client secrets and credentials belong in environment variables — never commit them.

## Load

```bash
pnpm install && pnpm build
export OPOHA_PLUGINS="$(pwd)"
```

Or add `@opoha/plugin-paypal` to an app’s `opoha.config.json` `"plugins"` array after `pnpm add @opoha/plugin-paypal`.

Core discovers plugins dynamically — it never statically imports this package.
