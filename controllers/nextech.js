require('dotenv').config();
// Create Patient in Nextech
const { getNextechToken } = require("./token");
const {logData} = require("./utils");
const NEXTECH_API_URL = "https://select.nextech-api.com/api/Patient";


exports.createNextechPatient= async function(inputData) {
    try {
        // Fetch Nextech token
        logData.createNextechPatient_function_start = true;
        logData.creating_nextech_patient_input_data = inputData;
        // console.log(inputData)
        const token = await getNextechToken();

        // Validate required fields
        if (!inputData.firstname || !inputData.lastname || !inputData.email || !inputData.dob || !inputData.zip || (!inputData.phone && !inputData.mobilephone)) {
            throw new Error("Missing required fields: firstname, lastname, email, dob, zip, and at least one phone number.");
        }
        const formatPhoneNumber = (phone) => {
            if (phone && phone.length > 0) {
                // Remove all non-digit characters (e.g., parentheses, dashes, spaces)
                const cleanedPhone = phone.replace(/\D/g, '');  // This will only keep digits
                
                // Return the last 10 digits, or the full phone number if it's less than 10 digits
                return cleanedPhone.length > 10 ? cleanedPhone.slice(-10) : cleanedPhone;
            }
            return phone;
        }

        // Example usage
        let emergency_contact_lastname = "";
        let emergency_contact_firstname = "";
        const phone = formatPhoneNumber(inputData.phone);
        const mobilephone = formatPhoneNumber(inputData.mobilephone);
        const emergency_contact_home_phone = formatPhoneNumber(inputData.emergency_contact_home_phone);
        const workphone = formatPhoneNumber(inputData.workphone);

        // Function to format date to YYYY-MM-DD
        const formatDate = (dateStr) => {
            if (!dateStr) return undefined;

            // Check if the date is in ISO format (e.g., "1961-04-15T00:00:00Z")
            if (dateStr.includes("T")) {
                return dateStr.split("T")[0]; // Extract only "YYYY-MM-DD"
            }

            // Handle format like "MM/DD/YYYY"
            const [month, day, year] = dateStr.split("/");
            if (!month || !day || !year) return undefined; // Validate date parts

            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        };

        // Map marital status
        const maritalStatusMapping = {
            "M": "Married",
            "U": "Unmarried",
            "S": "Never Married"
        };
        const mappedMaritalStatus = maritalStatusMapping[inputData.patient_marital_status]; // Default to "Other"

        // Determine preferred contact ranking
        const determinePreferredContact = () => {
            if (inputData.nextech_preferred_contact === "home" && phone) return { system: "phone", value: phone, use: "home", rank: 1 };
            if (inputData.nextech_preferred_contact === "mobile" && mobilephone) return { system: "phone", value: mobilephone, use: "mobile", rank: 1 };
            if (inputData.nextech_preferred_contact === "sms") return { system: "sms", rank: 1 };
            if (inputData.nextech_preferred_contact === "email" && inputData.email) return { system: "email", value: inputData.email, rank: 1 };
            return null;
        };

        const preferredContact = determinePreferredContact();
        if(inputData.emergency_contact_name){
            const nameParts = inputData.emergency_contact_name.split(" ").filter(Boolean);
             emergency_contact_lastname = nameParts.length > 1 ? nameParts.pop() : "";
             emergency_contact_firstname = nameParts.join(" ");
        }
     

        // Construct patient data for Nextech
        const patientData = {
            resourceType: "Patient",

            // **Extensions (Additional Details)**
            extension: [
                // inputData.race && {
                //     url: "http://hl7.org/fhir/v3/Race",
                //     valueCodeableConcept: { 
                //         coding: [{ system: "http://hl7.org/fhir/v3/Race", code: inputData.race }]
                //     }
                // },
                // inputData.ethnicity && {
                //     url: "http://hl7.org/fhir/v3/Ethnicity",
                //     valueCodeableConcept: { 
                //         coding: [{ system: "http://hl7.org/fhir/v3/Ethnicity", code: inputData.ethnicity }]
                //     }
                // },
                inputData.referral_source && {
                    url: "https://select.nextech-api.com/api/structuredefinition/referral-source",
                    valueReference: { reference: inputData.referral_source }
                },
                inputData.referring_physician && {
                    url: "https://select.nextech-api.com/api/structuredefinition/referring-physician",
                    valueReference: { reference: inputData.referring_physician }
                },
                inputData.primary_care_physician && {
                    url: "https://select.nextech-api.com/api/structuredefinition/primary-care-physician",
                    valueReference: { reference: inputData.primary_care_physician }
                },
                inputData.referring_patient && {
                    url: "https://select.nextech-api.com/api/structuredefinition/referring-patient",
                    valueReference: { reference: `patient/${inputData.referring_patient}` }
                },
                // inputData.affiliate_physician && {
                //     url: "https://select.nextech-api.com/api/structuredefinition/affiliate-physician",
                //     valueReference: { reference: `affiliate-physician/${inputData.affiliate_physician}` }
                // },
                inputData.affiliate_physician_type && {
                    url: "https://select.nextech-api.com/api/structuredefinition/affiliate-physician-type",
                    valueString: inputData.affiliate_physician_type
                },
                inputData.patient_employment_status && {
                    url: "https://select.nextech-api.com/api/structuredefinition/patient-employment-status",
                    valueString: inputData.patient_employment_status
                },
                inputData.nextech_patient_type && {
                    url: "https://select.nextech-api.com/api/structuredefinition/patient-type",
                    valueReference: { reference: inputData.nextech_patient_type }
                },
                inputData.patient_status && {
                    url: "https://select.nextech-api.com/api/structuredefinition/patient-status",
                    valueString: inputData.patient_status
                },
                {
                    url: "https://select.nextech-api.com/api/structuredefinition/exclude-from-mailings",
                    valueBoolean: inputData.exclude_from_mailings === "true"
                },
                inputData.patient_note && {
                    url: "https://select.nextech-api.com/api/structuredefinition/patient-note",
                    valueString: inputData.patient_note
                }
            
            ].filter(Boolean),

            // **Name**
            name: [{
                family: inputData.lastname,
                use: "official",
                given: [inputData.firstname]
            }],

            // **Telecom (Contact Info)**
            telecom: [
                preferredContact,
                phone && { system: "phone", value: phone, use: "home" },
                mobilephone && { system: "phone", value: mobilephone, use: "mobile" },
                workphone && { system: "phone", value: workphone, use: "work" },
                inputData.email && { system: "email", value: inputData.email },
                inputData.fax && { system: "fax", value: inputData.fax }
            ].filter(Boolean),

            // **Gender & Birth Date**
            gender: inputData.patient_gender,
            birthDate: formatDate(inputData.dob),

            // **Address**
            address: [{
                use: "home",
                type: "both",
                line: [inputData.address],
                city: inputData.city,
                state: inputData.state,
                postalCode: inputData.zip,
                country: inputData.country
            }],

            // **Marital Status**
            maritalStatus: inputData.patient_marital_status ? {
                coding: [{ 
                    system: "http://hl7.org/fhir/ValueSet/marital-status", 
                    code: inputData.patient_marital_status
                }],
                text: mappedMaritalStatus
            } : undefined,

            // **Emergency Contact**
            contact: [
                inputData.emergency_contact_name && {
                    relationship: [{ coding: [{ system: "http://hl7.org/fhir/v2/0131", code: "C" }] }],
                    name: { 
                        text: inputData.emergency_contact_name,
                        family: emergency_contact_lastname || "",
                        given: [emergency_contact_firstname || ""]
                    },
                    telecom: [
                        emergency_contact_home_phone && { system: "phone", value: emergency_contact_home_phone, use: "home" }
                    ].filter(Boolean),
                    extension: inputData.emergency_contact_relation ? [{
                        url: "https://select.nextech-api.com/api/structuredefinition/emergency-contact-relation",
                        valueString: inputData.emergency_contact_relation
                    }] : []
                },

                // **Employer Info (For Patient Occupation & Company)**
                (inputData.jobtitle || inputData.company) && {
                    relationship: [{ coding: [{ system: "http://hl7.org/fhir/v2/0131", code: "E" }] }],
                    name: { text: "" }, // Employers typically don't have a single name entry
                    extension: [
                        inputData.jobtitle && {
                            url: "https://select.nextech-api.com/api/structuredefinition/patient-occupation",
                            valueString: inputData.jobtitle
                        },
                        inputData.company && {
                            url: "https://select.nextech-api.com/api/structuredefinition/patient-company",
                            valueString: inputData.company
                        }
                    ].filter(Boolean)
                }
            ].filter(Boolean),

            // **General Practitioner**
            generalPractitioner: inputData.general_practitioner ? { reference: `practitioner/${inputData.general_practitioner}` } : undefined,

            // **Communication Preferences**
            // communication: inputData.patient_communication ? [{
            //     language: { coding: [{ system: "BCP-47", code: inputData.patient_communication }] },
            //     preferred: true
            // }] : [],
        };

        // console.log("🚀 Nextech Patient Data:", JSON.stringify(patientData, null, 2));
        logData.creating_nextech_patient_formated_data = patientData;

        // **Send request to Nextech**
        const response = await fetch("https://select.nextech-api.com/api/Patient", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "nx-practice-id": "2441c8d4-dbf0-4517-a5e5-fe84c0ff4c50"
            },
            body: JSON.stringify(patientData)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Nextech API error: ${JSON.stringify(data)}`);
        }

        return { success: true, message: "Successfully created patient in Nextech", data: data };
    } catch (error) {
        // console.error("❌ Error creating patient in Nextech:", error.message);
        logData.successfully_created_patient_in_nextech = false;
        logData.creating_nextech_patient_response = error.message;
        
        return { success: false, message: "Failed to create patient in Nextech", error: error };
    }
}
// return createNextechPatient(inputData);




// Update Nextech Patient
exports.updateNextechPatient= async function (patientOfficialId, updateData) {
    try {
        logData.updateNextechPatient_function_start =true
        logData.updating_nextech_patient_official_id = patientOfficialId;
        logData.updating_nextech_patient_data = updateData;
        
        const token = await getNextechToken();

        // Ensure patient ID is provided
       if (!patientOfficialId && !updateData.patient_id) {
                throw new Error("Missing required fields: patientOfficialId and inputData.patient_id.");
            }

        const formatPhoneNumber = (phone) => {
            if (phone && phone.length > 0) {
                // Remove all non-digit characters (e.g., parentheses, dashes, spaces)
                const cleanedPhone = phone.replace(/\D/g, '');  // This will only keep digits
                
                // Return the last 10 digits, or the full phone number if it's less than 10 digits
                return cleanedPhone.length > 10 ? cleanedPhone.slice(-10) : cleanedPhone;
            }
            return phone;
        }

        // Example usage
        const phone = formatPhoneNumber(updateData.phone);
        const mobilephone = formatPhoneNumber(updateData.mobilephone);
        const emergency_contact_home_phone = formatPhoneNumber(updateData.emergency_contact_home_phone);
        // const workphone = formatPhoneNumber(updateData.workphone);


        // Function to format date to YYYY-MM-DD
        const formatDate = (dateStr) => {
            if (!dateStr) return undefined;
            if (dateStr.includes("T")) return dateStr.split("T")[0]; // Extract YYYY-MM-DD
            const [month, day, year] = dateStr.split("/");
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        };

        // Determine preferred contact ranking
        const determinePreferredContact = () => {
            if (updateData.nextech_preferred_contact === "home" && phone) 
                return { system: "phone", value: phone, use: "home", rank: 1 };
            if (updateData.nextech_preferred_contact === "mobile" && mobilephone) 
                return { system: "phone", value: mobilephone, use: "mobile", rank: 1 };
            if (updateData.nextech_preferred_contact === "sms") 
                return { system: "sms", rank: 1 };
            if (updateData.nextech_preferred_contact === "email" && updateData.email) 
                return { system: "email", value: updateData.email, rank: 1 };
            return null;
        };

        const preferredContact = determinePreferredContact();
        
        let emergency_contact_lastname = "";
        let emergency_contact_firstname = "";
        
        if (updateData.emergency_contact_name) {
            const nameParts = updateData.emergency_contact_name.split(" ").filter(Boolean);
            emergency_contact_lastname = nameParts.length > 1 ? nameParts.pop() : "";
            emergency_contact_firstname = nameParts.join(" ");
        }

        // Construct patient update data
        const patientUpdateData = {
            resourceType: "Patient",

            // **Patient Identifier** (Required for Update)
            identifier: [
                {
                    use: "official",
                    value: patientOfficialId
                },
                {
                     use: "usual",
                     value : updateData.patient_id
                }
            ],

            // **Telecom (Contact Info)**
            telecom: [
                preferredContact,
                phone && { system: "phone", value: phone, use: "home" },
                mobilephone && { system: "phone", value: mobilephone, use: "mobile" },
                // workphone && { system: "phone", value: workphone, use: "work" },
                updateData.email && { system: "email", value: updateData.email },
                updateData.fax && { system: "fax", value: updateData.fax }
            ].filter(Boolean),

            // **Address**
            address: updateData.zip ? [{
                use: "home",
                type: "both",
                line: [updateData.address],
                city: updateData.city,
                state: updateData.state,
                postalCode: updateData.zip,
                country: updateData.country
            }] : undefined,

            // **Extensions (Allowed Fields)**
            extension: [
                updateData.referral_source && {
                    url: "https://select.nextech-api.com/api/structuredefinition/referral-source",
                    valueReference: { reference: updateData.referral_source }
                },
                updateData.referring_physician && {
                    url: "https://select.nextech-api.com/api/structuredefinition/referring-physician",
                    valueReference: { reference: updateData.referring_physician }
                },
                updateData.primary_care_physician && {
                    url: "https://select.nextech-api.com/api/structuredefinition/primary-care-physician",
                    valueReference: { reference: updateData.primary_care_physician }
                },
                updateData.referring_patient && {
                    url: "https://select.nextech-api.com/api/structuredefinition/referring-patient",
                    valueReference: { reference: `patient/${updateData.referring_patient}` }
                },
                // updateData.affiliate_physician && {
                //     url: "https://select.nextech-api.com/api/structuredefinition/affiliate-physician",
                //     valueReference: { reference: `affiliate-physician/${updateData.affiliate_physician}` }
                // },
                updateData.affiliate_physician_type && {
                    url: "https://select.nextech-api.com/api/structuredefinition/affiliate-physician-type",
                    valueString: updateData.affiliate_physician_type
                },
                updateData.patient_employment_status && {
                    url: "https://select.nextech-api.com/api/structuredefinition/patient-employment-status",
                    valueString: updateData.patient_employment_status
                },
                updateData.nextech_patient_type && {
                    url: "https://select.nextech-api.com/api/structuredefinition/patient-type",
                    valueReference: { reference: updateData.nextech_patient_type }
                },
                updateData.patient_status && {
                    url: "https://select.nextech-api.com/api/structuredefinition/patient-status",
                    valueString: updateData.patient_status
                },
                {
                    url: "https://select.nextech-api.com/api/structuredefinition/exclude-from-mailings",
                    valueBoolean: updateData.exclude_from_mailings === "true"
                },
                updateData.patient_note && {
                    url: "https://select.nextech-api.com/api/structuredefinition/patient-note",
                    valueString: updateData.patient_note
                }
            
            ].filter(Boolean),

            // **Emergency Contact**
            contact: [
                updateData.emergency_contact_name && {
                    relationship: [{ coding: [{ system: "http://hl7.org/fhir/v2/0131", code: "C" }] }],
                    name: { 
                        text: updateData.emergency_contact_name,
                        family: emergency_contact_lastname || "",
                        given: [emergency_contact_firstname || ""]
                    },
                    telecom: [
                        emergency_contact_home_phone && { system: "phone", value: emergency_contact_home_phone, use: "home" }
                    ].filter(Boolean),
                    extension: updateData.emergency_contact_relation ? [{
                        url: "https://select.nextech-api.com/api/structuredefinition/emergency-contact-relation",
                        valueString: updateData.emergency_contact_relation
                    }] : []
                },

                // **Employer Info (For Patient Occupation & Company)**
                (updateData.jobtitle || updateData.company) && {
                    relationship: [{ coding: [{ system: "http://hl7.org/fhir/v2/0131", code: "E" }] }],
                    name: { text: "" }, // Employers typically don't have a single name entry
                    extension: [
                        updateData.jobtitle && {
                            url: "https://select.nextech-api.com/api/structuredefinition/patient-occupation",
                            valueString: updateData.jobtitle
                        },
                        updateData.company && {
                            url: "https://select.nextech-api.com/api/structuredefinition/patient-company",
                            valueString: updateData.company
                        }
                    ].filter(Boolean)
                }
            ].filter(Boolean)
        };

        // console.log("🚀 Updating Nextech Patient Data:", JSON.stringify(patientUpdateData, null, 2));

        // **Try sending as a POST request instead of PUT**
        const response = await fetch("https://select.nextech-api.com/api/Patient", {
            method: "PUT",  // ✅ Change PUT → POST
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "nx-practice-id": "2441c8d4-dbf0-4517-a5e5-fe84c0ff4c50"
            },
            body: JSON.stringify(patientUpdateData)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Nextech API error: ${JSON.stringify(data)}`);
        }
        logData.nextech_patient_update_response = data;
        logData.successfully_updated_patient_in_nextech = true;
     
        // console.log("successfully updated patient in Nextech");
        return { success: true, message: "Successfully updated patient in Nextech"};
    } catch (error) {
        // console.error("❌ Error updating patient in Nextech:", error.message);
      
        logData.successfully_updated_patient_in_nextech = false;
        logData.nextech_patient_update_response = error.message;
        return { success: false, message: "Failed to update patient in Nextech", error: error };
    }
}




