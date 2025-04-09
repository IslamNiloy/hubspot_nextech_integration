const{formatPatientData, fetchUpdatedPatients} = require("../controllers/nextech");
const MAX_DAILY_LIMIT = 1000;
const {logData,logToFile} = require("../controllers/utils");
const {getHubSpotContactByPatientId, createHubSpotContact, updateHubSpotContactNextech} = require("../controllers/hubspot");

// Function to fetch updated patients from Nextech
// async function fetchUpdatedPatients(lastSyncTime, lastOffset, remainingLimit) {
//     console.log(`🕒 Last Sync Time: ${lastSyncTime}, 📌 Last Offset: ${lastOffset}, 🔄 Remaining API Calls: ${remainingLimit}`);
    
//     const token = await getNextechToken();
//     let nextUrl = `${NEXTECH_API_URL}?_lastUpdated=gt${lastSyncTime}&_count=10&_getpagesoffset=${lastOffset}`;
//     let allPatients = [];

//     try {
//         while (nextUrl && remainingLimit > 0) {
//             const response = await fetch(nextUrl, {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     "nx-practice-id": "2441c8d4-dbf0-4517-a5e5-fe84c0ff4c50"
//                 }
//             });

//             if (!response.ok) {
//                 throw new Error(`Error fetching patients: ${await response.text()}`);
//             }

//             const data = await response.json();
//             if (data.entry) {
//                 allPatients.push(...data.entry.map(entry => entry.resource));
//             }

//             console.log(`📄 Page fetched: ${allPatients.length} patients so far.`);

//             // Get next page link
//             const nextPageLink = data.link?.find(link => link.relation === 'next');
//             if (nextPageLink) {
//                 nextUrl = nextPageLink.url;
//                 lastOffset += 10;
//             } else {
//                 nextUrl = null;
//             }

//             // Reduce API call limit
//             remainingLimit -= 1;

//             if (remainingLimit <= 0) {
//                 console.log("⚠️ Reached daily request limit for Nextech. Stopping polling.");
//                 break;
//             }
//         }

//     } catch (error) {
//         console.error("❌ Error fetching patients from Nextech:", error);
//         return { patients: [], lastSyncTime, lastOffset, remainingLimit };
//     }

//     return { patients: allPatients, lastSyncTime: new Date().toISOString(), lastOffset, remainingLimit };
// }

// Function to format patient data
// function formatPatientData(patient) {
//     const fullName = patient.name?.find(n => n.use === "official")?.text || "";
//     const nameParts = fullName.split(" ").filter(Boolean);
//     const lastName = nameParts.length > 1 ? nameParts.pop() : ""; // Last part is last name
//     const firstName = nameParts.join(" ");
//     function isValidEmail(email) {
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
//         return emailRegex.test(email);
//     }

//     // Map allowed patient statuses to HubSpot options
//     const allowedStatuses = {
//         "Patient": "patient",
//         "Prospect": "prospect",
//         "Patient Prospect": "patientprospect"
//     };

//     const allowedMaritalStatuses = {
//         "Married": "M",
//         "Unmarried": "U",
//         "Never Married": "S"
//     };

//     const allowedAffiliatePhysicianTypes = {
//         "Preop": "preop",
//         "Postop": "postop",
//         "Pre And Postop": "preandpostop"
//     }

//     const allowedPatientEmploymentStatuses = {
//         "Full Time": "full time",
//         "Part Time": "part time",
//         "Retired": "retired",
//         "Full Time Student": "full time student",
//         "Part Time Student": "part time student",
//         "Other": "other"
//     }
        
//     return {
//         patient_official_id: patient.id,
//         // lastUpdated: patient.meta?.lastUpdated || null,
        
//         // Patient Status
//         patient_status: allowedStatuses[patient.extension?.find(ext => ext.url.includes("patient-status"))?.valueString] || "patient",
//         // exclude_from_mailings: patient.extension?.find(ext => ext.url.includes("exclude-from-mailings"))?.valueBoolean || false,
//         exclude_from_mailings: patient.extension?.find(ext => ext.url.includes("exclude-from-mailings"))?.valueBoolean ? "true" : "false",
//         prospects_referred: patient.extension?.find(ext => ext.url.includes("prospects-referred"))?.valueInteger || 0,
//         patients_referred: patient.extension?.find(ext => ext.url.includes("patients-referred"))?.valueInteger || 0,
//         referral_source: patient.extension?.find(ext => ext.url.includes("referral-source"))?.valueReference?.reference || "",
//         referring_physician: patient.extension?.find(ext => ext.url.includes("referring-physician"))?.valueReference?.reference || "",
//         primary_care_physician: patient.extension?.find(ext => ext.url.includes("primary-care-physician"))?.valueReference?.reference || "",
//         referring_patient: patient.extension?.find(ext => ext.url.includes("referring-patient"))?.valueReference?.reference || "",
//         affiliate_physician: patient.extension?.find(ext => ext.url.includes("affiliate-physician"))?.valueReference?.display || "",
//         affiliate_physician_type: allowedAffiliatePhysicianTypes[patient.extension?.find(ext => ext.url.includes("affiliate-physician-type"))?.valueString]|| "",
//         patient_employment_status: allowedPatientEmploymentStatuses[patient.extension?.find(ext => ext.url.includes("patient-employment-status"))?.valueString] || "",
//         nextech_patient_type: patient.extension?.find(ext => ext.url.includes("patient-type"))?.valueReference?.reference || "",
//         patient_note: patient.extension?.find(ext => ext.url.includes("patient-note"))?.valueString || "",
//         // patientLocation: patient.extension?.find(ext => ext.url.includes("patient-location"))?.valueReference?.display || " ",
        
