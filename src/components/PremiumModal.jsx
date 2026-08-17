import React, { useState } from 'react';
import { X, Crown, Check, Shield, Zap, Sparkles, LogIn, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const RAZORPAY_KEY_ID = 'rzp_test_TPHEppbyiA2Nyq';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.getElementById('razorpay-checkout-script');
    if (existing) {
      existing.onload = () => resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PremiumModal({ isOpen, onClose, currentUser, onUpgradeSuccess, onOpenAuthModal, showToast }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('1 Month');

  const plans = [
    { name: '1 Month',   price: 1000, duration: '/ mo',    months: 1 },
    { name: '3 Months',  price: 2800, duration: '/ 3 mo',  months: 3 },
    { name: '6 Months',  price: 5300, duration: '/ 6 mo',  months: 6 },
    { name: '12 Months', price: 9990, duration: '/ yr',    months: 12 }
  ];

  if (!isOpen) return null;

  const selectedPlanData = plans.find(p => p.name === selectedPlan) || plans[0];

  const handleUpgrade = async () => {
    if (!currentUser) {
      onOpenAuthModal && onOpenAuthModal('login');
      return;
    }

    setLoading(true);

    try {
      const order = await api.createPaymentOrder({ planType: selectedPlan });
      if (!order?.id) {
        throw new Error(order?.error || 'Could not create payment order. Make sure you are logged in.');
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Could not load Razorpay payment gateway. Please check your internet connection.');
      }

      const options = {
        key: order.key_id || RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'TeamUP',
        description: `${selectedPlan} Premium Subscription`,
        order_id: order.id,
        prefill: {
          name: currentUser.username || currentUser.epicTag || '',
          email: currentUser.email || ''
        },
        theme: {
          color: '#a855f7'
        },
        handler: async function (response) {
          try {
            setLoading(true);
            const verification = await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planType: selectedPlan,
              amountPaid: selectedPlanData.price
            });

            if (verification.success) {
              showToast(`🎉 Welcome to Premium! (${selectedPlan})`, 'success');
              onUpgradeSuccess && onUpgradeSuccess();
              onClose();
            } else {
              showToast(verification.error || 'Payment verification failed.', 'warning');
            }
          } catch (err) {
            showToast(err.message || 'Payment verification error', 'warning');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            showToast('Payment window closed', 'info');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        showToast(`Payment failed: ${response.error?.description || 'Transaction declined'}`, 'warning');
        setLoading(false);
      });
      rzp.open();

    } catch (err) {
      console.error('Payment error:', err);
      showToast(err.message || 'Payment failed. Please try again.', 'warning');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box premium-modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3 className="modal-title" style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Crown size={18} style={{ fill: '#fbbf24' }} /> Upgrade to TeamUP Premium
          </h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body premium-body">
          
          {!currentUser ? (
            <div style={{
              background: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <AlertCircle size={20} style={{ color: '#eab308', flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <strong>Login Required:</strong> You must create or log into your TeamUP account before activating Premium.
              </div>
            </div>
          ) : currentUser.isPremium ? (
            <div style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <Crown size={20} style={{ color: '#22c55e', fill: '#22c55e', flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <strong>Active VIP Membership:</strong> You currently have active Premium. You can extend or renew your plan below.
              </div>
            </div>
          ) : null}

          <div className="premium-hero">
            <Sparkles size={44} style={{ color: '#fbbf24', marginBottom: '0.35rem' }} />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.4rem' }}>
              Unlimited Fortnite Teammate Matching
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '380px', margin: '0 auto' }}>
              Free tier accounts can only post once every 7 days. Premium members bypass limits and get priority matching.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', margin: '1.25rem 0' }}>
            {plans.map(plan => (
              <div
                key={plan.name}
                onClick={() => setSelectedPlan(plan.name)}
                style={{
                  border: `2px solid ${selectedPlan === plan.name ? '#fbbf24' : 'var(--border-color)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  background: selectedPlan === plan.name ? 'rgba(251, 191, 36, 0.12)' : 'var(--bg-surface)',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {plan.name === '12 Months' && (
                  <div style={{
                    position: 'absolute', top: '-9px', left: '50%', transform: 'translateX(-50%)',
                    background: '#fbbf24', color: '#000', fontSize: '0.62rem', fontWeight: 900,
                    padding: '0.1rem 0.5rem', borderRadius: '999px', whiteSpace: 'nowrap'
                  }}>BEST VALUE</div>
                )}
                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{plan.name}</div>
                <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '1.15rem', marginTop: '0.2rem' }}>₹{plan.price}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{plan.duration}</div>
              </div>
            ))}
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.85rem' }}>
              <Check size={15} style={{ color: '#10b981', flexShrink: 0 }} /> Unlimited Teammate Broadcasts (No 7-day wait)
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.85rem' }}>
              <Check size={15} style={{ color: '#10b981', flexShrink: 0 }} /> Top Priority Placement in Feed &amp; Matchmaking
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', fontSize: '0.85rem' }}>
              <Shield size={15} style={{ color: '#10b981', flexShrink: 0 }} /> Verified Golden 👑 VIP Badge on all your posts
            </li>
          </ul>

          <div style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Selected Plan</span>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#fbbf24', fontFamily: 'var(--font-heading)' }}>
              ₹{selectedPlanData.price}
            </div>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>{selectedPlanData.duration} · Secure Razorpay Checkout</span>
          </div>
        </div>

        <div className="modal-footer premium-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          
          {!currentUser ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
              style={{ minWidth: '180px' }}
            >
              <LogIn size={16} /> Log In to Purchase
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpgrade}
              disabled={loading}
              style={{
                background: loading ? 'var(--bg-input)' : '#fbbf24',
                color: '#000',
                fontWeight: 800,
                minWidth: '180px'
              }}
            >
              {loading ? 'Opening Gateway...' : <><Zap size={16} /> Pay ₹{selectedPlanData.price}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
