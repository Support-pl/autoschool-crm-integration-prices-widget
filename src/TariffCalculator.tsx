import { useEffect, useState } from 'react';
import { Calculator, ArrowRight, Check } from 'lucide-react';
import s from './TariffCalculator.module.css';

type I18nText = string | Record<string, string> | null | undefined;

type Location = { id: string; name: string; city: string | null; code: string };

type Category = {
  id: string;
  slug: string;
  name: I18nText;
  sortOrder: number;
};

type AttrValue = Record<string, string> & {
  description?: Record<string, string>;
};

type Attribute = {
  id: string;
  title?: string;
  titleI18n?: Record<string, string>;
  valuesI18n?: AttrValue[];
  sortOrder: number;
  isFilterable: boolean;
  isActive: boolean;
};

type AttributeLink = {
  valueIndex: number;
  /** Empty / missing = visible in all cities. */
  cities?: string[];
  attribute: Attribute;
};

type LocationPricing = {
  manual?: number;
  automatic?: number;
};

type PricingPackage = {
  id: string;
  name: string;
  price: number;
  subtitle?: I18nText;
  forStudentsWithLicense?: boolean;
  serviceCategory?: { slug: string; name?: I18nText };
  pricingRules?: {
    locationPricing?: Record<string, LocationPricing>;
  };
  attributeLinks?: AttributeLink[];
};

type PricingData = {
  locations: Location[];
  categories: Category[];
  packages: PricingPackage[];
};

type Transmission = 'manual' | 'automatic';

type AttrOption = {
  attribute: Attribute;
  values: number[];
};

/** Empty cities array = attribute is visible everywhere (backward compatible). */
function isLinkVisibleInCity(link: AttributeLink, city: string | null | undefined): boolean {
  const cities = link.cities;
  if (!Array.isArray(cities) || cities.length === 0) return true;
  if (!city) return true;
  return cities.includes(city);
}

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
  helpline?: Record<string, string>;
}

