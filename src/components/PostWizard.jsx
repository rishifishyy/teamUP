import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Globe, Trophy, Gamepad2, Mic, MicOff, Megaphone, Send } from 'lucide-react';
import { FORTNITE_REGIONS } from './FilterSidebar';

const IMAGES = {
  region: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80",
  Ranked: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80",
  Unranked: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80",
  Creative: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
  PC: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?auto=format&fit=crop&w=600&q=80",
  PlayStation: "/ps.jpg",
  Xbox: "/xbox.jpg",
  Nintendo: "/nintendo.jpg",
  Any: "/any.jpg"
};

const FORTNITE_RANKS = [
  { name: 'Bronze', color: '#cd7f32', bg: 'rgba(205, 127, 50, 0.16)', border: '#cd7f32', icon: '🥉', desc: 'Bronze I - III' },
  { name: 'Silver', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.16)', border: '#94a3b8', icon: '🥈', desc: 'Silver I - III' },
  { name: 'Gold', color: '#eab308', bg: 'rgba(234, 179, 8, 0.16)', border: '#eab308', icon: '🥇', desc: 'Gold I - III' },
  { name: 'Platinum', color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.16)', border: '#2dd4bf', icon: '💠', desc: 'Platinum I - III' },
  { name: 'Diamond', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.16)', border: '#3b82f6', icon: '🔷', desc: 'Diamond I - III' },
  { name: 'Elite', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.18)', border: '#a855f7', icon: '💜', desc: 'Elite' },
  { name: 'Champion', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.18)', border: '#ef4444', icon: '🔥', desc: 'Champion' },
  { name: 'Unreal', color: '#ec4899', bg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(236, 72, 153, 0.3))', border: '#ec4899', icon: '🌌', desc: 'Unreal Tier' }
];

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95
  })
};

