# Job Scraper Web Application

A full-stack web application to automate scraping of the Healthcaresource ATS API and send email notifications. It features a modern React frontend and an Express + SQLite backend.

## Architecture
- **Backend:** Express.js, SQLite (for config and job history), Node-Schedule (for the agent loop), Nodemailer (for emails).
- **Frontend:** Vite + React, Vanilla CSS (Premium Dark Theme), Lucide-React (Icons).

## Running Locally

You will need two terminal windows.

### 1. Start the Backend
Navigate to the `backend` folder:
```bash
cd backend
npm start
```
*(You may need to add `"start": "node server.js"` to your `backend/package.json` scripts, or just run `node server.js`)*

The backend runs on `http://localhost:5000`.

### 2. Start the Frontend
Navigate to the `frontend` folder:
```bash
cd frontend
npm run dev
```
The frontend runs on `http://localhost:5173`. Open this URL in your browser to access the dashboard.

## Environment Variables
In the `backend` directory, create a `.env` file to store your email credentials:
```
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_SERVICE=gmail
```
*You must restart the backend after creating or editing the `.env` file.*
