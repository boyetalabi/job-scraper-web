const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function fixUrlsAgain() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  const jobs = await db.all('SELECT id, url FROM jobs');
  let updated = 0;
  
  for (const job of jobs) {
    const realId = job.id.split('_').pop();
    const match = job.url.match(/pm\.healthcaresource\.com\/CS\/([^\#]+)\#/);
    const portalName = match ? match[1] : 'rwjbarnabashealth';
    
    const newUrl = `https://pm.healthcaresource.com/CS/${portalName}#/job/${realId}`;
    await db.run('UPDATE jobs SET url = ? WHERE id = ?', [newUrl, job.id]);
    updated++;
  }
  
  console.log(`Updated ${updated} job URLs to the correct format.`);
}

fixUrlsAgain().catch(console.error);
