const nodemailer = require('nodemailer');
require('dotenv').config();

async function sendNotification(newJobs, config) {
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const emailService = process.env.EMAIL_SERVICE || 'gmail';

  if (!emailUser || !emailPassword) {
    console.log("Email credentials not set. Would have sent email for:");
    console.log(newJobs.map(j => j.title).join(', '));
    return;
  }

  const transporter = nodemailer.createTransport({
    service: emailService,
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });

  const jobListHTML = newJobs.map(job => `
    <li style="margin-bottom: 10px;">
      <strong><a href="${job.url}">${job.title}</a></strong><br/>
      Location: ${job.location}<br/>
      Type: ${job.type}<br/>
      Matched Criterion: ${job.matchedCriteria}
    </li>
  `).join('');

  const notificationEmails = config.notificationEmails.split(',').map(e => e.trim());

  const mailOptions = {
    from: `"Job Scraper Agent" <${emailUser}>`,
    to: notificationEmails.join(', '),
    subject: `🚨 ${newJobs.length} New Job(s) Found!`,
    html: `
      <h2>New Jobs Matching Your Criteria</h2>
      <ul>
        ${jobListHTML}
      </ul>
      <p>Go apply now before they close!</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Notification email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }
}

module.exports = { sendNotification };
