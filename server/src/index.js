const startServer = require('./server');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

startServer(PORT).then(() => {
    logger.info('Server', `Recue Server running on port ${PORT}`);
}).catch(err => {
    logger.error('Server', 'Failed to start server:', err);
    process.exit(1);
});