// Function to format patient data
exports.formatPatientData=function(patient) {
    const fullName = patient.name?.find(n => n.use === "official")?.text || "";
    const nameParts = fullName.split(" ").filter(Boolean);
    const lastName = nameParts.length > 1 ? nameParts.pop() : ""; // Last part is last name
    const firstName = nameParts.join(" ");
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
        return emailRegex.test(email);
    }

    // Map allowed patient statuses to HubSpot options
    const allowedStatuses = {
        "Patient": "patient",
        "Prospect": "prospect",
        "Patient Prospect": "patientprospect"
    };

    const allowedMaritalStatuses = {
        "Married": "M",
        "Unmarried": "U",
        "Never Married": "S"
    };

    const allowedAffiliatePhysicianTypes = {
        "Preop": "preop",
        "Postop": "postop",
        "Pre And Postop": "preandpostop"
    }

    const allowedPatientEmploymentStatuses = {
        "Full Time": "full time",
        "Part Time": "part time",
        "Retired": "retired",
        "Full Time Student": "full time student",
        "Part Time Student": "part time student",
        "Other": "other"
    }
        
    return {
        patient_official_id: patient.id,
        // lastUpdated: patient.meta?.lastUpdated || null,
        
        // Patient Status
        patient_status: allowedStatuses[patient.extension?.find(ext => ext.url.includes("patient-status"))?.valueString] || "patient",
        // exclude_from_mailings: patient.extension?.find(ext => ext.url.includes("exclude-from-mailings"))?.valueBoolean || false,
        exclude_from_mailings: patient.extension?.find(ext => ext.url.includes("exclude-from-mailings"))?.valueBoolean ? "true" : "false",
        prospects_referred: patient.extension?.find(ext => ext.url.includes("prospects-referred"))?.valueInteger || 0,
        patients_referred: patient.extension?.find(ext => ext.url.includes("patients-referred"))?.valueInteger || 0,
        referral_source: patient.extension?.find(ext => ext.url.includes("referral-source"))?.valueReference?.reference || "",
        referring_physician: patient.extension?.find(ext => ext.url.includes("referring-physician"))?.valueReference?.reference || "",
        primary_care_physician: patient.extension?.find(ext => ext.url.includes("primary-care-physician"))?.valueReference?.reference || "",
        referring_patient: patient.extension?.find(ext => ext.url.includes("referring-patient"))?.valueReference?.reference || "",
        affiliate_physician: patient.extension?.find(ext => ext.url.includes("affiliate-physician"))?.valueReference?.display || "",
        affiliate_physician_type: allowedAffiliatePhysicianTypes[patient.extension?.find(ext => ext.url.includes("affiliate-physician-type"))?.valueString]|| "",
        patient_employment_status: allowedPatientEmploymentStatuses[patient.extension?.find(ext => ext.url.includes("patient-employment-status"))?.valueString] || "",
        nextech_patient_type: patient.extension?.find(ext => ext.url.includes("patient-type"))?.valueReference?.reference || "",
        patient_note: patient.extension?.find(ext => ext.url.includes("patient-note"))?.valueString || "",
        // patientLocation: patient.extension?.find(ext => ext.url.includes("patient-location"))?.valueReference?.display || " ",
        
        // Ethnicity & Race
        ethnicity: patient.extension?.find(ext => ext.url.includes("Ethnicity"))?.valueCodeableConcept?.text || "",
        // race: patient.extension?.find(ext => ext.url.includes("Race"))?.valueCodeableConcept?.text || " ",

        // Identifiers
        // patient_official_id: patient.identifier?.find(id => id.use === "official")?.value || " ",
        patient_id: patient.identifier?.find(id => id.use === "usual")?.value || "",
        // identifierSSN: patient.identifier?.find(id => id.system === "http://hl7.org/fhir/sid/us-ssn")?.value || " ",

        // Names
        firstname: firstName,
        lastname: lastName,
        // nickname: patient.name?.find(n => n.use === "nickname")?.text || " ",
        patient_gender: patient.gender || "",
        dob: patient.birthDate || "",
        patient_marital_status: allowedMaritalStatuses[patient.maritalStatus?.text] || "",
        nextech_preferred_contact: (() => {
            const preferred = patient.telecom?.find(t => t.rank === 1);
            if (preferred) {
                if (preferred.system === "phone") {
                    return preferred.use === "home" ? "home"
                        : preferred.use === "mobile" ? "mobile"
                        : preferred.use === "work" ? "work"
                        : "phone"; // Default to "phone" if use is missing
                }
                return preferred.system; // Return email, sms, etc.
            }
            return "";
        })(),

        // privacySettings: patient.telecom?.some(t => t.extension?.find(ext => ext.url.includes("method-privacy"))?.valueBoolean) || false,

        // Contact Information
        phone: patient.telecom?.find(t => t.system === "phone" && t.use === "home")?.value || "",
        // workPhone: patient.telecom?.find(t => t.system === "phone" && t.use === "work")?.value || " ",
        mobilephone: patient.telecom?.find(t => t.system === "phone" && t.use === "mobile")?.value || "",
        // otherPhone: patient.telecom?.find(t => t.system === "other")?.value || " ",
        fax: patient.telecom?.find(t => t.system === "fax")?.value || "",
        email: isValidEmail(patient.telecom?.find(t => t.system === "email")?.value) 
        ? patient.telecom?.find(t => t.system === "email")?.value 
        : null,
        // Address
        // addressType: patient.address?.[0]?.type || " ",
        // addressUse: patient.address?.[0]?.use || " ",
        address: patient.address?.[0]?.line?.[0] || "",
        city: patient.address?.[0]?.city || "",
        state: patient.address?.[0]?.state || "",
        zip: patient.address?.[0]?.postalCode || "",
        country: patient.address?.[0]?.country || "",

        // Emergency Contact
        emergency_contact_name: patient.contact?.[0]?.name?.text || "",
        emergency_contact_relation: patient.contact?.[0]?.extension?.find(ext => ext.url.includes("emergency-contact-relation"))?.valueString || "",
        emergency_contact_home_phone: patient.contact?.[0]?.telecom?.find(t => t.system === "phone" && t.use === "home")?.value || "",
        // emergencyContactWorkPhone: patient.contact?.[0]?.telecom?.find(t => t.system === "phone" && t.use === "work")?.value || " ",
        // emergencyContactMobilePhone: patient.contact?.[0]?.telecom?.find(t => t.system === "phone" && t.use === "mobile")?.value || " ",
        emergency_contact_email: patient.contact?.[0]?.telecom?.find(t => t.system === "email")?.value || "",

        // Occupation Details
        jobtitle: patient.contact?.[0]?.extension?.find(ext => ext.url.includes("patient-occupation"))?.valueString || "",
        company: patient.contact?.[0]?.extension?.find(ext => ext.url.includes("patient-company"))?.valueString || "",
        // patientOccupationCode: patient.contact?.[0]?.extension?.find(ext => ext.url.includes("patient-occupation-code"))?.valueString || " ",
        // patientIndustryCode: patient.contact?.[0]?.extension?.find(ext => ext.url.includes("patient-industry-code"))?.valueString || " ",
        

        general_practitioner: patient.generalPractitioner?.[0]?.reference || "",
        patient_communication: patient.communication?.[0]?.language?.text || "",
    };
}


