const express = require('express');
const router = express.Router();
const { updateHubSpotContact } = require('../controllers/hubspot');
const { createNextechPatient, updateNextechPatient, fetchSinglePatient } = require('../controllers/nextech');
const {getContactInformation} = require('../controllers/hubspot');
const {logToFile} = require('../controllers/utils');

// Define the webhook handler
router.post('/', async (req, res) => {
    const payload = req.body[0];
    const startTime = new Date().toISOString();  // Capture the start time
    let logData = {};
    logData.eeventId= payload.eventId,
    logData.process= "Webhook",
    logData.status= "start",
    logData.message= "Webhook received and processing started.",
    logData.start_time= startTime,
    logData.received_payload = payload; 
    logData.integration_type = `Hubspot to Nextech for ${payload.subscriptionType} and sourceId: ${payload.sourceId}`; // Log the integration type

    try {
        if (payload.subscriptionType === 'contact.propertyChange' && !(payload.sourceId === '8311262' || payload.sourceId === '25200')) {
            
            // Get the contact information
            const inputData = await getContactInformation(payload.objectId,logData);
            logData.input_data = inputData; 
         
            if (
                !inputData.firstname.includes("Name") &&          
                !inputData.lastname.includes("Unavailable") &&   
                inputData.email &&                               
                inputData.firstname &&                         
                inputData.phone  &&                        
                inputData.zip &&
                inputData.dob                          
                // inputData.patient_official_id ||                   
                // inputData.patient_id                              
            ) {
                if (inputData.patient_id || inputData.patient_official_id) {
                    const updateData = {
                        [payload.propertyName]: payload.propertyValue,
                    };
                    const {success,message} = await updateNextechPatient(inputData, updateData,logData);
                    if(!success){
                        logData.update_nextech_patient_success = message;
                        res.status(400).json({ message: message });
                    } else {
                        logData.update_nextech_patient_message = message; // Log the message
                        res.status(200).json({ message: message });
                    }
                } else {
                    const {success,message,data} = await createNextechPatient(inputData,logData);
                    
                    logData.create_nextech_patient_success = success; 
                    logData.create_nextech_patient_message = message;

                    if (!success) {
                        const {patient} = await fetchSinglePatient(inputData,logData);
                        await updateNextechPatient(patient, inputData);
                        const propertiesToUpdate = {
                            patient_official_id: patient.patient_official_id,
                            patient_id: patient.patient_id
                        }
                        const output =await updateHubSpotContact(payload.objectId, propertiesToUpdate.logData);
                        logData.update_hubspot_contact = output; // Log the output of the updateHubSpotContact function
                        res.status(200).json({ message: `${message} -- Updated patient in nextech because this patient already exist in Nextech and also updated the hubspot contact`});

                    }else { 
                        const propertiesToUpdate = {
                            patient_official_id: data.identifier.find(id => id.use === 'official')?.value,
                            patient_id: data.identifier.find(id => id.use === 'usual')?.value
                        }
                        const output =await updateHubSpotContact(payload.objectId, propertiesToUpdate,logData);
                        logData.update_hubspot_contact = output; // Log the output of the updateHubSpotContact function
                        res.status(200).json({ message: `${message} -- Create new patient in nextech because this contact doesnot exist in Nextech and also updated the hubspot contact`});
                    }
                    
                }
                
            } else {
                logData.condition_matched = "Conditions not met, unable to Updated."; // Log the condition not matched
                console.log("Conditions not met, unable to Updated.")
                res.status(200).json({ message: 'Conditions not met, unable to Updated.' });
            }

        } else if (payload.subscriptionType === 'object.creation' && !(payload.sourceId === '8311262' || payload.sourceId === '25200')) {
            
            const inputData = await getContactInformation(payload.objectId,logData);
            logData.input_data = inputData; 
            
           
            if (
                !inputData.firstname.includes("Name") &&          
                !inputData.lastname.includes("Unavailable") &&   
                inputData.email &&                               
                inputData.firstname &&                           
                inputData.phone &&                         
                inputData.zip &&
                inputData.dob                        
                // inputData.patient_official_id ||                    
                // inputData.patient_id                                 
            ) {
                if (inputData.patient_id || inputData.patient_official_id) {
                    const {message} = await updateNextechPatient(inputData, inputData, logData);
                    logData.update_nextech_patient_message = message; // Log the message
                    res.status(200).json({ message: message });

                } else {
                    const {success,message,data} = await createNextechPatient(inputData, logData);
                    if (!success) {
                        const {patient} = await fetchSinglePatient(inputData, logData);
                        await updateNextechPatient(patient, inputData);
                        const propertiesToUpdate = {
                            patient_official_id: patient.patient_official_id,
                            patient_id: patient.patient_id
                        }
                        const output= await updateHubSpotContact(payload.objectId, propertiesToUpdate. logData);
                        logData.update_hubspot_contact = output; // Log the output of the updateHubSpotContact function
                        res.status(200).json({ message: `${message} -- Updated patient in nextech because this patient already exist in Nextech and also updated the hubspot contact`});
                    }else { 
                        const propertiesToUpdate = {
                            patient_official_id: data.identifier.find(id => id.use === 'official')?.value,
                            patient_id: data.identifier.find(id => id.use === 'usual')?.value
                        }
                        const output= await updateHubSpotContact(payload.objectId, propertiesToUpdate, logData);
                        logData.update_hubspot_contact = output; // Log the output of the updateHubSpotContact function
                        res.status(200).json({ message: `${message} -- Create new patient in nextech because this contact doesnot exist in Nextech and also updated the hubspot contact`});

                    }
                }
            } else {
                logData.condition_matched = "Conditions not met, unable to Create New Patient."; // Log the condition not matched
                console.log("Conditions not met, unable to Create New Patient.")
                res.status(200).json({ message: 'Conditions not met, unable to Create New Patient.' });
            }

// ------------------------------------------------------------------------------------------------


        } else if (payload.subscriptionType === 'meeting.propertyChange') {
            await handleMeetingUpdate(payload);
            res.status(200).json({ message: 'Meeting update handled successfully' });

        } else {
            console.log(`Event type not matched => SourceId: ${payload.sourceId} SubscriptionType: ${payload.subscriptionType}`);
            logData.condition_not_matched = 'Event type not matched => SourceId: ${payload.sourceId} SubscriptionType: ${payload.subscriptionType}'; // Log the condition not matched

            res.status(205).json({ message: `Event type not matched => SourceId: ${payload.sourceId} SubscriptionType: ${payload.subscriptionType}` });
        }

    
    } catch (error) {
        console.error('Error processing the event:', error);
        logData.error = error.message; // Log the error message
        res.status(500).json({ message: 'Internal server error' });
    }
    const endTime = new Date().toISOString();  
    logData.end_time = endTime;
    logToFile(logData);
});


module.exports = router;
