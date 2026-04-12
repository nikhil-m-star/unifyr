import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Link2, ChevronRight, Loader2, MessageSquare, RotateCcw, Sparkles, CheckCircle2, X } from 'lucide-react';
import axios from '../api/axios';
import GlassCard from '../components/common/GlassCard';
import useIsMobile from '../hooks/useIsMobile';
import { toast } from 'react-hot-toast';

const QUESTIONS = [
  {
    id: 'q1',
    question: 'Perfect weekend?',
    options: [
      { value: 'chill', label: 'Chill & Reset', desc: 'Movies, games, sleep' },
      { value: 'explore', label: 'Explore the city', desc: 'Cafes & new places' },
      { value: 'party', label: 'Events & Parties', desc: 'High energy & crowds' },
      { value: 'hustle', label: 'Grind & Build', desc: 'Catching up on projects' },
    ],
  },
  {
    id: 'q2',
    question: 'What\'s your vibe?',
    options: [
      { value: 'deeptalks', label: 'Deep Talks', desc: 'Over a cup of coffee' },
      { value: 'hype', label: 'Hype Energy', desc: 'Loud and spontaneous' },
      { value: 'quiet', label: 'Quiet Observer', desc: 'Taking it all in' },
      { value: 'goofy', label: 'Goofy & Fun', desc: 'Always joking around' },
    ],
  },
  {
    id: 'q3',
    question: 'How do you recharge?',
    options: [
      { value: 'alone', label: 'Total Isolation', desc: 'Just me and my music' },
      { value: 'closefriends', label: 'Close Circle', desc: 'Hanging with besties' },
      { value: 'social', label: 'Being Social', desc: 'Meeting new people fuels me' },
      { value: 'hobby', label: 'Creative Outlet', desc: 'Art, sports, or hobbies' },
    ],
  },
  {
    id: 'q4',
    question: 'Energy level?',
    options: [
      { value: 'nightowl', label: 'Night Owl 🦉', desc: 'Peak after midnight' },
      { value: 'earlybird', label: 'Early Bird 🐦', desc: 'Sunrise productivity' },
      { value: 'anytime', label: 'Anytime ⚡', desc: 'Always on' },
      { value: 'caffeine', label: 'Caffeine Powered ☕', desc: 'Need coffee first' },
    ],
  },
  {
    id: 'q5',
    question: 'Looking for?',
    options: [
      { value: 'chats', label: 'Deep Conversations', desc: 'Talk about everything' },
      { value: 'activities', label: 'Activity Buddy', desc: 'Gym, sports, or events' },
      { value: 'teammate', label: 'A Teammate', desc: 'Hackathons & studying' },
      { value: 'newfriends', label: 'New Friends', desc: 'Expand my circle' },
    ],
  },
  {
    id: 'q6',
    question: 'Communication style?',
    options: [
      { value: 'memes', label: 'Memes & Reels', desc: 'Tagging you constantly' },
      { value: 'voicenotes', label: 'Voice Notes', desc: 'Mini podcasts' },
      { value: 'rapidfire', label: 'Rapid-Fire Texts', desc: '10 messages in 5 secs' },
      { value: 'inperson', label: 'In-Person First', desc: 'Better face-to-face' },
    ],
  },
];

