import React from 'react';
import {
  Users,
  Trophy,
  Globe,
  Zap,
  ShieldCheck,
  Gamepad2,
  Mic,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Boxes,
  Hammer,
  Crown
} from 'lucide-react';

export default function LandingPage({ onStartFinder, onOpenAuthModal, onOpenPremium, currentUser }) {
  return (
    <div className="landing-wrapper">

      <section className="landing-hero">
        <div className="container landing-hero-container">
          <div className="hero-badge" onClick={onOpenPremium} style={{ cursor: 'pointer' }}>
            <Sparkles size={14} /> FORTNITE SQUAD &amp; DUO FINDER · <Crown size={13} style={{ color: '#fbbf24', marginLeft: 4 }} /> PREMIUM PLANS
          </div>

          <h1 className="hero-main-heading">
            Stop Playing With Randoms.<br />
            Find Your <span className="gradient-text">Ultimate Teammates.</span>
          </h1>

          <p className="hero-lead-text">
            TeamUP connects competitive and casual Fortnite players across all <strong>8 official regions</strong>,
            matching by <strong>Game Mode, Build Setting, Platform, Mic, and Languages</strong> with zero fake bot listings.
          </p>

          <div className="hero-cta-group">
            <button className="btn btn-primary btn-lg" onClick={onStartFinder}>
              <Zap size={18} style={{ fill: 'currentColor' }} /> Launch Live Pool <ArrowRight size={18} />
            </button>
            
            <button className="btn btn-outline btn-lg" onClick={onOpenPremium} style={{ color: '#eab308', borderColor: '#eab308' }}>
              <Crown size={18} /> View VIP Plans
            </button>
          </div>

          <div className="hero-stats-row">
            <div className="stat-pill">
              <Globe size={16} className="stat-icon" />
              <div>
                <strong>8 Server Regions</strong>
                <span>NAE, NAC, NAW, EU, AS, BR, OCE, ME</span>
              </div>
            </div>

            <div className="stat-pill">
              <Trophy size={16} className="stat-icon" />
              <div>
                <strong>Ranked &amp; Creative</strong>
                <span>Build, Zero Build, Box Fight, Zonewars</span>
              </div>
            </div>

            <div className="stat-pill">
              <Gamepad2 size={16} className="stat-icon" />
              <div>
                <strong>Multi-Platform IDs</strong>
                <span>Epic, PlayStation, Xbox &amp; Discord</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section how-it-works-section" id="how-it-works">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">How TeamUP Works</h2>
            <p className="section-subtitle">Three straightforward steps to find compatible partners and dominate the lobby.</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-icon-wrap">
                <Gamepad2 size={24} />
              </div>
              <h3 className="step-title">Link Your Gamer IDs</h3>
              <p className="step-desc">
                Add your <strong>Epic Games Gamertag</strong>, <strong>PSN ID</strong>, <strong>Xbox Tag</strong>, and <strong>Discord</strong> so teammates can connect instantly.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-icon-wrap">
                <Trophy size={24} />
              </div>
              <h3 className="step-title">Select Region &amp; Mode</h3>
              <p className="step-desc">
                Filter by your exact server region and mode — whether it is <strong>Ranked Zero Build Duos</strong>, <strong>Ranked Build Trios</strong>, or <strong>Creative Box Fights</strong>.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-icon-wrap">
                <Zap size={24} />
              </div>
              <h3 className="step-title">Instant Priority Match</h3>
              <p className="step-desc">
                Our algorithm orders real-time requests with <strong>compatibility scoring</strong>. Copy their gamertag with one click and drop into the battle bus!
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section features-section">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Built Exclusively for Fortnite Players</h2>
            <p className="section-subtitle">Every feature is tailored to Fortnite's matchmaking hierarchy.</p>
          </div>

          <div className="features-showcase-grid">

            <div className="feature-box">
              <div className="feature-icon"><Globe size={22} /></div>
              <h3>All 8 Server Regions</h3>
              <p>Match with players who share your lowest ping server: NA-East, NA-Central, NA-West, Europe, Asia, Brazil, Oceania, and Middle East.</p>
            </div>

            <div className="feature-box">
              <div className="feature-icon"><Hammer size={22} /></div>
              <h3>Build &amp; Zero Build</h3>
              <p>Separate queues for standard Build mechanics and tactical Zero Build playlists across Duos, Trios, and Squads.</p>
            </div>

            <div className="feature-box">
              <div className="feature-icon"><Boxes size={22} /></div>
              <h3>Creative Wagers &amp; Scrims</h3>
              <p>Find dedicated 2v2 Box Fight partners or 4v4 Zonewars custom lobby stacks for tournament practice.</p>
            </div>

            <div className="feature-box">
              <div className="feature-icon"><Mic size={22} /></div>
              <h3>Voice Mic &amp; Dual Languages</h3>
              <p>Filter by required microphone and match with teammates speaking your primary and secondary languages.</p>
            </div>

            <div className="feature-box">
              <div className="feature-icon"><MessageSquare size={22} /></div>
              <h3>Multi-Platform Gamertags</h3>
              <p>Display and copy Epic Games tags, PlayStation Network IDs, Xbox Gamertags, and Discord usernames in one place.</p>
            </div>

            <div className="feature-box">
              <div className="feature-icon"><ShieldCheck size={22} /></div>
              <h3>100% Real-Time Requests</h3>
              <p>No fake bots or stale database entries. Only active, live submissions from real players looking for games right now.</p>
            </div>

          </div>
        </div>
      </section>

      <section className="landing-cta-banner">
        <div className="container cta-container">
          <h2>Ready To Win Your Next Victory Royale?</h2>
          <p>Join other Fortnite players finding squads and duo partners today.</p>
          {currentUser ? (
            <button className="btn btn-primary btn-lg" onClick={onStartFinder}>
              <Zap size={18} /> Open Teammate Finder Now
            </button>
          ) : (
            <button className="btn btn-primary btn-lg" onClick={() => onOpenAuthModal('login')}>
              Login to Get Started
            </button>
          )}
        </div>
      </section>

    </div>
  );
}
