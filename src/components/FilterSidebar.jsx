import React from 'react';
import { Sliders, Globe, Trophy, Hammer, Boxes, Users, Gamepad2, Languages, Mic, Sparkles } from 'lucide-react';

export const FORTNITE_REGIONS = [
  { value: 'NA-East', label: 'North America - East (NAE)' },
  { value: 'NA-Central', label: 'North America - Central (NAC)' },
  { value: 'NA-West', label: 'North America - West (NAW)' },
  { value: 'Europe', label: 'Europe (EU)' },
  { value: 'Asia', label: 'Asia (AS)' },
  { value: 'Brazil', label: 'Brazil / South America (BR)' },
  { value: 'Oceania', label: 'Oceania (OCE)' },
  { value: 'Middle-East', label: 'Middle East (ME)' }
];

export const FORTNITE_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Portuguese',
  'Italian', 'Russian', 'Japanese', 'Korean', 'Arabic', 'Hindi'
];

export const FORTNITE_PLATFORMS = [
  'PC', 'PlayStation', 'Xbox', 'Nintendo', 'Mobile'
];

export default function FilterSidebar({ filters, setFilters, onReset, onOpenWizard }) {
  const handleMainModeChange = (mode) => {
    setFilters(prev => {
      const next = { ...prev, mainMode: mode };
      if (mode === 'Creative' && prev.teamSize === 'Trios') {
        next.teamSize = 'Duos';
      }
      return next;
    });
  };

  return (
    <aside className="sidebar">
      <div className="card filter-card">
        <div className="card-header">
          <h2 className="card-title">
            <Sliders size={18} /> Match Preferences
          </h2>
          <button type="button" className="btn-text" onClick={onReset}>
            Reset
          </button>
        </div>

        <form className="filter-form" onSubmit={e => e.preventDefault()}>
          
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <button 
              type="button" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.85rem' }}
              onClick={onOpenWizard}
            >
              <Sparkles size={16} /> Use Visual Search Wizard
            </button>
          </div>

          <div className="section-divider"><span>Or Filter Manually</span></div>

          <div className="form-group">
            <label htmlFor="filterRegion">
              <Globe size={14} /> Server Region
            </label>
            <select
              id="filterRegion"
              className="form-select"
              value={filters.region}
              onChange={e => setFilters(prev => ({ ...prev, region: e.target.value }))}
            >
              {FORTNITE_REGIONS.map(reg => (
                <option key={reg.value} value={reg.value}>{reg.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <Trophy size={14} /> Game Mode
            </label>
            <div className="button-group">
              {['Ranked', 'Unranked', 'Creative'].map(mode => (
                <button
                  key={mode}
                  type="button"
                  className={`btn-toggle ${filters.mainMode === mode ? 'active' : ''}`}
                  onClick={() => handleMainModeChange(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {filters.mainMode !== 'Creative' && (
            <div className="form-group">
              <label>
                <Hammer size={14} /> Build Setting
              </label>
              <div className="button-group">
                {['Build', 'No Build'].map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`btn-toggle ${filters.buildType === type ? 'active' : ''}`}
                    onClick={() => setFilters(prev => ({ ...prev, buildType: type }))}
                  >
                    {type === 'No Build' ? 'No Build (Zero Build)' : 'Build'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filters.mainMode === 'Creative' && (
            <div className="form-group">
              <label>
                <Boxes size={14} /> Creative Type
              </label>
              <div className="button-group">
                {['Box Fight', 'Zonewars'].map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`btn-toggle ${filters.creativeType === type ? 'active' : ''}`}
                    onClick={() => setFilters(prev => ({ ...prev, creativeType: type }))}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>
              <Users size={14} /> Team Size
            </label>
            <div className="button-group">
              {['Duos', ...(filters.mainMode !== 'Creative' ? ['Trios'] : []), 'Squads'].map(size => (
                <button
                  key={size}
                  type="button"
                  className={`btn-toggle ${filters.teamSize === size ? 'active' : ''}`}
                  onClick={() => setFilters(prev => ({ ...prev, teamSize: size }))}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="filterPlatform">
              <Gamepad2 size={14} /> Platform
            </label>
            <select
              id="filterPlatform"
              className="form-select"
              value={filters.platform}
              onChange={e => setFilters(prev => ({ ...prev, platform: e.target.value }))}
            >
              <option value="Any">Any Platform (Crossplay)</option>
              {FORTNITE_PLATFORMS.map(plat => (
                <option key={plat} value={plat}>{plat}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="filterLangPrimary">
                <Languages size={14} /> Primary Language
              </label>
              <select
                id="filterLangPrimary"
                className="form-select"
                value={filters.langPrimary}
                onChange={e => setFilters(prev => ({ ...prev, langPrimary: e.target.value }))}
              >
                {FORTNITE_LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="filterLangSecondary">Secondary</label>
              <select
                id="filterLangSecondary"
                className="form-select"
                value={filters.langSecondary}
                onChange={e => setFilters(prev => ({ ...prev, langSecondary: e.target.value }))}
              >
                <option value="None">None (Optional)</option>
                {FORTNITE_LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>
              <Mic size={14} /> Microphone
            </label>
            <div className="button-group">
              {[
                { val: 'Yes', label: 'Mic Required' },
                { val: 'Any', label: 'Any Mic OK' },
                { val: 'No', label: 'No Mic' }
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  className={`btn-toggle ${filters.mic === opt.val ? 'active' : ''}`}
                  onClick={() => setFilters(prev => ({ ...prev, mic: opt.val }))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </form>
      </div>
    </aside>
  );
}
