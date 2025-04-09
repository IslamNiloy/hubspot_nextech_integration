const express = require('express');
const router = express.Router();
const { updateHubSpotContact } = require('../controllers/hubspot');
const { createNextechPatient, updateNextechPatient, fetchSinglePatient } = require('../controllers/nextech');
const {getContactInformation} = require('../controllers/hubspot');
const {logToFile,logData} = require('../controllers/utils');

// Define the webhook handler
router.post('/', async (req, res) => {
    const payload = req.body;
    const startTime = new Date().toISOString();  // Capture the start time
    logData.start_time= startTime,
    logData.received_payload = payload; 

    try {
        if (payload.subscriptionType === 'contact.propertyChange' && !(payload.sourceId === '8311262' || payload.sourceId === '25200')) {
            // Get the contact information
            const inputData = await getContactInformation(payload.objectId);
            console.log("here i'm");
            logData.input_data = inputData; // Log the input data
            console.log("im here now", logData)
            // The condition logic for contact.propertyChange
            if (
                !inputData.firstname.includes("Name") &&          // First Name does not contain "Name"
                !inputData.lastname.includes("Unavailable") &&   // Last Name does not contain "Unavailable"
                inputData.email &&                               // Email exists
                inputData.firstname &&                           // First Name exists
                inputData.phone &&                         // Phone Number exists
                inputData.zip ||                          // Postal Code exists
                inputData.patient_official_id ||                    // Patient Official ID exists
                inputData.patient_id                               // Patient ID exists
            ) {
                if (inputData.patient_id) {
                    const updateData = {
                        [payload.propertyName]: payload.propertyValue,
                    };
                    const {success,message} = await updateNextechPatient(inputData.patient_official_id, updateData);
                    if(!success){
                        res.status(400).json({ message: message });
                    } else {
                        res.status(200).json({ message: message });
                    }
                } else {
                    const {success,message,data} = await createNextechPatient(inputData);
                    
                    logData.create_nextech_patient_success = success; 
                    logData.create_nextech_patient_message = message;

                    if (!success) {
                        const {patient} = await fetchSinglePatient(inputData);
                        await updateNextechPatient(patient.patient_official_id, inputData);
                        const propertiesToUpdate = {
                            patient_official_id: patient.patient_official_id,
                            patient_id: patient.patient_id
                        }
                        await updateHubSpotContact(payload.objectId, propertiesToUpdate);
                        res.status(200).json({ message: `${message} -- Updated patient in nextech because this patient already exist in Nextech and also updated the hubspot contact`});

                    }else { 
                        const propertiesToUpdate = {
                            patient_official_id: data.identifier.find(id => id.use === 'official')?.value,
                            patient_id: data.identifier.find(id => id.use === 'usual')?.value
                        }
                        await updateHubSpotContact(payload.objectId, propertiesToUpdate);
                        res.status(200).json({ message: `${message} -- Create new patient in nextech because this contact doesnot exist in Nextech and also updated the hubspot contact`});
                    }
                    
                }
                
            } else {
                res.status(400).json({ message: 'Conditions not met, unable Updated.' });
            }

        } else if (payload.subscriptionType === 'object.creation' && !(payload.sourceId === '8311262' || payload.sourceId === '25200')) {
            // Get the contact information for object creation
            const inputData = await getContactInformation(payload.objectId);
            logData.input_data = inputData; // Log the input data
            
            // The condition logic for object.creation
            if (
                !inputData.firstname.includes("Name") &&          // First Name does not contain "Name"
                !inputData.lastname.includes("Unavailable") &&   // Last Name does not contain "Unavailable"
                inputData.email &&                               // Email exists
                inputData.firstname &&                           // First Name exists
                inputData.phone &&                         // Phone Number exists
                inputData.zip ||                          // Postal Code exists
                inputData.patient_official_id ||                    // Patient Official ID exists
                inputData.patient_id                                 // Patient ID exists
            ) {
                if (inputData.patient_id) {
                    await updateNextechPatient(inputData.patient_official_id, inputData);
                    res.status(200).json({ message: `Updated patient in Nextech Successfully` });

                } else {
                    const {success,message,data} = await createNextechPatient(inputData);
                    if (!success) {
                        const {patient} = await fetchSinglePatient(inputData);
                        await updateNextechPatient(patient.patient_official_id, inputData);
                        const propertiesToUpdate = {
                            patient_official_id: patient.patient_official_id,
                            patient_id: patient.patient_id
                        }
                        await updateHubSpotContact(payload.objectId, propertiesToUpdate);
                        res.status(200).json({ message: `${message} -- Updated patient in nextech because this patient already exist in Nextech and also updated the hubspot contact`});
                    }else { 
                        const propertiesToUpdate = {
                            patient_official_id: data.identifier.find(id => id.use === 'official')?.value,
                            patient_id: data.identifier.find(id => id.use === 'usual')?.value
                        }
                        await updateHubSpotContact(payload.objectId, propertiesToUpdate);
                        res.status(200).json({ message: `${message} -- Create new patient in nextech because this contact doesnot exist in Nextech and also updated the hubspot contact`});

                    }
                }
            } else {
                res.status(400).json({ message: 'Conditions not met, unable to Create New Patient.' });
            }

// ------------------------------------------------------------------------------------------------


        } else if (payload.subscriptionType === 'meeting.propertyChange') {
            await handleMeetingUpdate(payload);
            res.status(200).json({ message: 'Meeting update handled successfully' });

        } else {
            res.status(200).json({ message: `Event type not matched => SourceId: ${payload.sourceId} SubscriptionType: ${payload.subscriptionType}` });
        }

    
    } catch (error) {
        // console.error('Error processing the event:', error);
        logData.error = error.message; // Log the error message
        res.status(500).json({ message: 'Internal server error' });
    }
    const endTime = new Date().toISOString();  // Capture the end time
    logData.end_time = endTime;
    logToFile(logData);
});


module.exports = router;
