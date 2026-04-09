const feedbackModel = require('../models/feedbackModel');

const submitFeedback = async (req, res) => {
  try {
    const content = String(req.body?.content || '').trim();
    if (!content) {
      return res.status(400).json({ message: 'Feedback content is required.' });
    }
    if (content.length > 1000) {
      return res.status(400).json({ message: 'Feedback must be 1000 characters or fewer.' });
    }

    const feedback = await feedbackModel.createFeedback(req.dbUser.id, content);
    return res.status(201).json({ message: 'Thank you for your feedback!', feedback });
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return res.status(500).json({ message: 'Failed to submit feedback.' });
  }
};

const getAllFeedback = async (req, res) => {
  try {
    const feedbackList = await feedbackModel.getAllFeedback();
    return res.json({ feedback: feedbackList });
  } catch (error) {
    console.error('Failed to fetch feedback:', error);
    return res.status(500).json({ message: 'Failed to fetch feedback.' });
  }
};

const deleteFeedback = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deleted = await feedbackModel.deleteFeedbackById(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Feedback not found.' });
    }
    return res.json({ message: 'Feedback deleted.' });
  } catch (error) {
    console.error('Failed to delete feedback:', error);
    return res.status(500).json({ message: 'Failed to delete feedback.' });
  }
};

module.exports = { submitFeedback, getAllFeedback, deleteFeedback };
