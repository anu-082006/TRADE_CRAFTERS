const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
    let connection;
    try {
        // Create connection without database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || ''
        });

        console.log('Connected to MySQL server');

        // Read and execute schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');
        
        // Split schema into individual statements
        let statements = schema.split(';').filter(stmt => stmt.trim());

        // Read and execute migration files
        const migrationsDir = path.join(__dirname, 'migrations');
        const migrationFiles = await fs.readdir(migrationsDir);
        
        for (const file of migrationFiles.sort()) {
            if (file.endsWith('.sql')) {
                const migrationPath = path.join(migrationsDir, file);
                const migrationSql = await fs.readFile(migrationPath, 'utf8');
                statements = statements.concat(migrationSql.split(';').filter(stmt => stmt.trim()));
            }
        }
        
        for (const statement of statements) {
            if (statement.trim()) {
                await connection.query(statement);
                console.log('Executed:', statement.trim().substring(0, 50) + '...');
            }
        }

        console.log('Database initialization completed successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run if this file is executed directly
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Failed to initialize database:', error);
            process.exit(1);
        });
}

module.exports = initializeDatabase; 