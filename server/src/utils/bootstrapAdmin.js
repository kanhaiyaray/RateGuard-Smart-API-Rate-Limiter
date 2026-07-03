const bcrypt = require('bcryptjs');
const User = require('../models/User');

const createAdminUserIfMissing = async () => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_USER || 'admin@rateguard.local';
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  try {
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      let updated = false;

      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        updated = true;
      }

      if (adminPasswordHash) {
        if (existingAdmin.password !== adminPasswordHash) {
          existingAdmin.password = adminPasswordHash;
          updated = true;
          console.log('✅ Admin password hash updated from ADMIN_PASSWORD_HASH');
        }
      } else if (adminPassword) {
        const validPassword = await bcrypt.compare(adminPassword, existingAdmin.password);
        if (!validPassword) {
          existingAdmin.password = await bcrypt.hash(adminPassword, 10);
          updated = true;
          console.log('✅ Existing admin password updated from ADMIN_PASSWORD');
        }
      }

      if (updated) {
        await existingAdmin.save();
      }

      return;
    }

    const hashedPassword = adminPasswordHash
      ? adminPasswordHash
      : await bcrypt.hash(adminPassword || 'Admin@1234', 10);

    await User.create({
      name: 'RateGuard Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      plan: 'ADMIN'
    });

    console.log(`✅ Initial admin user created: ${adminEmail}`);
    console.log('   Use ADMIN_EMAIL and ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH) in .env to change credentials');
  } catch (err) {
    console.error('❌ Failed to bootstrap admin user:', err.message);
  }
};

module.exports = { createAdminUserIfMissing };
