const express = require('express');
const axios = require('axios');
const router = express.Router();

// Define the webhook handler
router.post('/', async (req, res) => {
    const payload = req.body;

    console.log('Received Payload:', JSON.stringify(payload, null, 2));

    // Check the event type and route accordingly
    try {
        if (payload.subscriptionType === 'contact.propertyChange') {
            
            await handleContactUpdate(payload);
            res.status(200).json({ message: 'Contact update handled successfully' });
        } else if (payload.subscriptionType === 'object.creation') {
            
            await createContact(payload);
            res.status(200).json({ message: 'Meeting update handled successfully' });
        }else if (payload.subscriptionType === 'meeting.propertyChange') {
            
            await handleMeetingUpdate(payload);
            res.status(200).json({ message: 'Meeting update handled successfully' });
        }
         else {
            res.status(400).json({ message: 'Unknown event type' });
        }
    } catch (error) {
        console.error('Error processing the event:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Function to handle contact updates
async function handleContactUpdate(payload) {
    const contactId = payload.objectId;
    const propertyName = payload.propertyName;
    const propertyValue = payload.propertyValue;

    // Process the contact update based on the payload data (send to Nextech or HubSpot)
    try {
        const contactData = {
            contactId,
            propertyName,
            propertyValue,
        };

        // Example: Send data to Nextech (implement your own logic here)
        await axios.post('http://your-nextech-api.com/updateContact', contactData);
    } catch (error) {
        console.error('Error sending contact update to Nextech:', error);
        throw error;
    }
}

// Function to handle meeting updates
async function handleMeetingUpdate(payload) {
    const meetingId = payload.objectId;
    const propertyName = payload.propertyName;
    const propertyValue = payload.propertyValue;

    // Process the meeting update based on the payload data (send to Nextech or HubSpot)
    try {
        const meetingData = {
            meetingId,
            propertyName,
            propertyValue,
        };

        // Example: Send data to HubSpot or Nextech (implement your own logic here)
        await axios.post('http://your-hubspot-api.com/updateMeeting', meetingData);
    } catch (error) {
        console.error('Error sending meeting update to HubSpot:', error);
        throw error;
    }
}

module.exports = router;
