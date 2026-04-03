/**
 * Groups teams by event name with fuzzy matching.
 * Normalizes event names to handle slight spelling differences.
 */

// Normalize: lowercase, strip non-alphanumeric, collapse spaces
const normalize = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // remove special chars
    .replace(/\s+/g, '')           // collapse all whitespace
    .trim();
};

// Simple similarity ratio (longest common subsequence based)
const similarity = (a, b) => {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const longer = a.length >= b.length ? a : b;
  const shorter = a.length < b.length ? a : b;

  // If one contains the other, high similarity
  if (longer.includes(shorter)) return shorter.length / longer.length;

  // Character overlap ratio
  let matches = 0;
  const longerChars = [...longer];
  const used = new Set();
  
  for (const ch of shorter) {
    const idx = longerChars.findIndex((c, i) => c === ch && !used.has(i));
    if (idx !== -1) {
      matches++;
      used.add(idx);
    }
  }

  return (matches * 2) / (longer.length + shorter.length);
};

/**
 * Groups teams by fuzzy-matched event name.
 * Returns: [{ eventName: string, teams: Team[] }]
 */
export const groupTeamsByEvent = (teams) => {
  const groups = [];
  const keyMap = new Map(); // normalized key -> group index

  for (const team of teams) {
    const rawEvent = team.event_name || team.eventName || 'Uncategorized';
    const norm = normalize(rawEvent);

    // Try to find an existing group with similar normalized name
    let matchedKey = null;
    for (const [existingKey] of keyMap) {
      // Exact normalized match
      if (existingKey === norm) {
        matchedKey = existingKey;
        break;
      }
      // Fuzzy match: similarity > 0.8
      if (similarity(existingKey, norm) > 0.8) {
        matchedKey = existingKey;
        break;
      }
    }

    if (matchedKey !== null) {
      const groupIdx = keyMap.get(matchedKey);
      groups[groupIdx].teams.push(team);
    } else {
      // Create new group — use the original (un-normalized) name for display
      keyMap.set(norm, groups.length);
      groups.push({ eventName: rawEvent, teams: [team] });
    }
  }

  // Sort groups: most teams first
  groups.sort((a, b) => b.teams.length - a.teams.length);

  return groups;
};
