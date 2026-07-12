const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('fleet.db');
(async () => {
  const hash1 = await bcrypt.hash('LocalDemo@123', 10);
  db.run('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)', ['local.analyst@transitops.demo', hash1, 'Local Analyst Demo', 'Local Analyst']);
  const hash2 = await bcrypt.hash('SeniorDemo@123', 10);
  db.run('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)', ['senior.analyst@transitops.demo', hash2, 'Senior Analyst Demo', 'Senior Analyst']);
  console.log('Done');
})();
