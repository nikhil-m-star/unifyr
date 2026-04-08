const UTSAV_EVENTS_API = 'https://backend.utsavbmsce.in/registrations/events';
const UTSAV_EVENT_BASE_URL = 'https://events.utsavbmsce.in/events';
const FALLBACK_POSTER = 'https://events.utsavbmsce.in/ut-2026.svg';

const buildEventUrl = (eventId) => {
  if (!eventId) {
    return UTSAV_EVENT_BASE_URL;
  }

  return `${UTSAV_EVENT_BASE_URL}/${encodeURIComponent(eventId)}`;
};

const normalizeEvent = (event, index) => ({
  id: event.id || event._id || event.eventId || `utsav-${index}`,
  eventId: event.eventId || null,
  title: event.name || 'Untitled Event',
  category: event.category || 'General',
  description: event.description || 'More details are available on the official Utsav portal.',
  date: event.date || '',
  venue: event.venue || 'BMSCE Campus',
  registration_url: buildEventUrl(event.eventId),
  image_url: event.posterLink || FALLBACK_POSTER,
  registration_open: !(event.stopAllReg || event.stopWebsiteReg),
});

const fetchUtsavEvents = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(UTSAV_EVENTS_API, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Unifyr-UtsavSync/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Utsav API responded with status ${response.status}`);
    }

    const payload = await response.json();
    const rawEvents = Array.isArray(payload) ? payload : payload.events;

    if (!Array.isArray(rawEvents)) {
      throw new Error('Unexpected Utsav API payload shape');
    }

    return rawEvents.map(normalizeEvent);
  } finally {
    clearTimeout(timeoutId);
  }
};

module.exports = { fetchUtsavEvents };
