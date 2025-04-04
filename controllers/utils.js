function extractIdentifiers(inputData) {
    const identifiers = inputData.identifier.split(",");
    
    return {
        official_id: identifiers[0] || "", // First value as official ID
        id: identifiers[1] || "" // Second value as ID
    };
}

// Main function that Zapier executes
return extractIdentifiers(inputData);