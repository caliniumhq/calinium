import { useEffect } from 'react';
import './launch-preview.css';

const creativeDirectorMobile = new URL('../../../../../docs/releases/screenshots/beta-creative-director-mobile.jpg', import.meta.url).href;
const galleryDirectionDesktop = new URL('../../../../../docs/releases/screenshots/beta-gallery-preset-desktop.jpg', import.meta.url).href;

const steps = [
  {
    number: '01',
    title: 'Share the business',
    description: 'Describe what you sell in ordinary language. Calinium combines that direction with the connected Shopify store instead of handing you an empty settings screen.'
  },
  {
    number: '02',
    title: 'Shape one direction',
    description: 'Calinium recommends a coherent storefront structure and visual system, asking only when an answer can materially change the outcome.'
  },
  {
    number: '03',
    title: 'Review before action',
    description: 'The proposed storefront remains reviewable. Generation or preview readiness never grants permission to publish or replace a live theme.'
  }
];

const principles = [
  ['Store-aware', 'Uses connected Shopify context within the access the merchant grants.'],
  ['Truth-bound', 'Designed to leave out unsupported sections and unverified merchant claims rather than inventing them.'],
  ['Architecture-led', 'Structure, hierarchy, and interaction can change—not only colors and type.'],
  ['Merchant-controlled', 'Human review stays in the loop, and live-theme action is never automatic.']
];

const questions = [
  {
    question: 'Does a Calinium preview change my live store?',
    answer: 'No. The controlled staging workflow renders to a separate non-live DEVELOPMENT theme. Preview readiness does not publish, activate, replace, or authorize changes to the live theme.'
  },
  {
    question: 'What does Calinium need from a store?',
    answer: 'A connected Shopify store, accurate catalog information, usable product imagery, and merchant confirmation for claims or content that Shopify cannot establish automatically.'
  },
  {
    question: 'Which storefront experiences are supported today?',
    answer: 'Repository validation covers Homepage, Collection, Product, and Cart across two architecture directions. Broader production-store compatibility and public installation are still being prepared and are not claimed here.'
  },
  {
    question: 'Can the direction be changed?',
    answer: 'The implemented journey retains an explicit refinement path. A request does not silently regenerate, repair, publish, or alter a live storefront.'
  },
  {
    question: 'What will Calinium cost?',
    answer: 'Public pricing has not been set. This local candidate offers no purchase, paid plan, or billing action.'
  },
  {
    question: 'Is human help available?',
    answer: 'Controlled testing is founder-assisted, but enrollment and a public support channel are not open yet. Verified contact and policy links will be added before publication.'
  }
];