const WordConnectView = () => {
  const [phase, setPhase] = useState('loading'); // loading, intro, quiz, submitting, result
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [matchResult, setMatchResult] = useState(null); // { status, match?, sessionId?, partner? }
  const [existingProfile, setExistingProfile] = useState(null);
  const [responding, setResponding] = useState(false);
  const { getToken, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Fetch existing profile on mount
  useEffect(() => {
    if (!isSignedIn) {
      setPhase('intro');
      return;
    }

    let mounted = true;
    const fetchProfile = async () => {
      try {
        const token = await getToken();
        const res = await axios.get('/wordconnect/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;

        const p = res.data?.profile;
        if (p && (p.matchStatus === 'pending' || p.matchStatus === 'matched')) {
          setExistingProfile(p);
          setMatchResult({
            status: p.matchStatus,
            match: p.matchStatus === 'pending' ? {
              name: p.matchedName,
              profile_pic: p.matchedProfilePic,
              role: p.matchedRole,
            } : null,
            partner: p.matchStatus === 'matched' ? {
              name: p.matchedName,
              profile_pic: p.matchedProfilePic,
              role: p.matchedRole,
            } : null,
          });
          setPhase('result');
        } else {
          setPhase('intro');
        }
      } catch {
        if (mounted) setPhase('intro');
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, [isSignedIn, getToken]);

  const selectAnswer = useCallback((questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    // Auto-advance after a brief delay
    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
        setCurrentQ(prev => prev + 1);
      }
    }, 350);
  }, [currentQ]);

  const submitAnswers = async () => {
    if (Object.keys(answers).length < QUESTIONS.length) {
      toast.error('Please answer all questions.');
      return;
    }

    setPhase('submitting');
    try {
      const token = await getToken();
      const res = await axios.post('/wordconnect/submit', { answers }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMatchResult(res.data);
      setPhase('result');
    } catch (err) {
      console.error('[WordConnect] Submit error:', err);
      toast.error(err?.response?.data?.message || 'Failed to submit. Try again.');
      setPhase('quiz');
      setCurrentQ(QUESTIONS.length - 1);
    }
  };

  const respondToMatch = async (action) => {
    setResponding(true);
    try {
      const token = await getToken();
      const res = await axios.post('/wordconnect/respond', { action }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (action === 'accept' && res.data?.sessionId) {
        toast.success('Match accepted!');
        navigate(`/messages/${res.data.sessionId}`, {
          state: { partner: res.data.partner },
        });
      } else if (action === 'decline') {
        toast('You can try again anytime.', { icon: '👋' });
        setMatchResult(null);
        setExistingProfile(null);
        setPhase('intro');
        setAnswers({});
        setCurrentQ(0);
      }
    } catch (err) {
      console.error('[WordConnect] Respond error:', err);
      toast.error(err?.response?.data?.message || 'Something went wrong.');
    } finally {
      setResponding(false);
    }
  };

  const restart = () => {
    setAnswers({});
    setCurrentQ(0);
    setMatchResult(null);
    setExistingProfile(null);
    setPhase('intro');
  };

  const progress = (currentQ + 1) / QUESTIONS.length;
  const allAnswered = Object.keys(answers).length === QUESTIONS.length;
  const q = QUESTIONS[currentQ];

  return (
    <div className="market-shell" style={{ minHeight: 'calc(100vh - 100px)' }}>
      <AnimatePresence mode="wait">
        {/* ─── LOADING ─── */}
        {phase === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
          </motion.div>
        )}

        {/* ─── INTRO ─── */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            style={{ textAlign: 'center', maxWidth: '700px', marginInline: 'auto', paddingTop: isMobile ? '2rem' : '4rem' }}
          >
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'rgba(134, 59, 255, 0.12)', border: '1px solid rgba(134, 59, 255, 0.25)',
                padding: '8px 18px', borderRadius: '14px', fontSize: '0.8rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.1em', color: '#863bff', marginBottom: '2rem',
              }}>
                <Link2 size={14} /> Word Connect
              </div>
            </div>

            <h1 style={{
              fontSize: isMobile ? '2.6rem' : '4.2rem', fontWeight: 900, letterSpacing: '-0.05em',
              lineHeight: 1.05, marginBottom: '1.5rem',
            }}>
              Find Your <span style={{ color: '#863bff' }}>Perfect</span> Match.
            </h1>

            <p style={{
              fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: '500px',
              marginInline: 'auto', marginBottom: '3rem', lineHeight: 1.7, fontWeight: 500,
            }}>
              Answer 6 quick questions. We'll match you with someone who shares your vibe, goals, and energy. No swiping — just real compatibility.
            </p>

            <motion.button
              whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(134, 59, 255, 0.2)' }}
              whileTap={{ scale: 0.96 }}
              type="button"
              className="btn-primary"
              onClick={() => {
                if (!isSignedIn) {
                  toast.error('Please sign in to use Word Connect.');
                  return;
                }
                setPhase('quiz');
              }}
              style={{
                padding: '20px 52px', fontSize: '1.15rem', borderRadius: '24px', fontWeight: 800,
                background: 'linear-gradient(135deg, #863bff 0%, #6320c9 100%)', color: '#fff',
                border: 'none',
              }}
            >
              <Sparkles size={20} style={{ marginRight: '10px' }} /> Start Matching
            </motion.button>

            <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              {[
                { num: '6', label: 'Questions' },
                { num: '30s', label: 'To Complete' },
                { num: '50%+', label: 'Match Threshold' },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>{stat.num}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── QUIZ ─── */}
        {phase === 'quiz' && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ maxWidth: '640px', marginInline: 'auto', paddingTop: isMobile ? '1.5rem' : '3rem' }}
          >
            {/* Progress bar */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <span>Question {currentQ + 1} of {QUESTIONS.length}</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #863bff, #a855f7)', borderRadius: '4px' }}
                />
              </div>
            </div>

            {/* Question card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              >
                <h2 style={{ fontSize: isMobile ? '2rem' : '2.8rem', fontWeight: 900, marginBottom: '2rem', letterSpacing: '-0.04em' }}>
                  {q.question}
                </h2>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {q.options.map(opt => {
                    const isSelected = answers[q.id] === opt.value;
                    return (
                      <motion.button
                        key={opt.value}
                        type="button"
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => selectAnswer(q.id, opt.value)}
                        style={{
                          background: isSelected
                            ? 'linear-gradient(135deg, rgba(134, 59, 255, 0.25) 0%, rgba(134, 59, 255, 0.1) 100%)'
                            : 'rgba(255, 255, 255, 0.04)',
                          border: isSelected
                            ? '2px solid rgba(134, 59, 255, 0.6)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '20px',
                          padding: '20px 24px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: '#fff',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2px' }}>{opt.label}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{opt.desc}</div>
                        </div>
                        {isSelected && <CheckCircle2 size={22} style={{ color: '#863bff', flexShrink: 0 }} />}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', gap: '12px' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => currentQ > 0 ? setCurrentQ(prev => prev - 1) : setPhase('intro')}
                style={{ padding: '14px 24px', borderRadius: '18px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {currentQ > 0 ? 'Back' : 'Cancel'}
              </button>

              {currentQ < QUESTIONS.length - 1 ? (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!answers[q.id]}
                  onClick={() => setCurrentQ(prev => prev + 1)}
                  style={{
                    padding: '14px 28px', borderRadius: '18px', fontWeight: 800,
                    opacity: answers[q.id] ? 1 : 0.4,
                  }}
                >
                  Next <ChevronRight size={16} style={{ marginLeft: '4px' }} />
                </button>
              ) : (
                <motion.button
                  whileHover={allAnswered ? { scale: 1.04 } : {}}
                  whileTap={allAnswered ? { scale: 0.96 } : {}}
                  type="button"
                  className="btn-primary"
                  disabled={!allAnswered}
                  onClick={submitAnswers}
                  style={{
                    padding: '14px 32px', borderRadius: '18px', fontWeight: 800, fontSize: '1.05rem',
                    background: allAnswered ? 'linear-gradient(135deg, #863bff 0%, #6320c9 100%)' : undefined,
                    opacity: allAnswered ? 1 : 0.4,
                  }}
                >
                  <Sparkles size={16} style={{ marginRight: '8px' }} /> Find My Match
                </motion.button>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── SUBMITTING ─── */}
        {phase === 'submitting' && (
          <motion.div
            key="submitting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '500px', textAlign: 'center' }}
          >
            <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '2.5rem' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '3px solid transparent', borderTopColor: '#863bff', borderRightColor: '#a855f7',
                }}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute', inset: '12px', borderRadius: '50%',
                  border: '2px solid transparent', borderBottomColor: '#6320c9',
                }}
              />
              <div style={{
                position: 'absolute', inset: '28px', borderRadius: '50%',
                background: 'rgba(134, 59, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Link2 size={28} style={{ color: '#863bff' }} />
              </div>
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Finding Your Match...</h2>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Comparing vibes across the campus</p>
          </motion.div>
        )}

        {/* ─── RESULT ─── */}
        {phase === 'result' && matchResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            style={{ maxWidth: '520px', marginInline: 'auto', paddingTop: isMobile ? '2rem' : '3rem' }}
          >
            {/* ── MATCH FOUND (pending) ── */}
            {(matchResult.status === 'pending') && (
              <GlassCard style={{ padding: isMobile ? '2.5rem' : '3.5rem', textAlign: 'center', borderRadius: '36px', border: '2px solid rgba(134, 59, 255, 0.3)', boxShadow: '0 40px 100px rgba(134, 59, 255, 0.1)' }}>
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 2rem' }}>
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #863bff 0%, #6320c9 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', padding: '3px', position: 'relative', zIndex: 2,
                  }}>
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#111' }}>
                      {matchResult.match?.profile_pic ? (
                        <img src={matchResult.match.profile_pic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 900, color: '#863bff' }}>
                          {matchResult.match?.name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0, 0.6, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ position: 'absolute', inset: -16, borderRadius: '50%', border: '2px solid rgba(134, 59, 255, 0.4)', zIndex: 1 }}
                  />
                </div>

                {matchResult.match?.isFallbackRandom ? (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '12px',
                    background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)',
                    color: '#ec4899', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase',
                    letterSpacing: '0.1em', marginBottom: '1rem',
                  }}>
                    <Sparkles size={12} /> Serendipity Match
                  </div>
                ) : (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', borderRadius: '12px',
                    background: 'rgba(134, 59, 255, 0.15)', border: '1px solid rgba(134, 59, 255, 0.3)',
                    color: '#863bff', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase',
                    letterSpacing: '0.1em', marginBottom: '1rem',
                  }}>
                    <Link2 size={12} /> {Math.round((matchResult.match?.score ?? existingProfile?.score ?? 0.5) * 100)}% Match
                  </div>
                )}

                <h2 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.04em' }}>
                  {matchResult.match?.name?.split(' ')[0] || existingProfile?.matchedName?.split(' ')[0] || 'Someone'}
                </h2>
                
                {matchResult.match?.isFallbackRandom ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500, marginBottom: '2.5rem', opacity: 0.8 }}>
                    We didn't find anyone completely compatible, but you can connect with this person anyway!
                  </p>
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500, marginBottom: '2.5rem', opacity: 0.8 }}>
                    matched with you via Word Connect
                  </p>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => respondToMatch('decline')}
                    disabled={responding}
                    style={{ flex: 1, padding: '18px', borderRadius: '20px', fontWeight: 700, border: 'none', background: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    Not for me
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => respondToMatch('accept')}
                    disabled={responding}
                    style={{
                      flex: 1, padding: '18px', borderRadius: '20px', fontSize: '1.05rem', fontWeight: 800,
                      background: 'linear-gradient(135deg, #863bff 0%, #6320c9 100%)',
                    }}
                  >
                    {responding ? <Loader2 size={18} className="animate-spin" /> : <><MessageSquare size={18} style={{ marginRight: '8px' }} /> Say Hello</>}
                  </button>
                </div>
              </GlassCard>
            )}

            {/* ── ALREADY MATCHED ── */}
            {matchResult.status === 'matched' && (
              <GlassCard style={{ padding: isMobile ? '2.5rem' : '3.5rem', textAlign: 'center', borderRadius: '36px', border: '2px solid rgba(16, 185, 129, 0.3)' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginBottom: '1.5rem',
                }}>
                  <CheckCircle2 size={12} /> Already Connected
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>
                  You're matched with {existingProfile?.matchedName || 'someone'}!
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontWeight: 500 }}>
                  Check your messages to continue the conversation.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button type="button" className="btn-primary" onClick={() => navigate('/messages')} style={{ padding: '18px', borderRadius: '20px', fontWeight: 800, width: '100%' }}>
                    <MessageSquare size={18} style={{ marginRight: '8px' }} /> Open Messages
                  </button>
                  <button type="button" className="btn-ghost" onClick={restart} style={{ padding: '14px', borderRadius: '18px', fontWeight: 700, border: 'none' }}>
                    <RotateCcw size={14} style={{ marginRight: '6px' }} /> Start Over
                  </button>
                </div>
              </GlassCard>
            )}

            {/* ── NO MATCH ── */}
            {matchResult.status === 'searching' && (
              <div style={{ textAlign: 'center', paddingTop: '2rem' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 2rem' }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      border: '2px dashed rgba(134, 59, 255, 0.3)',
                    }}
                  />
                  <div style={{
                    position: 'absolute', inset: '16px', borderRadius: '50%',
                    background: 'rgba(134, 59, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Link2 size={28} style={{ color: '#863bff', opacity: 0.6 }} />
                  </div>
                </div>

                <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.75rem' }}>No match yet</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginInline: 'auto', marginBottom: '2.5rem', fontWeight: 500, lineHeight: 1.7 }}>
                  We'll notify you when someone compatible joins Word Connect. Your profile stays active in the background.
                </p>

                <button
                  type="button"
                  className="btn-ghost"
                  onClick={restart}
                  style={{ padding: '14px 28px', borderRadius: '18px', fontWeight: 700, border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <RotateCcw size={14} style={{ marginRight: '8px' }} /> Try Again
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>
        {`
          .animate-spin { animation: spin 1.5s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}
      </style>
    </div>
  );
};

export default WordConnectView;
