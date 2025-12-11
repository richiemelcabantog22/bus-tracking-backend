const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSMongoose = require('@adminjs/mongoose');
const mongoose = require('mongoose');

AdminJS.registerAdapter(AdminJSMongoose);

const adminJs = new AdminJS({
  databases: [mongoose],
  rootPath: '/admin',
  branding: {
    companyName: 'TransTrack Admin DashBoard',
  },
  resources: [
    { resource: mongoose.model('Bus') },
    { resource: mongoose.model('Driver') },
    { resource: mongoose.model('Incident') },
    { resource: mongoose.model('User') },
  ],
});

const router = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
  authenticate: async (email, password) => {
    if (email === 'admin' && password === process.env.ADMIN_KEY) {
      return { email: 'admin' };
    }
    return null;
  },
  cookieName: 'adminjs',
  cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'some-secret-password',
});

module.exports = { adminJs, adminRouter: router };
