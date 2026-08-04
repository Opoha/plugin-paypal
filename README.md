# PayPal Payment Plugin

Official [`@opoha/plugin-paypal`](https://www.npmjs.com/package/@opoha/plugin-paypal) — PayPal payment provider plugin.

| | |
| --- | --- |
| npm | `@opoha/plugin-paypal` |
| Plugin id | `paypal` |
| Contract | `0.1` |
| Repo | [Opoha/plugin-paypal](https://github.com/Opoha/plugin-paypal) |

## Install

```bash
pnpm add @opoha/plugin-paypal
```

Add the package to your app `opoha.config.json` `"plugins"` array (or set `OPOHA_PLUGINS` / `OPOHA_PLUGINS_PATH` for a local checkout).

## What it registers

- Payment provider `paypal` (authorize / capture / refund / webhook stubs)
- GraphQL config contribution for PayPal settings
- Admin settings + nav under `/plugins/paypal`

Secret keys belong in environment variables — never persist them in admin config JSON.

## Engines

- `payment`: `paypal`

## Load (local checkout)

```bash
pnpm install && pnpm build
export OPOHA_PLUGINS="$(pwd)"
```

Core discovers plugins dynamically and imports `dist/index.js` — **core never statically imports this package**.

## Develop

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

## License

MIT © [Opoha](https://github.com/Opoha)
