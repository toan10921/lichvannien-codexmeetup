const planningService = require('../services/planningService');

async function getTimeline(req, res, next) {
  try {
    const data = await planningService.listPlanningTimeline(req.user.id);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function createPlanningItem(req, res, next) {
  try {
    const item = await planningService.createPlanningItem(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Planning item created successfully',
      data: { item },
    });
  } catch (error) {
    next(error);
  }
}

async function suggestPlanningItem(req, res, next) {
  try {
    const data = await planningService.generateSuggestions(req.user.id, Number(req.params.id));
    res.json({
      success: true,
      message: 'Suggestions generated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function confirmPlanningItem(req, res, next) {
  try {
    const data = await planningService.confirmSuggestion(req.user.id, Number(req.params.id), req.body);
    res.json({
      success: true,
      message: 'Planning item scheduled successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function deletePlanningItem(req, res, next) {
  try {
    await planningService.deletePlanningItem(req.user.id, Number(req.params.id));
    res.json({
      success: true,
      message: 'Planning item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  confirmPlanningItem,
  createPlanningItem,
  deletePlanningItem,
  getTimeline,
  suggestPlanningItem,
};