export function LaunchPreviewPage() {
  useEffect(() => {
    const previousTitle = document.title;
    const existingDescription = document.head.querySelector('meta[name="description"]');
    const previousDescription = existingDescription?.getAttribute('content') ?? null;
    const description = existingDescription || document.createElement('meta');
    description.setAttribute('name', 'description');
    description.setAttribute('content', 'A local release preview of Calinium, an AI creative direction system for custom Shopify storefronts.');
    if (!existingDescription) document.head.append(description);
    document.title = 'Calinium — Storefront direction, shaped around your business';

    return () => {
      document.title = previousTitle;
      if (!existingDescription) description.remove();
      else if (previousDescription === null) existingDescription.removeAttribute('content');
      else existingDescription.setAttribute('content', previousDescription);
    };
  }, []);

  return <div className="launch-preview" id="launch-top">
    <a className="launch-skip" href="#launch-main">Skip to content</a>
    <header className="launch-header">
      <a className="launch-wordmark" href="#launch-top" aria-label="Calinium, back to top">Calinium</a>
      <nav className="launch-nav" aria-label="Launch preview">
        <a href="#how-it-works">How it works</a>
        <a href="#principles">Principles</a>
        <a href="#faq">FAQ</a>
        <a href="#availability">Availability</a>
      </nav>
      <a className="launch-status-link" href="#availability"><span aria-hidden="true" />Development preview</a>
    </header>

    <main id="launch-main">
      <section className="launch-hero" aria-labelledby="launch-title">
        <div className="launch-hero__copy">
          <p className="launch-kicker">Creative direction for Shopify</p>
          <h1 id="launch-title">Your storefront should begin with your business—not a template.</h1>
          <p className="launch-hero__lede">Calinium is an AI creative direction system for Shopify. It learns from the store, listens for merchant intent, and prepares a storefront direction shaped around the brand and its products.</p>
          <div className="launch-hero__actions">
            <a className="launch-button launch-button--primary" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
            <a className="launch-button launch-button--secondary" href="#availability">View availability</a>
          </div>
          <p className="launch-hero__note"><span aria-hidden="true" /> Founder-controlled technical testing. External enrollment is not currently open.</p>
        </div>

        <div className="launch-hero__visual" role="group" aria-label="Calinium product-development previews">
          <div className="launch-orbit launch-orbit--one" aria-hidden="true" />
          <div className="launch-orbit launch-orbit--two" aria-hidden="true" />
          <figure className="launch-preview-frame launch-preview-frame--desktop">
            <div className="launch-preview-frame__bar" aria-hidden="true"><i /><i /><i /><span>Direction review</span></div>
            <img src={galleryDirectionDesktop} width="1440" height="900" alt="Calinium interface presenting a recommended Gallery storefront visual system." />
          </figure>
          <figure className="launch-preview-frame launch-preview-frame--mobile">
            <img src={creativeDirectorMobile} width="320" height="568" alt="Calinium mobile conversation beginning with a merchant's business." />
          </figure>
          <p className="launch-preview-caption">Calinium product-development captures. Interface details may change before public release.</p>
        </div>
      </section>

      <aside className="launch-manifesto" aria-label="Calinium approach">
        <p>Designed to make considered decisions with you.</p>
        <span>Not another blank canvas.</span>
      </aside>

      <section className="launch-section launch-process" id="how-it-works" aria-labelledby="process-title">
        <div className="launch-section__heading">
          <p className="launch-kicker">A clearer way to begin</p>
          <h2 id="process-title">From merchant context to a reviewable storefront direction.</h2>
          <p>Calinium’s intended experience is conversational and embedded in Shopify. The system handles technical composition while keeping merchant truth and consequential actions explicit.</p>
        </div>
        <ol className="launch-step-grid">
          {steps.map((step) => <li key={step.number}>
            <span>{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </li>)}
        </ol>
      </section>

      <section className="launch-showcase" aria-labelledby="showcase-title">
        <div className="launch-showcase__copy">
          <p className="launch-kicker">Direction, not decoration</p>
          <h2 id="showcase-title">A visual system with a reason behind it.</h2>
          <p>Catalog shape, imagery, content depth, product complexity, and how customers shop can call for genuinely different storefront structures. Calinium is being built to make that distinction before applying the visual layer.</p>
          <blockquote><p>“The merchant describes the business. Calinium designs the storefront.”</p><cite>Calinium product principle</cite></blockquote>
        </div>
        <div className="launch-showcase__card">
          <div>
            <span>Context</span>
            <strong>Products, imagery, catalog, intent</strong>
          </div>
          <div aria-hidden="true">→</div>
          <div>
            <span>Direction</span>
            <strong>Structure, hierarchy, visual system</strong>
          </div>
          <div aria-hidden="true">→</div>
          <div>
            <span>Review</span>
            <strong>Preview, evidence, merchant control</strong>
          </div>
        </div>
      </section>

      <section className="launch-section launch-principles" id="principles" aria-labelledby="principles-title">
        <div className="launch-section__heading launch-section__heading--compact">
          <p className="launch-kicker">What stays non-negotiable</p>
          <h2 id="principles-title">Taste needs guardrails.</h2>
        </div>
        <dl>
          {principles.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}
        </dl>
      </section>

      <section className="launch-section launch-faq" id="faq" aria-labelledby="faq-title">
        <div className="launch-section__heading launch-section__heading--compact">
          <p className="launch-kicker">Before you begin</p>
          <h2 id="faq-title">Clear boundaries, in plain language.</h2>
        </div>
        <dl>
          {questions.map(({ question, answer }) => <div key={question}><dt>{question}</dt><dd>{answer}</dd></div>)}
        </dl>
      </section>

      <section className="launch-availability" id="availability" aria-labelledby="availability-title">
        <div>
          <p className="launch-kicker">Availability</p>
          <h2 id="availability-title">Founder-controlled staging now. Public access later.</h2>
        </div>
        <div className="launch-availability__detail">
          <p><strong>Enrollment is currently unavailable.</strong> Calinium’s staging app is controlled development infrastructure, not an installable public product.</p>
          <p>The separate public Calinium app still requires release preparation and Shopify review before unrelated merchants can install it. This page does not collect interest, create an account, or offer a purchase.</p>
          <a href="#how-it-works">Review the process <span aria-hidden="true">↑</span></a>
        </div>
      </section>
    </main>

    <footer className="launch-footer">
      <a className="launch-wordmark" href="#launch-top" aria-label="Calinium, back to top">Calinium</a>
      <p>Local product release candidate · No enrollment or purchase is offered here.</p>
    </footer>
  </div>;
}
