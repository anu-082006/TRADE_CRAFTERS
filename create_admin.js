const db = require('./db');
const bcrypt = require('bcrypt');

async function createAdminUser() {
    try {
        const username = 'admin';
        const email = 'admin@tradecrafters.com';
        const password = 'admin123'; // You should change this in production
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Check if admin user already exists
        const [existingUsers] = await db.query(
            'SELECT * FROM Users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            console.log('Admin user already exists');
            return;
        }

        // Create admin user
        await db.query(
            'INSERT INTO Users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [username, email, passwordHash, 'ADMIN']
        );

        console.log('Admin user created successfully');
    } catch (err) {
        console.error('Error creating admin user:', err);
    } finally {
        process.exit();
    }
}

createAdminUser(); 