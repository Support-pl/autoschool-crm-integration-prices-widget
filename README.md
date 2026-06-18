# Autoschool Pricing Widget

Standalone embeddable calculator widget for driving school pricing. Built with React + Vite, compiled to a single self-contained IIFE bundle (styles included).

## Usage

```html
<div id="calculator"></div>

<!-- pinned version (recommended for production) -->
<script src="https://cdn.jsdelivr.net/gh/Support-pl/autoschool-crm-integration-prices-widget@1.0.0/dist/calculator-widget.js"></script>

<!-- or always latest -->
<!-- <script src="https://cdn.jsdelivr.net/gh/Support-pl/autoschool-crm-integration-prices-widget@latest/dist/calculator-widget.js"></script> -->

<script>
  CalculatorWidget.mount('#calculator', {
    apiUrl: 'https://your-crm.com/api/public/pricing',
    locale: 'pl',
    contactUrl: '/contact',
  });
</script>
```

### Config options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiUrl` | `string` | — | URL of the pricing endpoint (`GET` returns `{ locations, categories, packages }`) |
| `locale` | `string` | `'pl'` | UI language. Supported: `pl`, `ru`, `uk`, `en` |
| `contactUrl` | `string` | `'/contact'` | href for the "Sign up" CTA button |

## API contract

`GET {apiUrl}` must return:

```ts
{
  locations: { id: string; name: string; city: string | null; code: string }[];
  categories: { id: string; slug: string; name: Record<string, string>; sortOrder: number }[];
  packages: {
    id: string;
    name: string;
    price: number;
    subtitle?: Record<string, string>;
    features?: string[];
    featuresI18n?: Record<string, string>[];
    forStudentsWithLicense?: boolean;
    serviceCategory: { slug: string };
    pricingRules?: {
      locationPricing?: {
        [locationId: string]: {
          manual?: number;
          automatic?: number;
        };
      };
    };
  }[];
}
```

### Price resolution

For a given package, location, and gearbox type the price resolves as:

```
pricingRules.locationPricing[locationId][manual|automatic] ?? package.price
```

A package is hidden for a location if `locationPricing[locationId]` is absent entirely.

### License toggle

If a category contains packages with both `forStudentsWithLicense: true` and `forStudentsWithLicense: false`, a "Do I already have a license?" toggle appears and filters the list accordingly.

### Gearbox toggle

Shown only for the **selected package**. If the package has a price only for one transmission type, a single non-switchable button is displayed.

## Development

```bash
pnpm install
pnpm dev        # dev server at localhost:5173
```

Update the `apiUrl` in [src/main.tsx](src/main.tsx) to point at your local CRM instance.

## Build

```bash
pnpm build
```

Outputs `dist/calculator-widget.js` — a single IIFE bundle with styles injected. No external dependencies required on the host page.
