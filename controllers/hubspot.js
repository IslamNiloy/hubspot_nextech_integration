
// Check Repeated Trigger
require('dotenv').config();

const {logData} = require('../controllers/utils');

exports.checkHubSpotUpdate= async function(contactId) {
    try {
        const accessToken = process.env.HUBSPOT_ACCESS_TOKEN; // Replace with your actual HubSpot access token

        // Fetch contact data from HubSpot
        const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?propertiesWithHistory=lastmodifieddate`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.propertiesWithHistory || !data.propertiesWithHistory.lastmodifieddate) {
            return { output: false }; // Required for Zapier
        }

        const lastModifiedHistory = data.propertiesWithHistory.lastmodifieddate;

        // Find the most recent updates from "sourceId: 8311262" and "sourceId: 25200"
        const hasRecentUpdate = lastModifiedHistory.some(entry => {
            // Check if the sourceId is one of the two and if it was updated within the last 2 minutes
            const sourceIdMatch = entry.sourceId === "8311262" || entry.sourceId === "25200";
            if (sourceIdMatch) {
                const lastModifiedTimestamp = new Date(entry.timestamp); // Get timestamp of that update
                const now = new Date();
                const timeDiffMinutes = (now - lastModifiedTimestamp) / 60000; // Convert to minutes
                console.log(`Source ID: ${entry.sourceId} Last modified: ${lastModifiedTimestamp}, Time Difference: ${timeDiffMinutes} minutes`);
                
                return timeDiffMinutes <= 2; // Return true if the update is within 2 minutes
            }
            console.log('false')
            return false; // Return false if no match found
        });
        console.log(hasRecentUpdate)
        // If any matching entry was updated in the last 2 minutes, return true
        return { output: hasRecentUpdate };

    } catch (error) {
        console.error("❌ Error fetching HubSpot contact:", error.message);
        return { output: false }; // Ensuring Zapier always gets a response
    }
}

exports.getContactInformation = async function (contactId) {
    logData.getContactInformation_function_start = true;
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN; // Replace with your actual HubSpot access token

    // List of properties you want to retrieve
    const propertiesToFetch = [
        "patient_official_id",
        "patient_status",
        "exclude_from_mailings",
        "prospects_referred",
        "patients_referred",
        "referral_source",
        "referring_physician",
        "primary_care_physician",
        "referring_patient",
        "affiliate_physician",
        "affiliate_physician_type",
        "patient_employment_status",
        "nextech_patient_type",
        "patient_note",
        "ethnicity",
        "patient_id",
        "firstname",
        "lastname",
        "patient_gender",
        "dob",
        "patient_marital_status",
        "nextech_preferred_contact",
        "phone",
        "mobilephone",
        "fax",
        "email",
        "address",
        "city",
        "state",
        "zip",
        "country",
        "emergency_contact_name",
        "emergency_contact_relation",
        "emergency_contact_home_phone",
        "emergency_contact_email",
        "jobtitle",
        "company",
        "general_practitioner",
        "patient_communication"
    ];

    // Fetch contact data from HubSpot
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=${propertiesToFetch.join(',')}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
        logData.getContactInformation_function_error = response.statusText;
    }

    const data = await response.json();

    // Extract the properties from the returned data
    const contactProperties = propertiesToFetch.reduce((result, property) => {
        result[property] = data.properties[property] || "";
        return result;
    }, {});

    return contactProperties;
};

exports.getHubSpotContactByPatientId = async function(patientId, email) {
    console.log(`🔍 Searching HubSpot contact for patient ID: ${patientId}, ${email}`);
    const hubspotSearchUrl = `https://api.hubapi.com/crm/v3/objects/contacts/search`;

    // Build the filters based on available information
    let filters = [];

    // If patientId is not null, search by patientId
    if (patientId) {
        filters.push({
            propertyName: "patient_id",
            operator: "EQ",
            value: patientId
        });
    }

    // If email is not null, search by email
    if (email) {
        filters.push({
            propertyName: "email",
            operator: "EQ",
            value: email
        });
    }

    // If neither patientId nor email is provided, return "not match"
    if (!patientId && !email) {
        console.log("❌ No patientId or email provided, returning 'not match'");
        return { message: "not match" };
    }

    const body = {
        filterGroups: [{
            filters: filters
        }],
        properties: ["id", "email"]
    };

    try {
        const response = await fetch(hubspotSearchUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log(`🔍 HubSpot search response: ${JSON.stringify(data)}`);

        if (data.total > 0) {
            return data.results[0];
        } else {
            // If no result found with the first search, try with the alternate property
            if (patientId) {
                console.log("🔍 No result found for patientId, trying with email...");
                return await searchWithEmail(email);
            } else if (email) {
                console.log("🔍 No result found for email, returning 'not match'");
                return { message: "not match" };
            }
        }
    } catch (error) {
        console.error("❌ Error searching HubSpot contact:", error);
        return { message: "not match" };
    }
}

// Helper function to search with email if the initial patientId search fails
async function searchWithEmail(email) {
    if (!email) {
        console.log("❌ No email provided for search, returning 'not match'");
        return { message: "not match" };
    }

    const hubspotSearchUrl = `https://api.hubapi.com/crm/v3/objects/contacts/search`;

    const body = {
        filterGroups: [{
            filters: [{
                propertyName: "email",
                operator: "EQ",
                value: email
            }]
        }],
        properties: ["id", "email"]
    };

    try {
        const response = await fetch(hubspotSearchUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        console.log(`🔍 HubSpot search by email response: ${JSON.stringify(data)}`);

        if (data.total > 0) {
            return data.results[0];
        } else {
            return { message: "not match" };
        }
    } catch (error) {
        console.error("❌ Error searching HubSpot contact by email:", error);
        return { message: "not match" };
    }
}


exports.updateHubSpotContact = async function (contactId, properties) {
    logData.updateHubSpotContact_function_start = true;
    const accessToken = process.env.HUBSPOT_ACCESS_TOKEN; // Replace with your actual HubSpot access token

    // Prepare the data to update
    const SimplePublicObjectInput = { properties };

    // Update contact in HubSpot
    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(SimplePublicObjectInput)
    });

    if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
        logData.updateHubSpotContact_function_error = response.statusText;
    }

    return await response.json();
}



