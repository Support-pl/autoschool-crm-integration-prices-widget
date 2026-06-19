import { useEffect, useMemo, useState } from 'react';
import { Calculator, ArrowRight, Check } from 'lucide-react';
import s from './TariffCalculator.module.css';

type PricingData = {
  locations: { id: string; name: string; city: string | null; code: string }[];
  categories: { id: string; slug: string; name: any; sortOrder: number }[];
  packages: any[];
};

type Transmission = 'manual' | 'automatic';

const translations = {
  pl: {
    badge:        'Kalkulator',
    title:        'Oblicz koszt',
    stepCity:     '1. Miasto',
    stepService:  '2. Usługa',
    stepGearbox:  '3. Skrzynia biegów',
    manual:       'Manualna',
    automatic:    'Automatyczna',
    stepLicense:  '4. Mam już prawo jazdy?',
    no:           'Nie',
    yes:          'Tak',
    stepTariff:   'Taryfa / pakiet',
    noPackages:   'Nie znaleziono pakietów',
    estimate:     'Twój kosztorys',
    signUp:       'Zapisz się',
    total:        'Razem',
    disclaimer:   'Ceny orientacyjne. Ostateczna cena potwierdzana przez managera.',
  },
  ru: {
    badge:        'Калькулятор',
    title:        'Рассчитайте стоимость',
    stepCity:     '1. Город',
    stepService:  '2. Услуга',
    stepGearbox:  '3. Коробка передач',
    manual:       'Механика',
    automatic:    'Автомат',
    stepLicense:  '4. У меня уже есть права?',
    no:           'Нет',
    yes:          'Да',
    stepTariff:   'Тариф / пакет',
    noPackages:   'Пакеты не найдены',
    estimate:     'Ваша смета',
    signUp:       'Записаться',
    total:        'Итого',
    disclaimer:   'Цены ориентировочные. Финальная стоимость подтверждается менеджером.',
  },
  uk: {
    badge:        'Калькулятор',
    title:        'Розрахуйте вартість',
    stepCity:     '1. Місто',
    stepService:  '2. Послуга',
    stepGearbox:  '3. Коробка передач',
    manual:       'Механіка',
    automatic:    'Автомат',
    stepLicense:  '4. У мене вже є права?',
    no:           'Ні',
    yes:          'Так',
    stepTariff:   'Тариф / пакет',
    noPackages:   'Пакети не знайдено',
    estimate:     'Ваш кошторис',
    signUp:       'Записатися',
    total:        'Разом',
    disclaimer:   'Ціни орієнтовні. Остаточна вартість підтверджується менеджером.',
  },
  en: {
    badge:        'Calculator',
    title:        'Calculate the cost',
    stepCity:     '1. City',
    stepService:  '2. Service',
    stepGearbox:  '3. Gearbox',
    manual:       'Manual',
    automatic:    'Automatic',
    stepLicense:  '4. I already have a license?',
    no:           'No',
    yes:          'Yes',
    stepTariff:   'Tariff / package',
    noPackages:   'No packages found',
    estimate:     'Your estimate',
    signUp:       'Sign up',
    total:        'Total',
    disclaimer:   'Prices are approximate. Final cost confirmed by manager.',
  },
} as const;

type Locale = keyof typeof translations;

export interface TariffCalculatorProps {
  apiUrl: string;
  locale?: string;
  contactUrl?: string;
}

