require("dotenv").config();
const cron = require('node-cron');
const express = require("express");
const morgan = require('morgan');
const webhook = require("./routes/webhook");
const { getNextechPatinetAndUpdateInHubspot } = require('./integration/nextechToHubspot');
const nextechRoutes = require("./routes/nextechRoutes");
const hubspotRoutes = require("./routes/hubspotRoutes");

const app = express();
app.use(express.json());
app.use(morgan('dev')); // Use morgan for logging HTTP requests
app.get("/", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>This is an Integration HubSpot with Nextech</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    background-color: #f4f4f9;
                    padding: 20px;
                    margin: 0;
                    color: #333;
                }
                h1 {
                    color: #2c3e50;
                    font-size: 2em;
                }
                h2 {
                    color: #16a085;
                    font-size: 1.5em;
                }
                #clocks {
                    margin-top: 30px;
                    display: flex;
                    justify-content: center;
                    gap: 50px;
                }
                .clock {
                    font-size: 1.5em;
                    padding: 10px;
                    background-color: #fff;
                    border: 2px solid #2c3e50;
                    border-radius: 10px;
                    width: 200px;
                }
                .clock h3 {
                    margin-bottom: 10px;
                    color: #2980b9;
                }
                .time {
                    font-size: 2em;
                    font-weight: bold;
                    color: #e74c3c;
                }
                .footer {
                    margin-top: 50px;
                    font-size: 1em;
                    color: #95a5a6;
                }
                .gif-container {
                    margin-top: 40px;
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                }
                .gif-container img {
                    width: 250px;
                    height: 250px;
                    border-radius: 10px;
                    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
                }
            </style>
        </head>
        <body>
            <h1>This is an Integration app for HubSpot with Nextech</h1>
            <h2>Developed by HUBXPERT</h2>

            <div id="clocks">
                <div class="clock">
                    <h3>Bangladesh Time (BDT)</h3>
                    <div class="time" id="bdTime"></div>
                </div>
                <div class="clock">
                    <h3>US Time (EST)</h3>
                    <div class="time" id="usTime"></div>
                </div>
            </div>

            <div class="gif-container">
                       <div class="tenor-gif-embed" data-postid="13354615" data-share-method="host" data-aspect-ratio="1.50235" data-width="30%"><a href="https://tenor.com/view/cbb2-cbbus2-bbceleb-bbceleb2-tamar-braxton-gif-13354615">Cbb2 Cbbus2 GIF</a>from <a href="https://tenor.com/search/cbb2-gifs">Cbb2 GIFs</a></div> <script type="text/javascript" async src="https://tenor.com/embed.js"></script>
            </div>


            <script>
                // Function to update Bangladesh Time
                function updateBangladeshTime() {
                    const bdTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" });
                    document.getElementById("bdTime").textContent = bdTime;
                }

                // Function to update US Eastern Time
                function updateUSTime() {
                    const usTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
                    document.getElementById("usTime").textContent = usTime;
                }

                // Update clocks every second
                setInterval(() => {
                    updateBangladeshTime();
                    updateUSTime();
                }, 1000);
            </script>
        </body>
        </html>
    `);
});
app.use("/webhook", webhook);
app.all('*', (req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Page Not Found</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    background-color: #f9f9f9;
                    color: #333;
                    padding: 50px;
                }
                h1 {
                    font-size: 3em;
                    color: #e74c3c;
                }
                p {
                    font-size: 1.5em;
                }
                .message {
                    background-color: #f2f2f2;
                    padding: 20px;
                    border-radius: 10px;
                    border: 1px solid #e74c3c;
                }
            </style>
        </head>
        <body>
            <h1>Oops! Page Not Found.</h1>
            <p>The page you're looking for doesn't exist.</p>
            <div class="message">
                <p>We're sorry, but the page you requested is unavailable or has been moved.</p>
            </div>
        </body>
        </html>
    `);
});
    



// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
    console.log('🕒 Running scheduled task: getNextechPatinetAndUpdateInHubspot');
    try {
        await getNextechPatinetAndUpdateInHubspot();
        console.log('✅ Task completed');
    } catch (err) {
        console.error('❌ Error in scheduled task:', err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
