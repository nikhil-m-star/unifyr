import React, { useEffect, useMemo, useState } from 'react';
import axios from '../api/axios';

const AdminView = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    category: '',
    eventDate: '',
    imageUrl: '',
    description: '',
  });

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const meResponse = await axios.get('/users/me');
      const adminState = Boolean(meResponse.data?.isAdmin);
      setIsAdmin(adminState);

      if (!adminState) {
        setLoading(false);
        return;
      }

      const overviewResponse = await axios.get('/admin/overview');
      setUsers(Array.isArray(overviewResponse.data?.users) ? overviewResponse.data.users : []);
      setTeams(Array.isArray(overviewResponse.data?.teams) ? overviewResponse.data.teams : []);
      setEvents(Array.isArray(overviewResponse.data?.events) ? overviewResponse.data.events : []);
    } catch (error) {
      console.error('Failed to load admin overview:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const stats = useMemo(
    () => ({
      users: users.length,
      teams: teams.length,
      events: events.length,
    }),
    [users, teams, events]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        if (!normalizedQuery) return true;
        return [user.name, user.email, user.role].some((value) =>
          (value || '').toLowerCase().includes(normalizedQuery)
        );
      }),
    [users, normalizedQuery]
  );

  const filteredTeams = useMemo(
    () =>
      teams.filter((team) => {
        if (!normalizedQuery) return true;
        return [team.team_name, team.event_name, team.description, team.status].some((value) =>
          (value || '').toLowerCase().includes(normalizedQuery)
        );
      }),
    [teams, normalizedQuery]
  );

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        if (!normalizedQuery) return true;
        return [event.title, event.category, event.description].some((value) =>
          (value || '').toLowerCase().includes(normalizedQuery)
        );
      }),
    [events, normalizedQuery]
  );

  const usersByRole = useMemo(
    () => ({
      admins: users.filter((user) => user.role === 'admin').length,
      students: users.filter((user) => user.role !== 'admin').length,
    }),
    [users]
  );

  const teamsByStatus = useMemo(
    () => ({
      open: teams.filter((team) => (team.status || 'open') === 'open').length,
      closed: teams.filter((team) => (team.status || 'open') === 'closed').length,
    }),
    [teams]
  );

  const eventsByCategory = useMemo(() => {
    const bucket = {};
    events.forEach((event) => {
      const key = event.category || 'General';
      bucket[key] = (bucket[key] || 0) + 1;
    });
    return Object.entries(bucket).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [events]);

  const updateUserRole = async (id, role) => {
    try {
      await axios.patch(`/admin/users/${id}/role`, { role });
      setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, role } : user)));
    } catch (error) {
      console.error('Failed to update user role:', error);
      window.alert('Failed to update user role.');
    }
  };

  const updateTeam = async (team) => {
    try {
      await axios.patch(`/admin/teams/${team.id}`, {
        eventName: team.event_name || '',
        teamName: team.team_name || '',
        description: team.description || '',
        lookingFor: team.looking_for || '',
        status: team.status || 'open',
      });
      window.alert('Team updated.');
    } catch (error) {
      console.error('Failed to update team:', error);
      window.alert('Failed to update team.');
    }
  };

  const deleteTeam = async (id) => {
    if (!window.confirm('Delete this team request?')) return;
    try {
      await axios.delete(`/admin/teams/${id}`);
      setTeams((prev) => prev.filter((team) => team.id !== id));
    } catch (error) {
      console.error('Failed to delete team:', error);
      window.alert('Failed to delete team.');
    }
  };

  const updateEvent = async (event) => {
    try {
      await axios.patch(`/admin/events/${event.id}`, {
        title: event.title || '',
        category: event.category || '',
        imageUrl: event.image_url || '',
        description: event.description || '',
        eventDate: event.event_date ? new Date(event.event_date).toISOString() : null,
      });
      window.alert('Event updated.');
    } catch (error) {
      console.error('Failed to update event:', error);
      window.alert('Failed to update event.');
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await axios.delete(`/admin/events/${id}`);
      setEvents((prev) => prev.filter((event) => event.id !== id));
    } catch (error) {
      console.error('Failed to delete event:', error);
      window.alert('Failed to delete event.');
    }
  };

  const createEvent = async () => {
    if (!newEvent.title.trim()) {
      window.alert('Event title is required.');
      return;
    }

    try {
      const response = await axios.post('/admin/events', {
        title: newEvent.title.trim(),
        category: newEvent.category.trim(),
        imageUrl: newEvent.imageUrl.trim(),
        description: newEvent.description.trim(),
        eventDate: newEvent.eventDate ? new Date(newEvent.eventDate).toISOString() : null,
      });

      const created = response.data?.event;
      if (created) {
        setEvents((prev) => [created, ...prev]);
      }
      setNewEvent({ title: '', category: '', eventDate: '', imageUrl: '', description: '' });
      setActiveTab('events');
    } catch (error) {
      console.error('Failed to create event:', error);
      window.alert('Failed to create event.');
    }
  };

  if (loading) {
    return (
      <div className="market-shell">
        <div className="messages-loading">
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="market-shell">
        <div className="empty-state">
          <h3>Admin Access Required</h3>
          <p>This page is only visible to admin users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="market-shell admin-shell">
      <section className="feed-section top-section admin-header">
        <div className="section-head section-head--top admin-header__title">
          <span className="section-kicker">Admin Console</span>
          <button type="button" className="btn-secondary" onClick={fetchOverview}>
            Refresh
          </button>
        </div>

        <div className="admin-stats">
          <div className="surface-card admin-stat-card">
            <strong>{stats.users}</strong>
            <p>Total Users</p>
          </div>
          <div className="surface-card admin-stat-card">
            <strong>{stats.teams}</strong>
            <p>Team Requests</p>
          </div>
          <div className="surface-card admin-stat-card">
            <strong>{stats.events}</strong>
            <p>Featured Events</p>
          </div>
        </div>

        <div className="admin-controls">
          <div className="events-filter-bar hide-scrollbar" style={{ marginBottom: 0 }}>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'users', label: 'Users' },
              { id: 'teams', label: 'Teams' },
              { id: 'events', label: 'Events' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`events-filter-pill ${activeTab === tab.id ? 'events-filter-pill--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            className="app-input"
            placeholder="Search current tab..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </section>

      {activeTab === 'overview' && (
        <>
          <section className="feed-section">
            <div className="section-head">
              <span className="section-kicker">User Breakdown</span>
            </div>
            <div className="admin-summary-grid">
              <div className="surface-card admin-summary-card">
                <strong>{usersByRole.admins}</strong>
                <p>Admins</p>
              </div>
              <div className="surface-card admin-summary-card">
                <strong>{usersByRole.students}</strong>
                <p>Students</p>
              </div>
            </div>
          </section>

          <section className="feed-section">
            <div className="section-head">
              <span className="section-kicker">Team Status</span>
            </div>
            <div className="admin-summary-grid">
              <div className="surface-card admin-summary-card">
                <strong>{teamsByStatus.open}</strong>
                <p>Open Requests</p>
              </div>
              <div className="surface-card admin-summary-card">
                <strong>{teamsByStatus.closed}</strong>
                <p>Closed Requests</p>
              </div>
            </div>
          </section>

          <section className="feed-section">
            <div className="section-head">
              <span className="section-kicker">Top Event Categories</span>
            </div>
            <div className="admin-category-list">
              {eventsByCategory.length === 0 && <div className="surface-card">No categories yet.</div>}
              {eventsByCategory.map(([name, count]) => (
                <div key={name} className="surface-card admin-category-item">
                  <span>{name}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === 'users' && (
        <section className="feed-section">
          <div className="section-head">
            <span className="section-kicker">Users</span>
          </div>
          <div className="event-groups">
            {filteredUsers.map((user) => (
              <div key={user.id} className="surface-card admin-edit-card">
                <div className="admin-row">
                  <div>
                    <div className="admin-primary-text">{user.name}</div>
                    <div className="admin-secondary-text">{user.email}</div>
                  </div>
                  <select
                    className="app-input admin-select"
                    value={user.role}
                    onChange={(event) => updateUserRole(user.id, event.target.value)}
                  >
                    <option value="student">student</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && <div className="empty-state">No users match your search.</div>}
          </div>
        </section>
      )}

      {activeTab === 'teams' && (
        <section className="feed-section">
          <div className="section-head">
            <span className="section-kicker">Team Requests</span>
          </div>
          <div className="event-groups">
            {filteredTeams.map((team) => (
              <div key={team.id} className="surface-card admin-edit-card">
                <input
                  className="app-input"
                  value={team.team_name || ''}
                  onChange={(event) =>
                    setTeams((prev) => prev.map((row) => (row.id === team.id ? { ...row, team_name: event.target.value } : row)))
                  }
                  placeholder="Team name"
                />
                <input
                  className="app-input"
                  value={team.event_name || ''}
                  onChange={(event) =>
                    setTeams((prev) => prev.map((row) => (row.id === team.id ? { ...row, event_name: event.target.value } : row)))
                  }
                  placeholder="Event name"
                />
                <textarea
                  className="app-input"
                  value={team.description || ''}
                  onChange={(event) =>
                    setTeams((prev) => prev.map((row) => (row.id === team.id ? { ...row, description: event.target.value } : row)))
                  }
                  placeholder="Description"
                  rows={3}
                />
                <div className="admin-actions">
                  <button type="button" className="btn-secondary" onClick={() => updateTeam(team)}>
                    Save
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => deleteTeam(team.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {filteredTeams.length === 0 && <div className="empty-state">No team requests match your search.</div>}
          </div>
        </section>
      )}

      {activeTab === 'events' && (
        <section className="feed-section">
          <div className="section-head">
            <span className="section-kicker">Featured Events</span>
          </div>

          <div className="surface-card admin-edit-card admin-create-card">
            <input className="app-input" value={newEvent.title} onChange={(event) => setNewEvent((prev) => ({ ...prev, title: event.target.value }))} placeholder="Event title" />
            <input className="app-input" value={newEvent.category} onChange={(event) => setNewEvent((prev) => ({ ...prev, category: event.target.value }))} placeholder="Category" />
            <input className="app-input" value={newEvent.imageUrl} onChange={(event) => setNewEvent((prev) => ({ ...prev, imageUrl: event.target.value }))} placeholder="Image URL" />
            <input type="datetime-local" className="app-input" value={newEvent.eventDate} onChange={(event) => setNewEvent((prev) => ({ ...prev, eventDate: event.target.value }))} />
            <textarea className="app-input" rows={3} value={newEvent.description} onChange={(event) => setNewEvent((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" />
            <button type="button" className="btn-primary" onClick={createEvent}>
              Create Event
            </button>
          </div>

          <div className="event-groups">
            {filteredEvents.map((event) => (
              <div key={event.id} className="surface-card admin-edit-card">
                <input
                  className="app-input"
                  value={event.title || ''}
                  onChange={(targetEvent) => setEvents((prev) => prev.map((row) => (row.id === event.id ? { ...row, title: targetEvent.target.value } : row)))}
                  placeholder="Title"
                />
                <input
                  className="app-input"
                  value={event.category || ''}
                  onChange={(targetEvent) => setEvents((prev) => prev.map((row) => (row.id === event.id ? { ...row, category: targetEvent.target.value } : row)))}
                  placeholder="Category"
                />
                <input
                  className="app-input"
                  value={event.image_url || ''}
                  onChange={(targetEvent) => setEvents((prev) => prev.map((row) => (row.id === event.id ? { ...row, image_url: targetEvent.target.value } : row)))}
                  placeholder="Image URL"
                />
                <textarea
                  className="app-input"
                  rows={3}
                  value={event.description || ''}
                  onChange={(targetEvent) => setEvents((prev) => prev.map((row) => (row.id === event.id ? { ...row, description: targetEvent.target.value } : row)))}
                  placeholder="Description"
                />
                <div className="admin-actions">
                  <button type="button" className="btn-secondary" onClick={() => updateEvent(event)}>
                    Save
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => deleteEvent(event.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {filteredEvents.length === 0 && <div className="empty-state">No events match your search.</div>}
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminView;
