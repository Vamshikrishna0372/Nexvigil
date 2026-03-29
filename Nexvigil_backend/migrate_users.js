const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

async function migrate() {
  try {
    console.log('Connecting to:', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected.');

    // 1. First, ensure everyone has the 'name' field
    const usersToUpdate = await User.find({ name: { $exists: false } });
    console.log(`Checking ${usersToUpdate.length} users for missing 'name' field...`);
    
    for (const u of usersToUpdate) {
      u.name = u.displayName || u.email.split('@')[0];
      await u.save();
    }

    // 2. enforce role logic: only admin@nexvigil.com is admin
    const adminMigration = await User.updateMany(
      { email: { $ne: "admin@nexvigil.com" } },
      { $set: { role: "user" } }
    );
    
    const singleAdmin = await User.updateOne(
      { email: "admin@nexvigil.com" },
      { $set: { role: "admin", status: "active" } }
    );

    console.log(`✅ Roles Restructured. Downgraded others, ensuring 1 admin.`);
    
    // 3. Status health check
    await User.updateMany({ status: { $exists: false } }, { $set: { status: "active" } });

    const finalUsers = await User.find({});
    console.log('\n--- Final User Registry ---');
    finalUsers.forEach(u => {
      console.log(`- ${u.email}: Name="${u.name}", Role=${u.role}, Status=${u.status}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
