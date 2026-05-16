const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function checkUrls() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  const jobs = await db.all('SELECT id, url FROM jobs LIMIT 5');
  console.log(jobs);
}

checkUrls().catch(console.error);