// **Main function for Zapier**
exports.fetchSinglePatient=async function (inputData) {
    logData.fetchSinglePatient_function_start = true;
    if (!inputData.email) {
        throw new Error("Missing required field: email.");
    }

    const token = await getNextechToken();
    const patientUrl = `https://select.nextech-api.com/api/Patient?email=${inputData.email}`;

    try {
        const response = await fetch(patientUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
                "nx-practice-id": "2441c8d4-dbf0-4517-a5e5-fe84c0ff4c50"
            }
        });

        if (!response.ok) {
            throw new Error(`Error fetching patient: ${await response.text()}`);
        }

        const patientData = await response.json();
        const formattedPatient = formatPatientData(patientData.entry[0].resource);

        // console.log("✅ Successfully fetched patient:", formattedPatient);
        logData.successfully_fetched_single_patient = formattedPatient;

        return {
            success: true,
            message: "Patient fetched successfully",
            patient: formattedPatient
        };
    } catch (error) {
        // console.error("❌ Error fetching patient:", error);
        logData.successfully_fetched_single_patient = false;
        logData.fetch_single_patient_error = error.message;
        return {
            success: false,
            message: "Failed to fetch patient",
            error: error.message
        };
    }
}


exports.fetchUpdatedPatients=async function (lastSyncTime, lastOffset, remainingLimit) {
    console.log(`🕒 Last Sync Time: ${lastSyncTime}, 📌 Last Offset: ${lastOffset}, 🔄 Remaining API Calls: ${remainingLimit}`);
    
    const token = await getNextechToken();
    let nextUrl = `${NEXTECH_API_URL}?_lastUpdated=gt${lastSyncTime}&_count=10&_getpagesoffset=${lastOffset}`;
    let allPatients = [];

    try {
        while (nextUrl && remainingLimit > 0) {
            const response = await fetch(nextUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "nx-practice-id": "2441c8d4-dbf0-4517-a5e5-fe84c0ff4c50"
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching patients: ${await response.text()}`);
            }

            const data = await response.json();
            if (data.entry) {
                allPatients.push(...data.entry.map(entry => entry.resource));
            }

            console.log(`📄 Page fetched: ${allPatients.length} patients so far.`);

            // Get next page link
            const nextPageLink = data.link?.find(link => link.relation === 'next');
            if (nextPageLink) {
                nextUrl = nextPageLink.url;
                lastOffset += 10;
            } else {
                nextUrl = null;
            }

            // Reduce API call limit
            remainingLimit -= 1;

            if (remainingLimit <= 0) {
                console.log("⚠️ Reached daily request limit for Nextech. Stopping polling.");
                break;
            }
        }

    } catch (error) {
        console.error("❌ Error fetching patients from Nextech:", error);
        return { patients: [], lastSyncTime, lastOffset, remainingLimit };
    }

    return { patients: allPatients, lastSyncTime: new Date().toISOString(), lastOffset, remainingLimit };
}


