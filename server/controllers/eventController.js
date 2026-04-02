const eventModel = require('../models/eventModel');

const createEvent = async (req, res) => {
  try {
    const { title, description, imageUrl, category, eventDate } = req.body;
    const newEvent = await eventModel.createEvent(title, description, imageUrl, category, eventDate);
    res.status(201).json({ message: 'Event created successfully', event: newEvent });
  } catch (error) {
    console.error('Create Event Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getEvents = async (req, res) => {
  try {
    const events = await eventModel.getAllEvents();
    res.status(200).json(events);
  } catch (error) {
    console.error('Get Events Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEvent = await eventModel.deleteEvent(id);
    if (!deletedEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(200).json({ message: 'Event deleted successfully', event: deletedEvent });
  } catch (error) {
    console.error('Delete Event Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  createEvent,
  getEvents,
  deleteEvent
};