export function TariffCalculator({ apiUrl, locale = 'pl', contactUrl = '/contact' }: TariffCalculatorProps) {
  const tr = translations[(locale as Locale) in translations ? (locale as Locale) : 'pl'];

  const [locationId,   setLocationId]   = useState<string | null>(null);
  const [programSlug,  setProgramSlug]  = useState<string | null>(null);
  const [transmission, setTransmission] = useState<Transmission>('manual');
  const [tariffId,     setTariffId]     = useState<string | null>(null);
  const [attrFilters,  setAttrFilters]  = useState<Record<string, number | null>>({});
  const [licensed,     setLicensed]     = useState(false);
  const [data,         setData]         = useState<PricingData | null>(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    fetch(apiUrl)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [apiUrl]);

  const locations   = data?.locations ?? [];
  const categories  = data?.categories ?? [];
  const allPackages = data?.packages ?? [];
  const activeLocationId = locationId ?? locations[0]?.id ?? null;
  const activeSlug       = programSlug ?? categories[0]?.slug ?? null;

  const li18n = (field: any): string => {
    if (!field || typeof field === 'string') return field ?? '';
    return field[locale] || field['pl'] || field['en'] || '';
  };

  const getFeatures = (pkg: any): string[] =>
    (pkg.attributeLinks ?? [])
      .map((link: any) => li18n(link.attribute.valuesI18n?.[link.valueIndex]?.description))
      .filter(Boolean);

  const { baseTariffs, showLicenseToggle, attributes } = useMemo(() => {
    if (!activeSlug) return { baseTariffs: [], showLicenseToggle: false, attributes: [] };

    let pkgs = allPackages.filter(p => p.serviceCategory?.slug === activeSlug);

    const showLicenseToggle =
      pkgs.some(p => p.forStudentsWithLicense === true) &&
      pkgs.some(p => p.forStudentsWithLicense === false);

    if (showLicenseToggle) {
      pkgs = pkgs.filter(p => p.forStudentsWithLicense === licensed);
    }

    if (activeLocationId) {
      pkgs = pkgs.filter(p => p.pricingRules?.locationPricing?.[activeLocationId] != null);
    }

    const attrMap = new Map<string, { attribute: any; values: Set<number> }>();
    for (const pkg of pkgs) {
      for (const link of (pkg.attributeLinks ?? []) as any[]) {
        if (!attrMap.has(link.attribute.id)) {
          attrMap.set(link.attribute.id, { attribute: link.attribute, values: new Set() });
        }
        attrMap.get(link.attribute.id)!.values.add(link.valueIndex);
      }
    }
    const attributes = [...attrMap.values()].sort((a, b) => a.attribute.sortOrder - b.attribute.sortOrder);

    return { baseTariffs: pkgs, showLicenseToggle, attributes };
  }, [allPackages, activeSlug, licensed, activeLocationId]);

  const tariffs = useMemo(() =>
    baseTariffs.filter(pkg =>
      Object.entries(attrFilters).every(([attrId, valueIdx]) => {
        if (valueIdx === null) return true;
        const link = (pkg.attributeLinks ?? []).find((l: any) => l.attribute.id === attrId);
        return link?.valueIndex === valueIdx;
      })
    ),
  [baseTariffs, attrFilters]);

  useEffect(() => { setAttrFilters({}); }, [activeSlug, activeLocationId, licensed]);

  const selected = baseTariffs.find((t: any) => t.id === tariffId) ?? baseTariffs[0] ?? null;

  // which transmissions the selected package actually has prices for
  const availableTransmissions = {
    manual:    selected?.pricingRules?.locationPricing?.[activeLocationId]?.manual    != null,
    automatic: selected?.pricingRules?.locationPricing?.[activeLocationId]?.automatic != null,
  };

  const effectiveTransmission: Transmission =
    availableTransmissions[transmission] ? transmission
    : availableTransmissions.manual      ? 'manual'
    : 'automatic';

  const getPrice = (pkg: any): number => {
    const lp = (pkg.pricingRules as any)?.locationPricing;
    return lp?.[activeLocationId]?.[effectiveTransmission] ?? Number(pkg.price);
  };

  const total          = selected ? getPrice(selected) : 0;
  const features       = selected ? getFeatures(selected) : [];
  const activeLocation = locations.find(l => l.id === activeLocationId);
  const filteredIds    = new Set(tariffs.map((t: any) => t.id));

  const tariffStep = showLicenseToggle ? '5' : '4';

  const availableForAttr = (attrId: string): Set<number> =>
    new Set(
      baseTariffs
        .filter(pkg =>
          Object.entries(attrFilters).every(([fId, vi]) => {
            if (fId === attrId || vi === null) return true;
            const link = (pkg.attributeLinks ?? []).find((l: any) => l.attribute.id === fId);
            return link?.valueIndex === vi;
          })
        )
        .flatMap((pkg: any) => pkg.attributeLinks ?? [])
        .filter((l: any) => l.attribute.id === attrId)
        .map((l: any) => l.valueIndex as number)
    );

  return (
    <section className={s.section}>
      <div className={s.card}>

        {/* Form */}
        <div className={s.form}>
          <div className={s.header}>
            <div className={s.headerIcon}><Calculator size={20} /></div>
            <div>
              <p className={s.headerLabel}>{tr.badge}</p>
              <h2 className={s.headerTitle}>{tr.title}</h2>
            </div>
          </div>

          {/* 1. City */}
          <div className={s.field}>
            <p className={s.fieldLabel}>{tr.stepCity}</p>
            <div className={s.cityGrid}>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className={s.skeleton} style={{ height: 42 }} />)
                : locations.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => { setLocationId(loc.id); setTariffId(null); }}
                      className={`${s.cityBtn} ${loc.id === activeLocationId ? s.cityBtnActive : ''}`}
                    >
                      {loc.name}
                    </button>
                  ))
              }
            </div>
          </div>

          {/* 2. Service */}
          <div className={s.field}>
            <p className={s.fieldLabel}>{tr.stepService}</p>
            <div className={s.programGrid}>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <div key={i} className={s.skeleton} style={{ height: 42 }} />)
                : categories.map((cat: any) => (
                    <button
                      key={cat.slug}
                      onClick={() => { setProgramSlug(cat.slug); setTariffId(null); }}
                      className={`${s.programBtn} ${cat.slug === activeSlug ? s.programBtnActive : ''}`}
                    >
                      {li18n(cat.name)}
                    </button>
                  ))
              }
            </div>
          </div>

          {/* 3. Gearbox */}
          <div className={s.field}>
            <p className={s.fieldLabel}>{tr.stepGearbox}</p>
            {loading ? (
              <div className={s.skeleton} style={{ height: 42, width: 220 }} />
            ) : (
              <div className={s.toggle}>
                {/* fix 2: no setTariffId(null) — gearbox change shouldn't reset selection */}
                {/* fix 3: render only available options */}
                {availableTransmissions.manual && (
                  <button
                    onClick={() => setTransmission('manual')}
                    className={`${s.toggleBtn} ${s.toggleBtnNo} ${effectiveTransmission === 'manual' ? s.active : ''}`}
                  >
                    {tr.manual}
                  </button>
                )}
                {availableTransmissions.automatic && (
                  <button
                    onClick={() => setTransmission('automatic')}
                    className={`${s.toggleBtn} ${s.toggleBtnYes} ${effectiveTransmission === 'automatic' ? s.active : ''}`}
                  >
                    {tr.automatic}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4. License */}
          {showLicenseToggle && (
            <div className={s.field}>
              <p className={s.fieldLabel}>{tr.stepLicense}</p>
              <div className={s.toggle}>
                <button
                  onClick={() => setLicensed(false)}
                  className={`${s.toggleBtn} ${s.toggleBtnNo} ${!licensed ? s.active : ''}`}
                >
                  {tr.no}
                </button>
                <button
                  onClick={() => setLicensed(true)}
                  className={`${s.toggleBtn} ${s.toggleBtnYes} ${licensed ? s.active : ''}`}
                >
                  {tr.yes}
                </button>
              </div>
            </div>
          )}

          {/* Attributes */}
          {!loading && attributes.length > 0 && (
            <div className={s.attrRow}>
              {attributes.map(attr => {
                const available = availableForAttr(attr.attribute.id);
                return (
                  <select
                    key={attr.attribute.id}
                    className={s.attrSelect}
                    value={attrFilters[attr.attribute.id] ?? ''}
                    onChange={e => setAttrFilters(f => ({
                      ...f,
                      [attr.attribute.id]: e.target.value === '' ? null : Number(e.target.value),
                    }))}
                  >
                    <option value="">{li18n(attr.attribute.titleI18n)}</option>
                    {[...attr.values].sort((a: number, b: number) => a - b).filter(vi => available.has(vi)).map(vi => (
                      <option key={vi} value={vi}>{li18n(attr.attribute.valuesI18n[vi])}</option>
                    ))}
                  </select>
                );
              })}
            </div>
          )}

          {/* Tariff */}
          <div className={s.field}>
            <p className={s.fieldLabel}>{tariffStep}. {tr.stepTariff}</p>
            {loading ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className={s.skeleton} style={{ height: 60 }} />)}
              </div>
            ) : baseTariffs.length === 0 ? (
              <p className={s.emptyText}>{tr.noPackages}</p>
            ) : (
              <div className={s.tariffList}>
                {baseTariffs.map((t: any) => {
                  const disabled = !filteredIds.has(t.id);
                  const active   = !disabled && selected?.id === t.id;
                  return (
                  <button
                    key={t.id}
                    onClick={() => { if (!disabled) setTariffId(t.id); }}
                    className={`${s.tariffBtn} ${active ? s.tariffBtnActive : ''} ${disabled ? s.tariffBtnDisabled : ''}`}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p className={s.tariffName}>{t.name}</p>
                      {li18n(t.subtitle) && <p className={s.tariffSub}>{li18n(t.subtitle)}</p>}
                    </div>
                    <p className={s.tariffPrice}>
                      {getPrice(t)} <span className={s.tariffPriceUnit}>zł</span>
                    </p>
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className={s.summary}>
          <p className={s.summaryTag}>{tr.estimate}</p>
          {loading ? (
            <>
              <div className={s.skeletonDark} style={{ height: 24, width: '60%', marginBottom: 6 }} />
              <div className={s.skeletonDark} style={{ height: 16, width: '80%' }} />
            </>
          ) : (
            <>
              <p className={s.summaryCity}>{activeLocation?.name ?? '—'}</p>
              <p className={s.summaryPackage}>{selected?.name ?? '—'}</p>
            </>
          )}

          <div className={s.divider} />

          <div className={s.priceRows}>
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <div key={i} className={s.skeletonDark} style={{ height: 18 }} />)
            ) : (
              <div className={s.priceRow}>
                <span className={s.priceRowLabel}>{selected?.name ?? '—'}</span>
                <span className={s.priceRowValue}>{selected ? getPrice(selected) : 0} zł</span>
              </div>
            )}
          </div>

          {!loading && features.length > 0 && (
            <>
              <div className={s.divider} />
              <div className={s.featuresList}>
                {features.map((f: string) => (
                  <div key={f} className={s.featureItem}>
                    <Check size={12} strokeWidth={3} className={s.featureIcon} />
                    {f}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={s.divider} />

          <div className={s.totalRow}>
            <span className={s.totalLabel}>{tr.total}</span>
            <span className={s.totalAmount}>
              {loading ? '—' : total} <span className={s.totalUnit}>zł</span>
            </span>
          </div>

          <div style={{ marginTop: 32, display: 'grid', gap: 12 }}>
            <a href={contactUrl} className={s.ctaBtn}>
              {tr.signUp} <ArrowRight size={16} />
            </a>
          </div>

          <p className={s.disclaimer}>{tr.disclaimer}</p>
        </div>

      </div>
    </section>
  );
}