export default function PostWizard({
  isOpen,
  onClose,
  onSubmitPost,
  initialPreferences,
  currentUser,
  targetPost = null,
  mode = 'post',
  onSendInvite = null,
  isSending = false
}) {
  const isInviteMode = mode === 'invite' || Boolean(targetPost);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  const [wizardData, setWizardData] = useState({
    region: targetPost?.region || initialPreferences?.region || currentUser?.region || 'NA-East',
    mainMode: targetPost?.mainMode || initialPreferences?.mainMode || 'Ranked',
    rank: 'Diamond',
    subMode: targetPost?.mainMode === 'Creative' ? (targetPost?.creativeType || 'Box Fight') : (targetPost?.teamSize || 'Duos'),
    buildType: targetPost?.buildType || 'Build',
    platform: initialPreferences?.platform !== 'Any' ? initialPreferences?.platform : 'PC',
    hasMic: initialPreferences?.mic !== 'No',
    note: ''
  });

  useEffect(() => {
    if (currentUser) {
      let defaultPlat = 'PC';
      if (currentUser.psnId) defaultPlat = 'PlayStation';
      else if (currentUser.xboxId) defaultPlat = 'Xbox';
      else if (currentUser.nintendoId) defaultPlat = 'Nintendo';

      setWizardData(prev => ({
        ...prev,
        region: targetPost?.region || currentUser.region || prev.region,
        platform: defaultPlat,
        hasMic: currentUser.hasMic !== undefined ? currentUser.hasMic : prev.hasMic
      }));
    }
  }, [currentUser, targetPost, isOpen]);

  if (!isOpen) return null;

  // Step Progression
  // Step 1: Region
  // Step 2: Mode (Ranked / Unranked / Creative)
  // Step 3: Ranked Tier (Only if mainMode === 'Ranked')
  // Step 4: Build Mode (Build / Zero Build) - skipped if Creative
  // Step 5: Team Size / Creative Type
  // Step 6: Platform & Mic
  // Step 7: Note & Submit

  const nextStep = () => {
    setDirection(1);
    if (step === 2) {
      if (wizardData.mainMode === 'Ranked') {
        setStep(3); // Go to Ranked Tier
      } else if (wizardData.mainMode === 'Creative') {
        setStep(5); // Skip Build Mode, go to Creative Type
      } else {
        setStep(4); // Go to Build Mode
      }
    } else if (step === 3) {
      setStep(4); // Ranked tier -> Build Mode
    } else if (step === 4) {
      setStep(5); // Build Mode -> Team Size
    } else if (step === 5) {
      setStep(6); // Team Size / Creative Type -> Platform & Mic
    } else if (step === 6) {
      setStep(7); // Platform & Mic -> Note & Submit
    } else {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setDirection(-1);
    if (step === 7) {
      setStep(6);
    } else if (step === 6) {
      setStep(5);
    } else if (step === 5) {
      if (wizardData.mainMode === 'Creative') {
        setStep(2);
      } else {
        setStep(4);
      }
    } else if (step === 4) {
      if (wizardData.mainMode === 'Ranked') {
        setStep(3);
      } else {
        setStep(2);
      }
    } else if (step === 3) {
      setStep(2);
    } else {
      setStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    const finalData = { ...wizardData };
    
    if (finalData.mainMode === 'Creative') {
      finalData.creativeType = finalData.subMode;
      finalData.teamSize = finalData.subMode === 'Zonewars' ? 'Squads' : 'Duos';
      finalData.buildType = 'Build';
    } else {
      finalData.teamSize = finalData.subMode;
      finalData.creativeType = 'Box Fight';
    }

    if (isInviteMode && onSendInvite) {
      onSendInvite({
        platform: finalData.platform,
        rank: finalData.mainMode === 'Ranked' ? finalData.rank : 'Unranked',
        region: finalData.region,
        hasMic: finalData.hasMic ? 'Yes' : 'No',
        langPrimary: currentUser?.langPrimary || 'English',
        note: finalData.note.trim()
      });
    } else if (onSubmitPost) {
      onSubmitPost({
        id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        gamertag: currentUser?.epicTag || '',
        epicTag: currentUser?.epicTag || '',
        psnId: currentUser?.psnId || '',
        xboxId: currentUser?.xboxId || '',
        discordId: currentUser?.discordId || '',
        region: finalData.region,
        platform: finalData.platform,
        mainMode: finalData.mainMode,
        buildType: finalData.buildType,
        creativeType: finalData.creativeType,
        teamSize: finalData.teamSize,
        langPrimary: currentUser?.langPrimary || 'English',
        langSecondary: currentUser?.langSecondary || 'None',
        hasMic: finalData.hasMic,
        note: finalData.note.trim(),
        rank: finalData.mainMode === 'Ranked' ? finalData.rank : 'Unranked',
        createdAt: new Date().toISOString(),
        postedAt: new Date().toISOString()
      });
      onClose();
      setTimeout(() => {
        setStep(1);
        setDirection(1);
        setWizardData(prev => ({ ...prev, note: '' }));
      }, 300);
    }
  };

  const selectData = (key, val) => {
    setWizardData(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'mainMode') {
        next.subMode = val === 'Creative' ? 'Box Fight' : 'Duos';
      }
      return next;
    });
  };

  // Step 1: Region Selection
  const renderStep1 = () => (
    <motion.div
      key="step1"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="wizard-step"
    >
      <h3 className="wizard-title"><Globe className="text-primary" size={24} /> Select Server Region</h3>
      <div className="wizard-hero-image" style={{ backgroundImage: `url(${IMAGES.region})` }} />
      <div className="wizard-grid-scroll">
        {FORTNITE_REGIONS.map(reg => (
          <button
            key={reg.value}
            className={`wizard-option-btn ${wizardData.region === reg.value ? 'selected' : ''}`}
            onClick={() => selectData('region', reg.value)}
          >
            {reg.label}
          </button>
        ))}
      </div>
      <div className="wizard-nav">
        <div />
        <button className="btn btn-primary" onClick={nextStep}>Next <ChevronRight size={18} /></button>
      </div>
    </motion.div>
  );

  // Step 2: Game Mode Selection
  const renderStep2 = () => (
    <motion.div
      key="step2"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="wizard-step"
    >
      <h3 className="wizard-title"><Trophy className="text-primary" size={24} /> Choose Game Mode</h3>
      <div className="wizard-cards-row">
        {['Ranked', 'Unranked', 'Creative'].map(modeItem => (
          <div 
            key={modeItem} 
            className={`wizard-image-card ${wizardData.mainMode === modeItem ? 'selected' : ''}`}
            onClick={() => selectData('mainMode', modeItem)}
          >
            <div className="wic-bg" style={{ backgroundImage: `url(${IMAGES[modeItem]})` }} />
            <div className="wic-overlay">
              <h4>{modeItem}</h4>
            </div>
          </div>
        ))}
      </div>
      <div className="wizard-nav">
        <button className="btn btn-outline" onClick={prevStep}><ChevronLeft size={18} /> Back</button>
        <button className="btn btn-primary" onClick={nextStep}>Next <ChevronRight size={18} /></button>
      </div>
    </motion.div>
  );

  // Step 3: Fortnite Ranked Tiers (Official Tiers)
  const renderStep3RankedTier = () => (
    <motion.div
      key="step3_ranked_tier"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="wizard-step"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h3 className="wizard-title" style={{ margin: 0 }}>
          <Trophy className="text-primary" size={24} /> Select Your Ranked Tier
        </h3>
        <span style={{ fontSize: '0.8rem', background: 'rgba(234, 179, 8, 0.18)', color: '#facc15', padding: '3px 8px', borderRadius: '12px', fontWeight: '800' }}>
          Official Fortnite Tiers
        </span>
      </div>
      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted, #cbd5e1)', marginBottom: '1.25rem' }}>
        Eliminate opponents and progress through the ranks to dominate the leaderboards.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', maxHeight: '290px', overflowY: 'auto', paddingRight: '4px' }}>
        {FORTNITE_RANKS.map(rk => {
          const isSelected = wizardData.rank === rk.name;
          return (
            <button
              key={rk.name}
              type="button"
              onClick={() => selectData('rank', rk.name)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.9rem 0.5rem',
                borderRadius: '14px',
                border: isSelected ? `2px solid ${rk.border}` : '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
                background: isSelected ? rk.bg : 'var(--bg-surface, #1e293b)',
                boxShadow: isSelected ? `0 0 18px ${rk.border}55` : '0 2px 8px rgba(0, 0, 0, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }}
            >
              <span style={{ fontSize: '1.65rem', marginBottom: '0.35rem' }}>{rk.icon}</span>
              <strong style={{
                fontSize: '0.95rem',
                color: isSelected ? rk.color : 'var(--text-main, #ffffff)',
                fontWeight: '800',
                letterSpacing: '0.2px'
              }}>
                {rk.name}
              </strong>
              <span style={{
                fontSize: '0.75rem',
                color: isSelected ? rk.color : 'var(--text-muted, #cbd5e1)',
                marginTop: '3px',
                fontWeight: isSelected ? '700' : '500'
              }}>
                {rk.desc}
              </span>
            </button>
          );
        })}
      </div>

      <div className="wizard-nav" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
        <button className="btn btn-outline" onClick={prevStep}><ChevronLeft size={18} /> Back</button>
        <button className="btn btn-primary" onClick={nextStep}>Next <ChevronRight size={18} /></button>
      </div>
    </motion.div>
  );

  // Step 4: Build Mode
  const renderStep4Build = () => {
    const options = ['Build', 'Zero Build'];
    
    return (
      <motion.div
        key="step4_build"
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="wizard-step"
      >
        <h3 className="wizard-title"><Trophy className="text-primary" size={24} /> Select Build Setting</h3>
        <div className="wizard-grid-scroll" style={{ marginTop: '2rem' }}>
          {options.map(opt => (
            <button
              key={opt}
              className={`wizard-option-btn ${wizardData.buildType === opt ? 'selected' : ''}`}
              style={{ textAlign: 'center', padding: '1.5rem', fontSize: '1.2rem' }}
              onClick={() => selectData('buildType', opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="wizard-nav">
          <button className="btn btn-outline" onClick={prevStep}><ChevronLeft size={18} /> Back</button>
          <button className="btn btn-primary" onClick={nextStep}>Next <ChevronRight size={18} /></button>
        </div>
      </motion.div>
    );
  };

  // Step 5: Team Size / Creative Type
  const renderStep5TeamSize = () => {
    const isCreative = wizardData.mainMode === 'Creative';
    const options = isCreative ? ['Box Fight', 'Zonewars', '1v1', 'Realistics'] : ['Duos', 'Trios', 'Squads'];
    const title = isCreative ? 'Select Creative Map Type' : 'Select Team Size';
    
    return (
      <motion.div
        key="step5_teamsize"
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="wizard-step"
      >
        <h3 className="wizard-title"><Trophy className="text-primary" size={24} /> {title}</h3>
        <div className="wizard-grid-scroll" style={{ marginTop: '1.5rem' }}>
          {options.map(opt => (
            <button
              key={opt}
              className={`wizard-option-btn ${wizardData.subMode === opt ? 'selected' : ''}`}
              style={{ textAlign: 'center', padding: '1.25rem', fontSize: '1.1rem' }}
              onClick={() => selectData('subMode', opt)}
            >
              {opt}
            </button>
          ))}
        </div>
        <div className="wizard-nav">
          <button className="btn btn-outline" onClick={prevStep}><ChevronLeft size={18} /> Back</button>
          <button className="btn btn-primary" onClick={nextStep}>Next <ChevronRight size={18} /></button>
        </div>
      </motion.div>
    );
  };

  // Step 6: Platform & Mic
  const renderStep6PlatformMic = () => (
    <motion.div
      key="step6_platform"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="wizard-step"
    >
      <h3 className="wizard-title"><Gamepad2 className="text-primary" size={24} /> Platform &amp; Voice Mic</h3>
      <div className="wizard-cards-row" style={{ marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Any'].map(plat => {
          let bg = IMAGES.region;
          if (plat === 'PC') bg = IMAGES.PC;
          if (plat === 'PlayStation') bg = IMAGES.PlayStation;
          if (plat === 'Xbox') bg = IMAGES.Xbox;
          if (plat === 'Nintendo') bg = IMAGES.Nintendo;
          if (plat === 'Any') bg = IMAGES.Any;

          return (
            <div 
              key={plat} 
              className={`wizard-image-card ${wizardData.platform === plat ? 'selected' : ''}`}
              onClick={() => selectData('platform', plat)}
              style={{ height: '95px' }}
            >
              <div className="wic-bg" style={{ backgroundImage: `url(${bg})` }} />
              <div className="wic-overlay">
                <h4>{plat}</h4>
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <button
          type="button"
          className={`wizard-option-btn ${wizardData.hasMic ? 'selected' : ''}`}
          onClick={() => selectData('hasMic', true)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', padding: '1.2rem 1rem' }}
        >
          <Mic size={22} />
          <span>Mic On (Voice)</span>
        </button>
        <button
          type="button"
          className={`wizard-option-btn ${!wizardData.hasMic ? 'selected' : ''}`}
          onClick={() => selectData('hasMic', false)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', padding: '1.2rem 1rem' }}
        >
          <MicOff size={22} />
          <span>No Mic (Pings)</span>
        </button>
      </div>

      <div className="wizard-nav" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
        <button className="btn btn-outline" onClick={prevStep}><ChevronLeft size={18} /> Back</button>
        <button className="btn btn-primary" onClick={nextStep}>Next <ChevronRight size={18} /></button>
      </div>
    </motion.div>
  );

  // Step 7: Add a Note & Submit
  const renderStep7NoteSubmit = () => (
    <motion.div
      key="step7_note"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="wizard-step"
    >
      <h3 className="wizard-title">
        {isInviteMode ? (
          <><Send className="text-primary" size={24} /> Send Request to {targetPost?.gamertag || targetPost?.username}</>
        ) : (
          <><Megaphone className="text-primary" size={24} /> Add a Note &amp; Broadcast</>
        )}
      </h3>

      {isInviteMode && targetPost && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid var(--primary-color)',
          borderRadius: '10px',
          fontSize: '0.85rem',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span><strong>Target Player:</strong> {targetPost.gamertag || targetPost.username}</span>
          <span style={{ color: 'var(--primary-color)', fontWeight: '700' }}>
            {wizardData.mainMode === 'Ranked' ? `${wizardData.rank} Ranked` : wizardData.mainMode}
          </span>
        </div>
      )}
      
      <div className="form-group" style={{ flex: 1, marginTop: '0.5rem' }}>
        <label htmlFor="postNote">Short Note (Optional)</label>
        <textarea
          id="postNote"
          className="form-input"
          placeholder={isInviteMode ? "e.g. Let's grind Unreal duos together, I have mic!" : "e.g. Need an IGL, pushing Unreal..."}
          rows="4"
          value={wizardData.note}
          onChange={e => setWizardData({ ...wizardData, note: e.target.value })}
          maxLength="100"
          style={{ resize: 'none' }}
        />
        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
          Your Epic Games Tag, Console IDs, and Language preferences will be automatically attached from your profile.
        </small>
      </div>

      <div className="wizard-nav" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
        <button className="btn btn-outline" onClick={prevStep} disabled={isSending}>
          <ChevronLeft size={18} /> Back
        </button>
        <button className="btn btn-primary" onClick={handleComplete} disabled={isSending}>
          {isSending ? (
            <>Sending...</>
          ) : isInviteMode ? (
            <><Send size={18} /> Send Teammate Request</>
          ) : (
            <><Megaphone size={18} /> Broadcast Request</>
          )}
        </button>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-backdrop wizard-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="modal-box wizard-box"
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="modal-head wizard-head">
              <div className="wizard-progress">
                <div className={`wp-dot ${step >= 1 ? 'active' : ''}`} />
                <div className="wp-line" />
                <div className={`wp-dot ${step >= 2 ? 'active' : ''}`} />
                <div className="wp-line" />
                <div className={`wp-dot ${step >= 3 ? 'active' : ''}`} />
                <div className="wp-line" />
                <div className={`wp-dot ${step >= 4 ? 'active' : ''}`} />
                <div className="wp-line" />
                <div className={`wp-dot ${step >= 5 ? 'active' : ''}`} />
                <div className="wp-line" />
                <div className={`wp-dot ${step >= 6 ? 'active' : ''}`} />
                <div className="wp-line" />
                <div className={`wp-dot ${step >= 7 ? 'active' : ''}`} />
              </div>
              <button type="button" className="modal-close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <div className="wizard-body-wrapper">
              <AnimatePresence custom={direction} mode="wait">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3RankedTier()}
                {step === 4 && renderStep4Build()}
                {step === 5 && renderStep5TeamSize()}
                {step === 6 && renderStep6PlatformMic()}
                {step === 7 && renderStep7NoteSubmit()}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
