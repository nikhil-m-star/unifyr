import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Search, Filter, Loader2, Users } from 'lucide-react';
import axios from '../api/axios';
import TeamPost from '../components/common/TeamPost';
import CreateTeamModal from '../components/common/CreateTeamModal';
import useIsMobile from '../hooks/useIsMobile';

const TeammatesView = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const isMobile = useIsMobile();

  const loadTeams = async () => {
    try {
      const response = await axios.get('/teams');
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to load teammate posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const filteredTeams = teams.filter(team => {
    const matchesSearch = 
      team.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.looking_for?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'open') return matchesSearch && team.status === 'open';
    return matchesSearch;
  });

  return (
    <div className="market-shell">
      <motion.div
        initial={isMobile ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
        style={{ marginBottom: '3rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '2rem' }}>
          <div>
            <span className="section-kicker">Collaboration</span>
            <h1 className="page-title">Find Your Team</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.1rem', maxWidth: '600px' }}>
              Discover active projects and pitch your skills to hunters looking for teammates.
            </p>
          </div>
          <SignedIn>
            <button 
              className="btn-primary" 
              onClick={() => setIsModalOpen(true)}
              style={{ padding: '14px 28px', fontSize: '1rem' }}
            >
              Post Recruitment
            </button>
          </SignedIn>
        </div>
      </motion.div>

      <div style={{ 
        display: 'flex', 
        gap: '1.5rem', 
        marginBottom: '2.5rem', 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="glass-input"
            placeholder="Search teams, events, or tech..."
            style={{ paddingLeft: '48px', width: '100%', height: '52px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
          <button 
            className={`btn-secondary ${filter === 'all' ? 'active' : ''}`} 
            style={{ border: 'none', background: filter === 'all' ? 'rgba(255,255,255,0.1)' : 'transparent', boxShadow: 'none' }}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`btn-secondary ${filter === 'open' ? 'active' : ''}`} 
            style={{ border: 'none', background: filter === 'open' ? 'rgba(255,255,255,0.1)' : 'transparent', boxShadow: 'none' }}
            onClick={() => setFilter('open')}
          >
            Open Only
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: '1rem' }}
          >
            <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" />
            <p style={{ color: 'var(--text-secondary)' }}>Gathering active recruitment posts...</p>
          </motion.div>
        ) : filteredTeams.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="teammates-grid"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))', 
              gap: '1.5rem' 
            }}
          >
            {filteredTeams.map((team, index) => (
              <motion.div
                key={team.id}
                initial={isMobile ? false : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TeamPost team={team} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '6rem 2rem' }}
          >
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              width: '80px', 
              height: '80px', 
              borderRadius: '24px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 2rem',
              color: 'var(--text-muted)',
              border: '1px solid var(--glass-border)'
            }}>
              <Users size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>No Matches Found</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
              We couldn't find any teammate posts matching your current filters.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateTeamModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreated={() => {
          loadTeams();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};

export default TeammatesView;
