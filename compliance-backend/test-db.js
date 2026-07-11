const db = require('./src/config/db');

async function testConnection() {
  try {
    console.log('⏳ Connecting to Database...');
    
    // Test 1: Simple Time Check
    const timeRes = await db.query('SELECT NOW()');
    console.log('✅ Connection Successful! Server Time:', timeRes.rows[0].now);

    // Test 2: Data Check (Do we see the chemicals?)
    const dataRes = await db.query('SELECT official_name, cas_number FROM substances LIMIT 3');
    console.log('\n🔍 Sample Data from DB:');
    console.table(dataRes.rows);

    process.exit(0);
  } catch (err) {
    console.error('❌ Database Connection Failed:', err.message);
    process.exit(1);
  }
}

testConnection();
