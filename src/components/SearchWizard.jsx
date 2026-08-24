import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Globe, Trophy, Gamepad2, Search } from 'lucide-react';
import { FORTNITE_REGIONS, FORTNITE_PLATFORMS } from './FilterSidebar';

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

export default function SearchWizard({ isOpen, onClose, onComplete, currentFilters }) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [wizardData, setWizardData] = useState({
    region: currentFilters?.region || 'NA-East',
    mainMode: currentFilters?.mainMode || 'Ranked',
    subMode: currentFilters?.mainMode === 'Creative' ? (currentFilters?.creativeType || 'Box Fight') : (currentFilters?.teamSize || 'Duos'),
    platform: currentFilters?.platform || 'Any'
  });

  if (!isOpen) return null;

  const nextStep = () => {
    setDirection(1);
    setStep(prev => prev + 1);
  };

  const prevStep = () => {
    setDirection(-1);
    setStep(prev => prev - 1);
  };

  const handleComplete = () => {
    const finalData = { ...wizardData };
    if (finalData.mainMode === 'Creative') {
      finalData.creativeType = finalData.subMode;
      finalData.teamSize = finalData.subMode === 'Zonewars' ? 'Squads' : 'Duos'; // defaults
    } else {
      finalData.teamSize = finalData.subMode;
    }
    delete finalData.subMode;

    onComplete(finalData);
    onClose();
    setTimeout(() => { setStep(1); setDirection(1); }, 300);
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
    <div
      key="step1"
      className="wizard-step"
      style={{ zIndex: 1 }}
    >
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

  const renderStep4 = () => (
    <motion.div
      key="step4"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="wizard-step"
    >
      <h3 className="wizard-title"><Gamepad2 className="text-primary" size={24} /> Preferred Platform</h3>
      <div className="wizard-cards-row" style={{ flexWrap: 'wrap' }}>
        {['Any', 'PC', 'PlayStation', 'Xbox', 'Nintendo'].map(plat => {
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
      <div className="wizard-nav">
        <button className="btn btn-outline" onClick={prevStep}><ChevronLeft size={18} /> Back</button>
        <button className="btn btn-primary" onClick={handleComplete}><Search size={18} /> Find Teammates</button>
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
              </div>
              <button type="button" className="modal-close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <div className="wizard-body-wrapper">
              <AnimatePresence custom={direction} mode="wait">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
