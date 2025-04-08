require('dotenv').config();
// Create Patient in Nextech
const { getNextechToken } = require("./token");
exports.createNextechPatient= async function(inputData) {
    try {
        // Fetch Nextech token
        console.log(inputData)
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

        console.log("🚀 Nextech Patient Data:", JSON.stringify(patientData, null, 2));

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

        return { success: true, message: "Successfully created patient in Nextech" };
    } catch (error) {
        console.error("❌ Error creating patient in Nextech:", error.message);
        return { success: false, message: "Failed to create patient in Nextech", error: error };
    }
}
// return createNextechPatient(inputData);



// Update Nextech Patient
exports.updateNextechPatient= async function (patientOfficialId, updateData) {
    try {
        // Fetch Nextech token
        console.log(updateData);
        console.log(patientOfficialId);
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
                     value : inputData.patient_id
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
        console.log("successfully updated patient in Nextech");
        return { success: true, message: "Successfully updated patient in Nextech"};
    } catch (error) {
        console.error("❌ Error updating patient in Nextech:", error.message);
        return { success: false, message: "Failed to update patient in Nextech", error: error };
    }
}

// exports.createNextechPatient = createNextechPatient;
// return updateNextechPatient(inputData.patient_official_id, inputData);