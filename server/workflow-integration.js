// Import the workflow routes
const setupWorkflowRoutes = require('./workflow-routes');

// Add this line in the server initialization section after your existing routes
// This should go before the app.listen call
setupWorkflowRoutes(app, db);