function li18n(field: I18nText, locale: string): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[locale] || field['pl'] || field['en'] || Object.values(field)[0] || '';
}
export function TariffCalculator({ apiUrl, locale = 'pl', contactUrl = '/contact', helpline }: TariffCalculatorProps) {

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
    let cancelled = false;
    fetch(apiUrl)
      .then((r) => r.json())
      .then((d: PricingData) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [apiUrl]);

  const locations   = data?.locations ?? [];
  const categories  = data?.categories ?? [];
  const allPackages = data?.packages ?? [];
  const activeLocationId = locationId ?? locations[0]?.id ?? null;
  const activeSlug       = programSlug ?? categories[0]?.slug ?? null;
  const activeLocation   = locations.find((l) => l.id === activeLocationId) ?? null;
  /** Matches CRM `Location.city` / attributeLink.cities */
  const activeCity       = activeLocation?.city || activeLocation?.name || null;

  const resetFilters = () => setAttrFilters({});

  const linksForCity = (pkg: PricingPackage): AttributeLink[] =>
    (pkg.attributeLinks ?? []).filter(
      (link) => link.attribute?.isActive && isLinkVisibleInCity(link, activeCity),
    );

  const findLinkInCity = (pkg: PricingPackage, attrId: string): AttributeLink | undefined =>
    linksForCity(pkg).find((l) => l.attribute.id === attrId);

  const getFeatures = (pkg: PricingPackage): string[] =>
    linksForCity(pkg)
      .map((link) => li18n(link.attribute.valuesI18n?.[link.valueIndex]?.description, locale))
      .filter(Boolean);

  // Derived — no useMemo (avoids React Compiler / eslint memoization noise)
  let baseTariffs: PricingPackage[] = [];
  let showLicenseToggle = false;
  let attributes: AttrOption[] = [];

  if (activeSlug) {
    let pkgs = allPackages.filter((p) => p.serviceCategory?.slug === activeSlug);

    showLicenseToggle =
      pkgs.some((p) => p.forStudentsWithLicense === true) &&
      pkgs.some((p) => p.forStudentsWithLicense === false);

    if (showLicenseToggle) {
      pkgs = pkgs.filter((p) => p.forStudentsWithLicense === licensed);
    }

    if (activeLocationId) {
      pkgs = pkgs.filter((p) => p.pricingRules?.locationPricing?.[activeLocationId] != null);
    }

    const attrMap = new Map<string, AttrOption>();
    for (const pkg of pkgs) {
      const visibleLinks = (pkg.attributeLinks ?? []).filter(
        (l) => l.attribute?.isFilterable && l.attribute?.isActive && isLinkVisibleInCity(l, activeCity),
      );
      for (const link of visibleLinks) {
        const existing = attrMap.get(link.attribute.id);
        if (!existing) {
          attrMap.set(link.attribute.id, { attribute: link.attribute, values: [link.valueIndex] });
        } else if (!existing.values.includes(link.valueIndex)) {
          existing.values.push(link.valueIndex);
        }
      }
    }
    attributes = Array.from(attrMap.values()).sort((a, b) => a.attribute.sortOrder - b.attribute.sortOrder);
    baseTariffs = pkgs;
  }

  const tariffs = baseTariffs.filter((pkg) =>
    Object.entries(attrFilters).every(([attrId, valueIdx]) => {
      if (valueIdx === null) return true;
      const link = findLinkInCity(pkg, attrId);
      return link?.valueIndex === valueIdx;
    }),
  );

  const selected = baseTariffs.find((t) => t.id === tariffId) ?? baseTariffs[0] ?? null;

  const availableTransmissions = {
    manual:    selected?.pricingRules?.locationPricing?.[activeLocationId ?? '']?.manual    != null,
    automatic: selected?.pricingRules?.locationPricing?.[activeLocationId ?? '']?.automatic != null,
  };

  const effectiveTransmission: Transmission =
    availableTransmissions[transmission] ? transmission
    : availableTransmissions.manual      ? 'manual'
    : 'automatic';

  const getPrice = (pkg: PricingPackage): number => {
    const lp = pkg.pricingRules?.locationPricing;
    return lp?.[activeLocationId ?? '']?.[effectiveTransmission] ?? Number(pkg.price);
  };

  const total       = selected ? getPrice(selected) : 0;
  const features    = selected ? getFeatures(selected) : [];
  const filteredIds = new Set(tariffs.map((t) => t.id));
  const tariffStep  = showLicenseToggle ? '5' : '4';

  const availableForAttr = (attrId: string): Set<number> =>
    new Set(
      baseTariffs
        .filter((pkg) =>
          Object.entries(attrFilters).every(([fId, vi]) => {
            if (fId === attrId || vi === null) return true;
            return findLinkInCity(pkg, fId)?.valueIndex === vi;
          }),
        )
        .flatMap((pkg) => linksForCity(pkg))
        .filter((l) => l.attribute.id === attrId)
        .map((l) => l.valueIndex),
    );

  return (
    <section className={s.section}>
      <div className={s.card}>

        <div className={s.form}>
          <div className={s.header}>
            <div className={s.headerIcon}><Calculator size={20} /></div>
            <div>
              <p className={s.headerLabel}>{tr.badge}</p>
              <h2 className={s.headerTitle}>{tr.title}</h2>
            </div>
          </div>

          <div className={s.field}>
            <p className={s.fieldLabel}>{tr.stepCity}</p>
            <div className={s.cityGrid}>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className={s.skeleton} style={{ height: 42 }} />)
                : locations.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        setLocationId(loc.id);
                        setTariffId(null);
                        resetFilters();
                      }}
                      className={`${s.cityBtn} ${loc.id === activeLocationId ? s.cityBtnActive : ''}`}
                    >
                      {loc.name}
                    </button>
                  ))
              }
            </div>
          </div>

          <div className={s.field}>
            <p className={s.fieldLabel}>{tr.stepService}</p>
            <div className={s.programGrid}>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <div key={i} className={s.skeleton} style={{ height: 42 }} />)
                : categories.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => {
                        setProgramSlug(cat.slug);
                        setTariffId(null);
                        resetFilters();
                      }}
                      className={`${s.programBtn} ${cat.slug === activeSlug ? s.programBtnActive : ''}`}
                    >
                      {li18n(cat.name, locale)}
                    </button>
                  ))
              }
            </div>
          </div>

          <div className={s.field}>
            <p className={s.fieldLabel}>{tr.stepGearbox}</p>
            {loading ? (
              <div className={s.skeleton} style={{ height: 42, width: 220 }} />
            ) : (
              <div className={s.toggle}>
                {availableTransmissions.manual && (
                  <button
                    type="button"
                    onClick={() => setTransmission('manual')}
                    className={`${s.toggleBtn} ${s.toggleBtnNo} ${effectiveTransmission === 'manual' ? s.active : ''}`}
                  >
                    {tr.manual}
                  </button>
                )}
                {availableTransmissions.automatic && (
                  <button
                    type="button"
                    onClick={() => setTransmission('automatic')}
                    className={`${s.toggleBtn} ${s.toggleBtnYes} ${effectiveTransmission === 'automatic' ? s.active : ''}`}
                  >
                    {tr.automatic}
                  </button>
                )}
              </div>
            )}
          </div>

          {showLicenseToggle && (
            <div className={s.field}>
              <p className={s.fieldLabel}>{tr.stepLicense}</p>
              <div className={s.toggle}>
                <button
                  type="button"
                  onClick={() => { setLicensed(false); resetFilters(); }}
                  className={`${s.toggleBtn} ${s.toggleBtnNo} ${!licensed ? s.active : ''}`}
                >
                  {tr.no}
                </button>
                <button
                  type="button"
                  onClick={() => { setLicensed(true); resetFilters(); }}
                  className={`${s.toggleBtn} ${s.toggleBtnYes} ${licensed ? s.active : ''}`}
                >
                  {tr.yes}
                </button>
              </div>
            </div>
          )}

          {!loading && attributes.length > 0 && (
            <div className={s.attrRow}>
              {attributes.map((attr) => {
                const available = availableForAttr(attr.attribute.id);
                return (
                  <select
                    key={attr.attribute.id}
                    className={`${s.attrSelect} ${attrFilters[attr.attribute.id] != null ? s.attrSelectActive : ''}`}
                    value={attrFilters[attr.attribute.id] ?? ''}
                    onChange={(e) => setAttrFilters((f) => ({
                      ...f,
                      [attr.attribute.id]: e.target.value === '' ? null : Number(e.target.value),
                    }))}
                  >
                    <option value="">{li18n(attr.attribute.titleI18n, locale)}</option>
                    {attr.values
                      .slice()
                      .sort((a, b) => a - b)
                      .filter((vi) => available.has(vi))
                      .map((vi) => (
                        <option key={vi} value={vi}>{li18n(attr.attribute.valuesI18n?.[vi], locale)}</option>
                      ))}
                  </select>
                );
              })}
            </div>
          )}

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
                {baseTariffs.map((t) => {
                  const disabled = !filteredIds.has(t.id);
                  const active   = !disabled && selected?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { if (!disabled) setTariffId(t.id); }}
                      className={`${s.tariffBtn} ${active ? s.tariffBtnActive : ''} ${disabled ? s.tariffBtnDisabled : ''}`}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p className={s.tariffName}>{t.name}</p>
                        {li18n(t.subtitle, locale) && <p className={s.tariffSub}>{li18n(t.subtitle, locale)}</p>}
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
              <p className={s.summaryPackage}>{li18n(selected?.serviceCategory?.name, locale) || '—'}</p>
              <div className={s.summaryMeta}>
                <span className={s.summaryMetaLabel}>{tr.stepGearbox.replace(/^\d+\.\s*/, '')}</span>
                <span>{tr[effectiveTransmission]}</span>
              </div>
            </>
          )}

          <div className={s.divider} />

          <div className={s.priceRows}>
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <div key={i} className={s.skeletonDark} style={{ height: 18 }} />)
            ) : (
              <>
                <div className={s.priceRow}>
                  <span className={s.priceRowLabel}>{selected?.name ?? '—'}</span>
                  <span className={s.priceRowValue}>{selected ? getPrice(selected) : 0} zł</span>
                </div>
                {selected && li18n(selected.subtitle, locale) && (
                  <p className={s.priceRowDesc}>{li18n(selected.subtitle, locale)}</p>
                )}
              </>
            )}
          </div>

          {!loading && features.length > 0 && (
            <>
              <div className={s.divider} />
              <div className={s.featuresList}>
                {features.map((f) => (
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
            <a href={selected ? `${contactUrl}?packageId=${selected.id}` : contactUrl} className={s.ctaBtn}>
              {tr.signUp} <ArrowRight size={16} />
            </a>
          </div>

          <p className={s.disclaimer}>{tr.disclaimer}</p>

          {helpline?.[locale] && (
            <p className={s.helpline}>{helpline[locale]}</p>
          )}
        </div>

      </div>
    </section>
  );
}