// exports.getHubSpotContactByPatientId= async function(patientId,email,official_id) {
//     console.log(`🔍 Searching HubSpot contact for patient ID: ${patientId}, ${email}, ${official_id}`);
//     const hubspotSearchUrl = `https://api.hubapi.com/crm/v3/objects/contacts/search`;
//     const body = {
//         filterGroups: [{
//             // filters: [{
//             //     propertyName: "patient_id",
//             //     operator: "EQ",
//             //     value: patientId
//             // }],
//             filters: [{
//                 propertyName: "email",
//                 operator: "EQ",
//                 value: email
//             }],
//             // filters: [{
//             //     propertyName: "patient_official_id",
//             //     operator: "EQ",
//             //     value: official_id
//             // }]
//         }],
//         properties: ["id", "email"]
//     };

//     try {
//         const response = await fetch(hubspotSearchUrl, {
//             method: "POST",
//             headers: {
//                 "Authorization": `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify(body)
//         });

//         const data = await response.json();
//         console.log(`🔍 HubSpot search response: ${JSON.stringify(data)}`);
//         return data.total > 0 ? data.results[0] : null;
//     } catch (error) {
//         console.error("❌ Error searching HubSpot contact:", error);
//         return null;
//     }
// }




// Function to update an existing HubSpot contact
exports.updateHubSpotContactNextech=async function(contactId, patient) {
    const hubspotUpdateUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`;
    const body = {
        properties: patient
    };

    try {
        const response = await fetch(hubspotUpdateUrl, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Failed to update HubSpot contact: ${await response.text()}`);
        }

        console.log(`✅ Successfully updated HubSpot contact ID: ${contactId}`);
    } catch (error) {
        console.error("❌ Error updating HubSpot contact:", error);
    }
}

// Function to create a new HubSpot contact
exports.createHubSpotContact=async function(patient) {
    const hubspotCreateUrl = `https://api.hubapi.com/crm/v3/objects/contacts`;
    const body = {
        properties: patient
    };

    try {
        const response = await fetch(hubspotCreateUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Failed to create HubSpot contact: ${await response.text()}`);
        }

        console.log(`✅ Successfully created new HubSpot contact`);
    } catch (error) {
        console.error("❌ Error creating HubSpot contact:", error);
    }
}