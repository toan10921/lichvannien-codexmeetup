const eventService = require('../services/eventService');

async function listEvents(req, res, next) {
  try {
    const data = await eventService.listEventsByMonth(req.user.id, req.query.month);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function createEvent(req, res, next) {
  try {
    const event = await eventService.createEvent(req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: { event },
    });
  } catch (error) {
    next(error);
  }
}

async function updateEvent(req, res, next) {
  try {
    const event = await eventService.updateEvent(req.user.id, Number(req.params.id), req.body);

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: { event },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteEvent(req, res, next) {
  try {
    await eventService.deleteEvent(req.user.id, Number(req.params.id));

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createEvent,
  deleteEvent,
  listEvents,
  updateEvent,
};
