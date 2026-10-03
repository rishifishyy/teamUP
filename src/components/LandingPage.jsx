import { ArrowRight, ArrowUpRight, Check, Crown, Gamepad2, Globe2, Headphones, Mic, Radio, ShieldCheck, SlidersHorizontal, Swords, Users, Zap } from 'lucide-react';

const steps = [
  { icon: Gamepad2, title: 'Make yourself known.', description: 'Add your Epic, console, or Discord ID so your next teammate knows where to find you.' },
  { icon: SlidersHorizontal, title: 'Find your kind of player.', description: 'Choose your region, game mode, build style, language, and mic preference.' },
  { icon: Users, title: 'Connect. Queue. Win.', description: 'Send an invite, talk in match chat, and take that new connection into your next game.' }
];
const features = [
  { icon: Globe2, title: 'Your region. Your rhythm.', description: 'All eight Fortnite server regions, so finding a teammate starts close to home.', label: 'GLOBAL CONNECTIONS' },
  { icon: Swords, title: 'However you play.', description: 'Ranked, Unranked, and Creative. Build or Zero Build. Find a partner for your game plan.', label: 'CHOOSE YOUR PLAYSTYLE' },
  { icon: Headphones, title: 'Good comms come first.', description: 'Match by mic and language preferences, then break the ice in your own match chat.', label: 'STAY ON THE SAME PAGE' }
];

export default function LandingPage({ onStartFinder, onOpenAuthModal, onOpenPremium, currentUser }) {
  return (
    <main className="landing-wrapper">
      <section className="landing-hero">
        <div className="container landing-hero-container">
          <div className="hero-copy">
            <div className="eyebrow"><span className="signal-dot" /> FORTNITE. BETTER TOGETHER.</div>
            <h1 className="hero-main-heading">Good games.<br />Great teammates.<br /><span className="hero-accent">That’s TeamUP.</span></h1>
            <p className="hero-lead-text">Your next duo is out there. Find Fortnite players who share your region, your playstyle, and your will to win.</p>
            <div className="hero-cta-group">
              <button className="btn btn-primary btn-lg" onClick={onStartFinder}>Find my squad <ArrowUpRight size={19} /></button>
              <a className="hero-how-link" href="#how-it-works">How it works <ArrowRight size={16} /></a>
            </div>
            <p className="hero-reassurance"><ShieldCheck size={15} /> Real players. Real requests. Start with 2 free matches.</p>
          </div>

          <div className="squad-visual" role="img" aria-label="A squad radar connects your region, playstyle, and voice preferences to your next team.">
            <div className="visual-topline"><span><Radio size={14} /> SQUAD SIGNAL</span><span className="visual-coordinate">TU / 08</span></div>
            <div className="radar-stage" aria-hidden="true">
              <div className="radar-orbit orbit-outer" /><div className="radar-orbit orbit-middle" /><div className="radar-orbit orbit-inner" />
              <div className="radar-crosshair horizontal" /><div className="radar-crosshair vertical" />
              <div className="radar-sweep" />
              <div className="squad-core"><Users size={47} strokeWidth={1.4} /><span>YOUR NEXT SQUAD</span><div className="core-team"><i /><i /><i /><i /></div></div>
              <div className="radar-node node-region"><div className="node-icon"><Globe2 size={19} /></div><div><small>LOW PING. HIGH SYNERGY.</small><strong>Same region</strong></div><Check size={14} className="node-check" /></div>
              <div className="radar-node node-mode"><div className="node-icon"><Swords size={19} /></div><div><small>BUILD YOUR GAME PLAN</small><strong>Your playstyle</strong></div></div>
              <div className="radar-node node-comms"><div className="node-icon"><Mic size={19} /></div><div><small>MAKE EVERY CALLOUT COUNT</small><strong>Better comms</strong></div><Check size={14} className="node-check" /></div>
              <span className="radar-point point-one" /><span className="radar-point point-two" /><span className="radar-point point-three" />
            </div>
            <div className="visual-bottomline"><span>LESS RANDOM. MORE TEAM.</span><ArrowUpRight size={18} /></div>
          </div>
        </div>
        <div className="container platform-strip"><span>ONE GAME. EVERY PLATFORM.</span><div><Gamepad2 size={17} /> Epic Games <i /> PlayStation <i /> Xbox <i /> Nintendo Switch <i /> Discord</div></div>
      </section>

      <section className="region-strip"><div className="container region-strip-inner"><span><Globe2 size={16} /> 8 regions. One community.</span><div>NA EAST <i /> NA CENTRAL <i /> NA WEST <i /> EUROPE <i /> ASIA <i /> BRAZIL <i /> OCEANIA <i /> MIDDLE EAST</div></div></section>

      <section className="landing-section" id="how-it-works">
        <div className="container">
          <div className="section-header"><div><p className="eyebrow">YOUR NEXT GAME STARTS HERE</p><h2 className="section-title">From solo to squad.<br /><span className="muted-heading">In three simple steps.</span></h2></div><p className="section-subtitle">Less time looking. More time playing.<br />Let’s find people you actually click with.</p></div>
          <div className="steps-grid">{steps.map(({ icon: Icon, title, description }, index) => <article className="step-card" key={title}><div className="step-top"><div className="step-icon-wrap"><Icon size={23} /></div><span className="step-number">0{index + 1}</span></div><h3 className="step-title">{title}</h3><p className="step-desc">{description}</p></article>)}</div>
        </div>
      </section>

      <section className="landing-section features-section"><div className="container"><div className="section-header"><div><p className="eyebrow">BUILT FOR YOUR LOBBY</p><h2 className="section-title">The right fit.<br /><span className="muted-heading">Before you drop in.</span></h2></div><span className="section-note"><Zap size={16} /> A better way to team up.</span></div><div className="features-showcase-grid">{features.map(({ icon: Icon, title, description, label }) => <article className="feature-box" key={title}><div className="feature-icon"><Icon size={25} /></div><span className="feature-label">{label}</span><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>

      <section className="container"><div className="landing-cta-banner"><div><p className="eyebrow"><Crown size={15} /> LEVEL UP YOUR CONNECTIONS</p><h2>Your squad is waiting.</h2><p>Start free. Go VIP when you’re ready for unlimited requests.</p></div><div className="banner-actions"><button className="btn btn-primary btn-lg" onClick={currentUser ? onStartFinder : () => onOpenAuthModal('signup')}>{currentUser ? 'Find my squad' : 'Get started free'}<ArrowUpRight size={18} /></button><button className="btn-text" onClick={onOpenPremium}>Explore VIP <ArrowRight size={14} /></button></div></div></section>
      <footer className="container landing-footer"><span>Team<strong>UP</strong><small>Find your people. Play your game.</small></span><p>Built for the Fortnite community.<br /><small>Eight regions. One community.</small></p></footer>
    </main>
  );
}
