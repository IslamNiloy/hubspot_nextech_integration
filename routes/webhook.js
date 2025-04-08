

const express = require('express');
const router = express.Router();
const { handleContactUpdate } = require('../controllers/hubspot');
const { createNextechPatient, updateNextechPatient } = require('../controllers/nextech');
const {getContactInformation} = require('../controllers/hubspot');

// Define the webhook handler
router.post('/', async (req, res) => {
    const payload = req.body;

    console.log('Received Payload:', JSON.stringify(payload, null, 2));

    // Check the event type and route accordingly
    try {
        let message;
        if (payload.subscriptionType === 'contact.propertyChange'&& !(payload.sourceId === '8311262' || payload.sourceId === '25200')) {
            inputData = await getContactInformation(payload.objectId);
            console.log(inputData)
            if (inputData.patient_id){
                const updateData= {
                    [payload.propertyName]: payload.propertyValue,
                }
                message = await updateNextechPatient(inputData.patient_official_id, updateData);
            }else{
                message = await createNextechPatient(inputData);
            }
            res.status(200).json({ message: message });

        } else if (payload.subscriptionType === 'object.creation' && !(payload.sourceId === '8311262' || payload.sourceId === '25200')) {
            inputData = await getContactInformation(payload.objectId);
            if (inputData.patient_id){
                await updateNextechPatient(inputData.patient_offical_id, inputData);
            }else{
                await createNextechPatient(inputData);
            }
            res.status(200).json({ message: 'Contact create successfully' });
        }else if (payload.subscriptionType === 'meeting.propertyChange') {
            
            await handleMeetingUpdate(payload);
            res.status(200).json({ message: 'Meeting update handled successfully' });
        }
         else {
            res.status(200).json({ message: `Event type not match => SourceId:` + payload.sourceId +  ` SubscriptionType:` + payload.subscriptionType });
        }
    } catch (error) {
        console.error('Error processing the event:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


module.exports = router;
