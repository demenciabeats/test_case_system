/// server.js
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const userRoleRoutes = require('./routes/userRoleRoutes');
const rolePermissionRoutes = require('./routes/rolePermissionRoutes');
const keywordRoutes = require('./routes/keywordRoutes');
const criticityRoutes = require('./routes/criticityRoutes');
const buildRoutes = require('./routes/buildRoutes');
const requirementRoutes = require('./routes/requirementRoutes');
const celulaRoutes = require('./routes/celulaRoutes');
const app = express();

connectDB();
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/user_roles', userRoleRoutes);
app.use('/api/role_permissions', rolePermissionRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/criticities', criticityRoutes);
app.use('/api/builds', buildRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/celulas', celulaRoutes);


app.listen(process.env.PORT, () => {
    console.log(`Servidor corriendo en el puerto ${process.env.PORT}`);
});
