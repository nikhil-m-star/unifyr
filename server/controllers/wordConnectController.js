const wordConnectModel = require('../models/wordConnectModel');
const chatModel = require('../models/chatModel');
const notificationService = require('../services/notificationService');
const userModel = require('../models/userModel');

const submitProfile = async (req, res) => {
  try {
    const userId = req.dbUser?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { answers } = req.body;
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: 'Answers object is required.' });
    }

    // Validate all 6 questions are answered
    for (let i = 1; i <= wordConnectModel.TOTAL_QUESTIONS; i++) {
      if (!answers[`q${i}`]) {
        return res.status(400).json({ message: `Question ${i} is unanswered.` });
      }
    }

    // Save profile (resets match state to 'searching')
    await wordConnectModel.upsertProfile(userId, answers);

    // Attempt to find a match
    const match = await wordConnectModel.findBestMatch(userId);

    if (match) {
      // Set both to pending
      await wordConnectModel.setMatchPending(userId, match.userId);

      // Notify the matched user via socket
      notificationService.notifyWordConnectMatch(
        match.userId,
        req.dbUser.name,
        req.dbUser.profile_pic,
        match.sharedCount
      );

      return res.status(200).json({
        status: 'pending',
        match: {
          userId: match.userId,
          name: match.name,
          profile_pic: match.profile_pic,
          role: match.role,
          sharedCount: match.sharedCount,
          score: match.score,
          isFallbackRandom: match.isFallbackRandom || false,
        },
      });
    }

    return res.status(200).json({ status: 'searching' });
  } catch (error) {
    console.error('[WordConnect] Submit error:', error);
    return res.status(500).json({ message: 'Failed to submit profile.' });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.dbUser?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const profile = await wordConnectModel.getProfileByUserId(userId);
    if (!profile) {
      return res.status(200).json({ profile: null });
    }

    return res.status(200).json({
      profile: {
        answers: profile.answers,
        matchStatus: profile.match_status,
        matchedWith: profile.matched_with,
        matchedName: profile.matched_name,
        matchedProfilePic: profile.matched_profile_pic,
        matchedRole: profile.matched_role,
        updatedAt: profile.updated_at,
        score: profile.score,
        isFallbackRandom: profile.isFallbackRandom
      },
    });
  } catch (error) {
    console.error('[WordConnect] Get profile error:', error);
    return res.status(500).json({ message: 'Failed to fetch profile.' });
  }
};

const respondToMatch = async (req, res) => {
  try {
    const userId = req.dbUser?.id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { action } = req.body;
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'Action must be "accept" or "decline".' });
    }

    const profile = await wordConnectModel.getProfileByUserId(userId);
    if (!profile || profile.match_status !== 'pending') {
      return res.status(400).json({ message: 'No pending match to respond to.' });
    }

    if (action === 'decline') {
      const result = await wordConnectModel.declineMatch(userId);
      if (result) {
        // Notify the other user that the match was declined
        notificationService.notifyWordConnectDeclined(result.otherUserId, req.dbUser.name);
      }
      return res.status(200).json({ status: 'declined' });
    }

    // action === 'accept'
    const accepted = await wordConnectModel.acceptMatch(userId);
    if (!accepted) {
      return res.status(400).json({ message: 'Failed to accept match.' });
    }

    const matchedUserId = accepted.matched_with;

    // Create or reuse chat session
    let session = await chatModel.getChatSessionByUsers(userId, matchedUserId);
    if (!session) {
      session = await chatModel.createChatSession(userId, matchedUserId, 'Word Connect');
    }

    // Also accept the other user's profile
    await wordConnectModel.acceptMatch(matchedUserId);

    // Get partner info
    const partner = await userModel.getPublicUserById(matchedUserId);

    // Notify the matched user that the match was accepted
    notificationService.notifyWordConnectAccepted(
      matchedUserId,
      req.dbUser.name,
      session.id
    );

    return res.status(200).json({
      status: 'matched',
      sessionId: session.id,
      partner: {
        id: partner?.id,
        name: partner?.name,
        profile_pic: partner?.profile_pic,
        role: partner?.role,
      },
    });
  } catch (error) {
    console.error('[WordConnect] Respond error:', error);
    return res.status(500).json({ message: 'Failed to respond to match.' });
  }
};

module.exports = { submitProfile, getProfile, respondToMatch };
