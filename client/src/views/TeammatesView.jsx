import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SignedIn } from '@clerk/clerk-react';
import { Search, Loader2, Users } from 'lucide-react';
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
        initial={isMobile ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="messages-header"
      >
        <div className="teammates-header-row">
          <div>
            <span className="section-kicker">Collaboration</span>
            <h1 className="page-title">Find Your Team</h1>
            <p className="messages-subtitle" style={{ maxWidth: '520px' }}>
              Discover active projects and pitch your skills to hunters looking for teammates.
            </p>
          </div>
          <SignedIn>
            <button 
              className="btn-primary" 
              onClick={() => setIsModalOpen(true)}
              style={{ padding: '12px 24px', fontSize: '0.92rem', flexShrink: 0 }}
            >
              Post Recruitment
            </button>
          </SignedIn>
        </div>
      </motion.div>

      <div className="teammates-filters">
        <div className="teammates-search-wrap">
          <Search size={16} className="teammates-search-icon" />
          <input
            type="text"
            className="glass-input"
            placeholder="Search teams, events, or tech..."
            style={{ paddingLeft: '44px', width: '100%', height: '48px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="teammates-filter-pills">
          <button 
            className={`filter-pill ${filter === 'all' ? 'filter-pill--active' : ''}`} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-pill ${filter === 'open' ? 'filter-pill--active' : ''}`} 
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
            className="messages-loading"
            style={{ height: '40vh' }}
          >
            <Loader2 className="animate-spin" size={28} color="var(--accent-primary)" />
            <p>Gathering active recruitment posts...</p>
          </motion.div>
        ) : filteredTeams.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="teammates-grid"
          >
            {filteredTeams.map((team, index) => (
              <motion.div
                key={team.id}
                initial={isMobile ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <TeamPost team={team} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="messages-empty"
          >
            <div className="messages-empty__icon">
              <Users size={28} />
            </div>
            <h2>No Matches Found</h2>
            <p>We couldn't find any teammate posts matching your current filters.</p>
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
