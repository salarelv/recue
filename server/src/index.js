const startServer = require('./server');

const PORT = process.env.PORT || 3000;

startServer(PORT).then(() => {
    console.log(`Recue Server running on port ${PORT}`);
}).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
