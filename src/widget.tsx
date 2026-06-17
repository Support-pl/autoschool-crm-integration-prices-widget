import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TariffCalculator } from './TariffCalculator';

export interface WidgetConfig {
  apiUrl: string;
  locale?: string;
  contactUrl?: string;
}

export function mount(selector: string, config: WidgetConfig) {
  const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) throw new Error(`CalculatorWidget: element "${selector}" not found`);
  createRoot(el as Element).render(
    <StrictMode>
      <TariffCalculator {...config} />
    </StrictMode>
  );
}
