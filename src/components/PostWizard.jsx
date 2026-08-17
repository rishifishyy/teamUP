import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Globe, Trophy, Gamepad2, Mic, MicOff, Megaphone } from 'lucide-react';
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

export default function PostWizard({ isOpen, onClose, onSubmitPost, initialPreferences, currentUser }) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [wizardData, setWizardData] = useState({
    region: initialPreferences?.region || currentUser?.region || 'NA-East',
    mainMode: initialPreferences?.mainMode || 'Ranked',
    subMode: initialPreferences?.mainMode === 'Creative' ? (initialPreferences?.creativeType || 'Box Fight') : (initialPreferences?.teamSize || 'Duos'),
    buildType: 'Build',
    platform: initialPreferences?.platform !== 'Any' ? initialPreferences?.platform : 'PC',
    hasMic: initialPreferences?.mic !== 'No',
    note: ''
  });

  useEffect(() => {
    if (currentUser) {
      setWizardData(prev => ({ ...prev, region: currentUser.region || prev.region, hasMic: currentUser.hasMic !== undefined ? currentUser.hasMic : prev.hasMic }));
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const nextStep = () => {
    setDirection(1);
    if (step === 2 && wizardData.mainMode === 'Creative') {
      setStep(4);
    } else {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setDirection(-1);
    if (step === 4 && wizardData.mainMode === 'Creative') {
      setStep(2);
    } else {
      setStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    const finalData = { ...wizardData };
    
    if (finalData.mainMode === 'Creative') {
      finalData.creativeType = finalData.subMode;
      finalData.teamSize = finalData.subMode === 'Zonewars' ? 'Squads' : 'Duos'; // defaults
      finalData.buildType = 'Build';
    } else {
      finalData.teamSize = finalData.subMode;
      finalData.creativeType = 'Box Fight';
    }
    
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
      rank: 'Diamond', // default
      createdAt: new Date().toISOString(),
      postedAt: 'Just now'
    });

    onClose();
    setTimeout(() => { setStep(1); setDirection(1); setWizardData(prev => ({...prev, note: ''})); }, 300);
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

  const renderStep1 = () => (
    <div key="step1" className="wizard-step" style={{ zIndex: 1 }}>
      <h3 className="wizard-title"><Globe className="text-primary" size={24} /> Select Your Region</h3>
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
    </div>
  );

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
        {['Ranked', 'Unranked', 'Creative'].map(mode => (
          <div 
            key={mode} 
            className={`wizard-image-card ${wizardData.mainMode === mode ? 'selected' : ''}`}
            onClick={() => selectData('mainMode', mode)}
          >
            <div className="wic-bg" style={{ backgroundImage: `url(${IMAGES[mode]})` }} />
            <div className="wic-overlay">
              <h4>{mode}</h4>
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

  const renderStep3 = () => {
    const options = ['Build', 'Zero Build'];
    
    return (
      <motion.div
        key="step3_build"
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="wizard-step"
      >
        <h3 className="wizard-title"><Trophy className="text-primary" size={24} /> Select Build Mode</h3>
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

  const renderStep4 = () => {
    const isCreative = wizardData.mainMode === 'Creative';
    const options = isCreative ? ['Box Fight', 'Zonewars'] : ['Duos', 'Trios', 'Squads'];
    const title = isCreative ? 'Select Creative Type' : 'Select Team Size';
    
    return (
      <motion.div
        key="step3"
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="wizard-step"
      >
        <h3 className="wizard-title"><Trophy className="text-primary" size={24} /> {title}</h3>
        <div className="wizard-grid-scroll" style={{ marginTop: '2rem' }}>
          {options.map(opt => (
            <button
              key={opt}
              className={`wizard-option-btn ${wizardData.subMode === opt ? 'selected' : ''}`}
              style={{ textAlign: 'center', padding: '1.5rem', fontSize: '1.2rem' }}
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

  const renderStep5 = () => (
    <motion.div
      key="step5"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="wizard-step"
    >
      <h3 className="wizard-title"><Gamepad2 className="text-primary" size={24} /> Platform &amp; Mic</h3>
      <div className="wizard-cards-row" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
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
              style={{ height: '100px' }}
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
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.5rem 1rem' }}
        >
          <Mic size={24} />
          <span>Mic On</span>
        </button>
        <button
          type="button"
          className={`wizard-option-btn ${!wizardData.hasMic ? 'selected' : ''}`}
          onClick={() => selectData('hasMic', false)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', padding: '1.5rem 1rem' }}
        >
          <MicOff size={24} />
          <span>No Mic</span>
        </button>
      </div>

      <div className="wizard-nav" style={{ marginTop: 'auto' }}>
        <button className="btn btn-outline" onClick={prevStep}><ChevronLeft size={18} /> Back</button>
        <button className="btn btn-primary" onClick={nextStep}>Next <ChevronRight size={18} /></button>
      </div>
    </motion.div>
  );

  const renderStep6 = () => (
    <motion.div
      key="step6"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="wizard-step"
    >
      <h3 className="wizard-title"><Megaphone className="text-primary" size={24} /> Add a Note &amp; Broadcast</h3>
      
      <div className="form-group" style={{ flex: 1, marginTop: '1rem' }}>
        <label htmlFor="postNote">Short Note (Optional)</label>
        <textarea
          id="postNote"
          className="form-input"
          placeholder="e.g. Need an IGL, pushing Unreal..."
          rows="4"
          value={wizardData.note}
          onChange={e => setWizardData({...wizardData, note: e.target.value})}
          maxLength="100"
          style={{ resize: 'none' }}
        />
        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
          Your Epic Games Tag, Console IDs, and Language preferences will be automatically attached from your profile.
        </small>
      </div>

      <div className="wizard-nav" style={{ marginTop: 'auto' }}>
        <button className="btn btn-outline" onClick={prevStep}><ChevronLeft size={18} /> Back</button>
        <button className="btn btn-primary" onClick={handleComplete}>
          <Megaphone size={18} /> Broadcast Request
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
          onClick={onClose}
        >
          <motion.div 
            className="modal-box wizard-box"
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
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
              </div>
              <button type="button" className="modal-close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <div className="wizard-body-wrapper">
              <AnimatePresence custom={direction} mode="wait">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}
                {step === 6 && renderStep6()}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
