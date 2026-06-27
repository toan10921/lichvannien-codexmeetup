const express = require('express');
const authRoutes = require('./authRoutes');
const calendarRoutes = require('./calendarRoutes');
const aiAdvisorRoutes = require('./aiAdvisorRoutes');
const eventRoutes = require('./eventRoutes');
const planningRoutes = require('./planningRoutes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
  });
});

router.use('/auth', authRoutes);
router.use('/calendar', calendarRoutes);
router.use('/events', eventRoutes);
router.use('/planning', planningRoutes);
router.use('/advisor', aiAdvisorRoutes);

module.exports = router;
