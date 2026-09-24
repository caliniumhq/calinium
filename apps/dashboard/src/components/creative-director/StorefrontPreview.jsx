import { memo, useRef, useState } from 'react';

function equalProps(left, right) {
  return left.regionRevision === right.regionRevision && JSON.stringify(left.data) === JSON.stringify(right.data);
}

function PreviewImage({ image, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) return <div className={`${className} storefront-preview__media-fallback`} role="img" aria-label={failed ? 'Preview media is temporarily unavailable' : 'No media selected'} />;
  return <img className={className} src={image.url} alt={image.decorative ? '' : image.alt || ''} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

const HeaderRegion = memo(function HeaderRegion({ data, regionRevision }) {
  return <header className="storefront-preview__header" data-preview-region="header" data-preview-region-revision={regionRevision}>
    <div className="storefront-preview__identity">
      {data.logo ? <PreviewImage image={data.logo} className="storefront-preview__logo" /> : <strong>{data.identity}</strong>}
    </div>
    <nav aria-label="Storefront preview navigation">
      {(data.navigation || []).map((item, index) => <button type="button" disabled title="Navigation is disabled in Preview" key={`${item.label}-${index}`}>{item.label}</button>)}
    </nav>
  </header>;
}, equalProps);

const HeroRegion = memo(function HeroRegion({ data, regionRevision }) {
  if (!data) return null;
  return <section className="storefront-preview__hero" data-preview-region="hero" data-preview-region-revision={regionRevision} aria-label="Hero preview">
    {data.image && <PreviewImage image={data.image} className="storefront-preview__hero-image" />}
    <div className="storefront-preview__hero-content">
      {data.heading && <h3>{data.heading}</h3>}
      {data.action_label && <button type="button" disabled title="Links are disabled in Preview">{data.action_label}</button>}
    </div>
  </section>;
}, equalProps);

const CraftsmanshipRegion = memo(function CraftsmanshipRegion({ data, regionRevision }) {
  if (!data) return null;
  return <section className="storefront-preview__craftsmanship" data-preview-region="craftsmanship" data-preview-region-revision={regionRevision}>
    <div><span>Approved evidence</span><h3>{data.heading}</h3></div>
    <div className="storefront-preview__craft-grid">
      {data.steps.map((step, index) => <article key={`${step.title}-${index}`}>
        {step.image && <PreviewImage image={step.image} className="storefront-preview__craft-image" />}
        <h4>{step.title}</h4>
        {step.description && <p>{step.description}</p>}
      </article>)}
    </div>
  </section>;
}, equalProps);

function priceLabel(price) {
  if (!price?.amount) return null;
  return `${price.amount}${price.currency_code ? ` ${price.currency_code}` : ''}`;
}

const CollectionRegion = memo(function CollectionRegion({ data, regionRevision }) {
  if (!data) return null;
  return <section className="storefront-preview__collection" data-preview-region="featured_collection" data-preview-region-revision={regionRevision}>
    <div className="storefront-preview__section-heading"><span>{data.type === 'featured_product' ? 'Featured product' : 'Featured collection'}</span><h3>{data.heading}</h3></div>
    <article className="storefront-preview__collection-card">
      <PreviewImage image={data.image} className="storefront-preview__collection-image" />
      <strong>{data.heading}</strong>
      {priceLabel(data.price) && <span>{priceLabel(data.price)}</span>}
    </article>
  </section>;
}, equalProps);

const NewsletterRegion = memo(function NewsletterRegion({ data, regionRevision }) {
  if (!data) return null;
  return <section className="storefront-preview__newsletter" data-preview-region="newsletter" data-preview-region-revision={regionRevision}>
    <div><span>Preview only</span><h3>{data.heading}</h3></div>
    <div className="storefront-preview__newsletter-fields" aria-label="Email sign-up preview">
      <input type="email" placeholder="Email address" aria-label="Email address — disabled in Preview" disabled />
      <button type="button" disabled>Join</button>
    </div>
  </section>;
}, equalProps);

const FooterRegion = memo(function FooterRegion({ data, regionRevision }) {
  return <footer className="storefront-preview__footer" data-preview-region="footer" data-preview-region-revision={regionRevision}>
    <strong>{data.identity}</strong>
    <nav aria-label="Storefront preview footer navigation">{(data.navigation || []).map((item, index) => <button type="button" disabled title="Navigation is disabled in Preview" key={`${item.label}-${index}`}>{item.label}</button>)}</nav>
  </footer>;
}, equalProps);

export function StorefrontPreview({ preview, device }) {
  const revisionsRef = useRef({});
  const changed = new Set(preview.changed_regions || []);
  const regionRevision = (id) => {
    if (!revisionsRef.current[id] || changed.has(id)) revisionsRef.current[id] = preview.revision_id;
    return revisionsRef.current[id];
  };
  const model = preview.model;
  if (!model) return null;
  const sectionByType = new Map((model.sections || []).map((item) => [item.type, item]));
  const hero = sectionByType.get('hero') || null;
  const craft = sectionByType.get('craftsmanship') || null;
  const collection = sectionByType.get('featured_collection') || sectionByType.get('featured_product') || null;
  const newsletter = sectionByType.get('newsletter') || null;
  return <article
    className={`storefront-preview storefront-preview--${device}`}
    data-preview-device={device}
    data-preview-revision={preview.revision_id}
    data-preview-state={preview.state}
    data-preview-typography={model.tokens.typography}
    data-preview-spacing={model.tokens.spacing}
    data-preview-motion={model.tokens.motion}
    data-preview-color={model.tokens.color}
    data-preview-hero={model.tokens.hero}
    data-preview-commerce={model.tokens.commerce}
    data-preview-layout={model.tokens.layout}
    data-preview-grid={model.tokens.grid}
    data-preview-hierarchy={model.tokens.hierarchy}
    data-preview-media={model.tokens.media}
    data-preview-image-treatment={model.tokens.image_treatment}
    data-preview-shape-surface={model.tokens.shape_surface}
    data-preview-editorial-density={model.tokens.editorial_density}
    data-preview-section-rhythm={model.tokens.section_rhythm}
    data-preview-responsive={model.tokens.responsive}
    aria-label={`${preview.label} homepage Preview for ${model.identity}`}
  >
    <p className="visually-hidden" role="status">{preview.changed_regions?.length ? `Preview updated: ${preview.changed_regions.join(', ')}.` : 'Preview is current.'}</p>
    <HeaderRegion data={model.header} regionRevision={regionRevision('header')} />
    <main>
      <HeroRegion data={hero} regionRevision={regionRevision('hero')} />
      <CraftsmanshipRegion data={craft} regionRevision={regionRevision('craftsmanship')} />
      <CollectionRegion data={collection} regionRevision={regionRevision('featured_collection')} />
      <NewsletterRegion data={newsletter} regionRevision={regionRevision('newsletter')} />
    </main>
    <FooterRegion data={model.footer} regionRevision={regionRevision('footer')} />
  </article>;
}