//         // Ethnicity & Race
//         ethnicity: patient.extension?.find(ext => ext.url.includes("Ethnicity"))?.valueCodeableConcept?.text || "",
//         // race: patient.extension?.find(ext => ext.url.includes("Race"))?.valueCodeableConcept?.text || " ",

//         // Identifiers
//         // patient_official_id: patient.identifier?.find(id => id.use === "official")?.value || " ",
//         patient_id: patient.identifier?.find(id => id.use === "usual")?.value || "",
//         // identifierSSN: patient.identifier?.find(id => id.system === "http://hl7.org/fhir/sid/us-ssn")?.value || " ",

//         // Names
//         firstname: firstName,
//         lastname: lastName,
//         // nickname: patient.name?.find(n => n.use === "nickname")?.text || " ",
//         patient_gender: patient.gender || "",
//         dob: patient.birthDate || "",
//         patient_marital_status: allowedMaritalStatuses[patient.maritalStatus?.text] || "",
//         nextech_preferred_contact: (() => {
//             const preferred = patient.telecom?.find(t => t.rank === 1);
//             if (preferred) {
//                 if (preferred.system === "phone") {
//                     return preferred.use === "home" ? "home"
//                         : preferred.use === "mobile" ? "mobile"
//                         : preferred.use === "work" ? "work"
//                         : "phone"; // Default to "phone" if use is missing
//                 }
//                 return preferred.system; // Return email, sms, etc.
//             }
//             return "";
//         })(),

//         // privacySettings: patient.telecom?.some(t => t.extension?.find(ext => ext.url.includes("method-privacy"))?.valueBoolean) || false,

//         // Contact Information
//         phone: patient.telecom?.find(t => t.system === "phone" && t.use === "home")?.value || "",
//         // workPhone: patient.telecom?.find(t => t.system === "phone" && t.use === "work")?.value || " ",
//         mobilephone: patient.telecom?.find(t => t.system === "phone" && t.use === "mobile")?.value || "",
//         // otherPhone: patient.telecom?.find(t => t.system === "other")?.value || " ",
//         fax: patient.telecom?.find(t => t.system === "fax")?.value || "",
//         email: isValidEmail(patient.telecom?.find(t => t.system === "email")?.value) 
//         ? patient.telecom?.find(t => t.system === "email")?.value 
//         : null,
//         // Address
//         // addressType: patient.address?.[0]?.type || " ",
//         // addressUse: patient.address?.[0]?.use || " ",
//         address: patient.address?.[0]?.line?.[0] || "",
//         city: patient.address?.[0]?.city || "",
//         state: patient.address?.[0]?.state || "",
//         zip: patient.address?.[0]?.postalCode || "",
//         country: patient.address?.[0]?.country || "",

//         // Emergency Contact
//         emergency_contact_name: patient.contact?.[0]?.name?.text || "",
//         emergency_contact_relation: patient.contact?.[0]?.extension?.find(ext => ext.url.includes("emergency-contact-relation"))?.valueString || "",
//         emergency_contact_home_phone: patient.contact?.[0]?.telecom?.find(t => t.system === "phone" && t.use === "home")?.value || "",
//         // emergencyContactWorkPhone: patient.contact?.[0]?.telecom?.find(t => t.system === "phone" && t.use === "work")?.value || " ",
//         // emergencyContactMobilePhone: patient.contact?.[0]?.telecom?.find(t => t.system === "phone" && t.use === "mobile")?.value || " ",
//         emergency_contact_email: patient.contact?.[0]?.telecom?.find(t => t.system === "email")?.value || "",

//         // Occupation Details
//         jobtitle: patient.contact?.[0]?.extension?.find(ext => ext.url.includes("patient-occupation"))?.valueString || "",
//         company: patient.contact?.[0]?.extension?.find(ext => ext.url.includes("patient-company"))?.valueString || "",
//         // patientOccupationCode: patient.contact?.[0]?.extension?.find(ext => ext.url.includes("patient-occupation-code"))?.valueString || " ",
//         // patientIndustryCode: patient.contact?.[0]?.extension?.find(ext => ext.url.includes("patient-industry-code"))?.valueString || " ",
        

//         general_practitioner: patient.generalPractitioner?.[0]?.reference || "",
//         patient_communication: patient.communication?.[0]?.language?.text || "",
//     };
// }

// **Main function for Zapier**
exports.getNextechPatinetAndUpdateInHubspot = async function() {
    try {
        const startTime = new Date().toISOString();  // Capture the start time
        logData.process= "CronJob",
        logData.status= "start",
        logData.message= "CronJob started and processing started.",
        logData.start_time= startTime,
        logData.integration_type = `Nextech to Hubspot for Updated patient in last 30 m`; // Log the integration type
        
        
        // Read last sync details from input (Zapier stores it in previous steps)
        let lastSyncTime = new Date(new Date().getTime() - 3 * 60 * 60 * 1000).toISOString() || "2024-01-01T00:00:00Z"; 
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