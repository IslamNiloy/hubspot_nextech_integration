
// function extractIdentifiers(inputData) {
//     const identifiers = inputData.identifier.split(",");
    
//     return {
//         official_id: identifiers[0] || "", // First value as official ID
//         id: identifiers[1] || "" // Second value as ID
//     };
// }


// Utility function to write logs to a JSON file
const fs = require('fs');
const path = require('path');

exports.logToFile = (logData) => {
    const currentDate = new Date();
    const logDirectory = path.join(__dirname, 'logs');  // Create logs folder if not exist
    const logFileName = `${currentDate.toISOString().split('T')[0]}.json`;  // Log file name by date (YYYY-MM-DD.json)
    const logFilePath = path.join(logDirectory, logFileName);

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory);
    }

    // Read the current log file and append new data
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        let logs = [];
        if (!err && data) {
            logs = JSON.parse(data);  // Parse existing logs if the file exists
        }

        // Append the new log
        logs.push(logData);

        // Write the updated logs to the file
        fs.writeFile(logFilePath, JSON.stringify(logs, null, 2), (err) => {
            if (err) {
                console.error('Error writing log to file:', err);
            }
        });
    });
};



exports.logData = {
    process: "Webhook",
    status: "start",
    
    message: "Webhook received and processing started.",
};