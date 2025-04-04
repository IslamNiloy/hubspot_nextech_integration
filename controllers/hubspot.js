
// Check Repeated Trigger
async function checkHubSpotUpdate(contactId) {
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

// ✅ Required for Zapier
// return  await checkHubSpotUpdate(inputData.contactId);



