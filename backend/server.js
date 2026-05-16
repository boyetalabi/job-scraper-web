const express = require('express');
const cors = require('cors');
const schedule = require('node-schedule');
const { getDb, initDb } = require('./database');
const { scrapeJobs } = require('./scraper');
const { sendNotification } = require('./notifier');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

let isRunning = false;
let jobSchedule = null;

async function runJobCheck() {
  if (!isRunning) return;
  const db = await getDb();
  const config = await db.get('SELECT * FROM config WHERE id = 1');
  
  console.log(`[${new Date().toISOString()}] Checking for new jobs...`);
  try {
    const countResult = await db.get('SELECT COUNT(*) as count FROM jobs');
    const isFirstRun = countResult.count === 0;

    const jobs = await scrapeJobs(config);
    const newJobs = [];

    for (const job of jobs) {
      const exists = await db.get('SELECT id FROM jobs WHERE id = ?', [job.id]);
      if (!exists) {
        newJobs.push(job);
        await db.run(
          'INSERT INTO jobs (id, title, location, type, datePosted, url, matchedCriteria) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [job.id, job.title, job.location, job.type, job.datePosted, job.url, job.matchedCriteria]
        );
      }
    }

    if (newJobs.length > 0) {
      if (isFirstRun) {
        console.log(`Initial seed: Found ${newJobs.length} jobs. Saving to database without emailing.`);
      } else {
        console.log(`Found ${newJobs.length} new jobs! Sending notification...`);
        await sendNotification(newJobs, config);
      }
    } else {
      console.log('No new jobs found.');
    }
  } catch (error) {
    console.error('Error in job check:', error);
  }
}

function startAgent(frequencyMinutes) {
  if (jobSchedule) {
    jobSchedule.cancel();
  }
  isRunning = true;
  runJobCheck(); // run immediately
  const cronExpression = `*/${frequencyMinutes} * * * *`;
  jobSchedule = schedule.scheduleJob(cronExpression, runJobCheck);
  console.log(`Agent started. Running every ${frequencyMinutes} minutes.`);
}

function stopAgent() {
  if (jobSchedule) {
    jobSchedule.cancel();
    jobSchedule = null;
  }
  isRunning = false;
  console.log('Agent stopped.');
}

// APIs
app.get('/api/status', (req, res) => {
  res.json({ isRunning });
});

app.post('/api/start', async (req, res) => {
  const db = await getDb();
  const config = await db.get('SELECT frequencyMinutes FROM config WHERE id = 1');
  startAgent(config.frequencyMinutes);
  res.json({ message: 'Agent started', isRunning });
});

app.post('/api/stop', (req, res) => {
  stopAgent();
  res.json({ message: 'Agent stopped', isRunning });
});

app.post('/api/check', async (req, res) => {
  if (isRunning) {
    // If running, it's already checking, but we can force a check.
    runJobCheck();
    res.json({ message: 'Manual check triggered' });
  } else {
    res.status(400).json({ message: 'Agent is stopped. Start it first.' });
  }
});

app.get('/api/config', async (req, res) => {
  const db = await getDb();
  const config = await db.get('SELECT * FROM config WHERE id = 1');
  res.json(config);
});

app.post('/api/config', async (req, res) => {
  const { searchCriteria, notificationEmails, frequencyMinutes, targetUrls, maxDaysOld } = req.body;
  const db = await getDb();
  
  const oldConfig = await db.get('SELECT searchCriteria FROM config WHERE id = 1');
  if (oldConfig && oldConfig.searchCriteria !== searchCriteria) {
    await db.run('DELETE FROM jobs');
    console.log('Search criteria changed, old jobs cleared.');
  }

  await db.run(
    'UPDATE config SET searchCriteria = ?, notificationEmails = ?, frequencyMinutes = ?, targetUrls = ?, maxDaysOld = ? WHERE id = 1',
    [searchCriteria, notificationEmails, frequencyMinutes, targetUrls, maxDaysOld]
  );
  
  if (isRunning) {
    startAgent(frequencyMinutes); // Restart with new frequency
  }
  res.json({ message: 'Configuration updated successfully' });
});

app.get('/api/jobs', async (req, res) => {
  const db = await getDb();
  const jobs = await db.all('SELECT * FROM jobs ORDER BY seenAt DESC');
  res.json(jobs);
});

const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 5000;

initDb().then(() => {
  console.log('Database initialized');
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}).catch(console.error);
