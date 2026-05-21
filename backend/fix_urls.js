const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function fixUrls() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  const jobs = await db.all('SELECT * FROM jobs');
  let updated = 0;
  
  for (const job of jobs) {
    if (job.url && job.url.includes(':')) {
      const parts = job.url.split(':');
      const realId = parts[parts.length - 1];
      // The url looks like https://pm.healthcaresource.com/CS/rwjbarnabashealth#/job/2327:129626
      // So we split by /job/ and take the first part, then append /job/realId
      const urlBaseParts = job.url.split('/job/');
      if (urlBaseParts.length === 2) {
        const newUrl = urlBaseParts[0] + '/job/' + realId;
        await db.run('UPDATE jobs SET url = ? WHERE id = ?', [newUrl, job.id]);
        updated++;
      }
    }
  }
  
  console.log(`Updated ${updated} job URLs.`);
}

fixUrls().catch(console.error);
