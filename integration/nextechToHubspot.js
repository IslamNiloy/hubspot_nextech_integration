const{formatPatientData, fetchUpdatedPatients} = require("../controllers/nextech");
const MAX_DAILY_LIMIT = 1000;
const {logToFile} = require("../controllers/utils");
const {getHubSpotContactByPatientId, createHubSpotContact, updateHubSpotContactNextech} = require("../controllers/hubspot");


// **Main function for Zapier**
exports.getNextechPatinetAndUpdateInHubspot = async function() {
    try {
        let logData = {}
        const startTime = new Date().toISOString();  // Capture the start time
        logData.process= "CronJob",
        logData.status= "start",
        logData.message= "CronJob started and processing started.",
        logData.start_time= startTime,
        logData.integration_type = `Nextech to Hubspot for Updated patient in last 30 m`; // Log the integration type
        
        
        // Read last sync details from input (Zapier stores it in previous steps)
        let lastSyncTime = new Date(new Date().getTime() - 20 * 60 * 60 * 1000).toISOString() || "2024-01-01T00:00:00Z"; 
        let lastOffset = 0;
        let remainingLimit = MAX_DAILY_LIMIT;

        // Fetch updated patients from Nextech
        const { patients, lastSyncTime: newSyncTime, lastOffset: newOffset, remainingLimit: newLimit } =
            await fetchUpdatedPatients(lastSyncTime, lastOffset, remainingLimit);
        if (!patients || patients.length === 0) {
            logData.count_of_patients = 0;
            console.log("📋 No new patients found.");
            return { success: true, message: "No new patients found" };
        }
        // Format patient data
        logData.count_of_patients = patients.length;
        const formattedPatients = patients.map(formatPatientData);
        logData.formatted_patients = formattedPatients;
        logData.sucessfully_fetched_patients = true;
        console.log("📋 Formatted Patients:", formattedPatients);
        console.log("✅ Successfully fetched and formatted patients.");

        await syncPatientsToHubSpot(formattedPatients);

        // Return results to Zapier
        logToFile(logData);
        return {
            success: true,
            message: `${formattedPatients.length} patients fetched`,
            count: formattedPatients.length,
            patients: formattedPatients,
            lastSyncTime: newSyncTime,
            lastOffset: newOffset,
            remainingLimit: newLimit
        };

    } catch (error) {
        console.error("❌ Error processing Zapier Task:", error);
        logData.error = error.message;
        logToFile(logData);
        return { success: false, message: "Internal Server Error" };
    }

}


async function syncPatientsToHubSpot(patients) {
    for (const patient of patients) {
        const hubspotContact = await getHubSpotContactByPatientId(patient.patient_id,patient.email,patient.patient_official_id);

        if (hubspotContact) {
            console.log(`🔄 Updating existing HubSpot contact for patient ID: ${patient.patient_id}`);
            await updateHubSpotContactNextech(hubspotContact.id, patient);
        } else {
            console.log(`🆕 Creating new HubSpot contact for patient ID: ${patient.patient_id}`);
            await createHubSpotContact(patient);
        }
    }
}