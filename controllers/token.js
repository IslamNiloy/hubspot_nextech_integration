async function getNextechToken() {
    const bodyData = new URLSearchParams();
    bodyData.append("grant_type", "password");
    bodyData.append("client_id", "e8f83b98-c06c-4170-b24b-5cc1a407ebd5");
    bodyData.append("username", "48cf740f-348d-49e6-a60b-dc4fea452160@nextech-api.com");
    bodyData.append("password", ".kAU_+^'73GMcA9");
    bodyData.append("resource", "https://select.nextech-api.com/api");

    try {
        const response = await fetch("https://login.microsoftonline.com/a5f8392a-a68f-4d74-a353-aefc87f29848/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: bodyData.toString() // 🔥 Ensure proper formatting
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Failed to fetch token: ${data.error_description || JSON.stringify(data)}`);
        }

        return data.access_token;
    } catch (error) {
        console.error("❌ Error fetching token:", error.message);
        throw new Error(error.message);
    }
}