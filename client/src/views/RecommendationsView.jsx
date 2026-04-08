import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Sparkles, Loader2, MapPin, Calendar, ArrowUpRight } from 'lucide-react';
import axios from '../api/axios';
import useIsMobile from '../hooks/useIsMobile';

const RecommendationsView = () => {
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

  return (
    <div className="market-shell">
      <div className="messages-header">
        <h1 className="page-title">AI Recommendations</h1>
        <p className="messages-subtitle">Describe what you want. We will shortlist the best active events.</p>
      </div>

      <div className="ai-reco-card">
        <div className="ai-reco-kicker"><Brain size={15} /> Preference Input</div>
        <form
          className="form-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError('');
            setSubmittedPrompt(prompt);
            try {
              const response = await axios.post('/ai/recommend-events', { prompt });
              setRecommendations(Array.isArray(response.data?.recommendations) ? response.data.recommendations : []);
            } catch (apiError) {
              console.error('Failed to get AI recommendations:', apiError);
              setRecommendations([]);
              setError(apiError?.response?.data?.message || 'Failed to fetch AI recommendations.');
            } finally {
              setLoading(false);
            }
          }}
        >
          <textarea
            className="glass-input"
            rows={isMobile ? 4 : 3}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: I want an AI/ML event with hands-on building, beginner-friendly, and open registrations this week."
            style={{ resize: 'vertical', minHeight: '120px' }}
          />
          <button type="submit" className="btn-primary" disabled={!prompt.trim()}>
            <Sparkles size={16} /> Find Matches
          </button>
        </form>
      </div>

      {submittedPrompt && (
        <div className="ai-results">
          <div className="ai-results__head">
            <p className="ai-results__query">Results for: {submittedPrompt}</p>
          </div>

          {loading ? (
            <div className="messages-loading" style={{ height: '220px' }}>
              <Loader2 className="animate-spin" size={26} color="var(--accent-primary)" />
              <p>Thinking through your prompt...</p>
            </div>
          ) : error ? (
            <div className="empty-state">{error}</div>
          ) : recommendations.length > 0 ? (
            recommendations.map((event) => (
              <a
                key={event.id}
                href={event.registration_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ai-result-item"
              >
                <div className="ai-result-item__head">
                  <div className="ai-result-item__title">{event.title}</div>
                  <span className="ai-result-item__score">{Math.round((event.ai_score || 0) * 100)}%</span>
                </div>
                <div className="ai-result-item__meta">
                  <span><Calendar size={13} /> {event.date || 'TBA'}</span>
                  <span><MapPin size={13} /> {event.venue || 'BMSCE Campus'}</span>
                  <span>{event.category || 'General'}</span>
                </div>
                {event.ai_reason && (
                  <p className="ai-result-item__reason">{event.ai_reason}</p>
                )}
                <div className="ai-result-item__cta">Open <ArrowUpRight size={14} /></div>
              </a>
            ))
          ) : (
            <div className="empty-state">
              No close matches yet. Try adding keywords like `AI`, `gaming`, `workshop`, `beginner`, `open registration`.
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '1rem' }}>
        <Link to="/events/active" className="btn-ghost">Browse All Active Events</Link>
      </div>
    </div>
  );
};

export default RecommendationsView;
