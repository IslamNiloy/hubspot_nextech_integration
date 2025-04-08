require("dotenv").config();
exports.getNextechToken= async function() {
    const bodyData = new URLSearchParams();
    bodyData.append("grant_type", "password");
    bodyData.append("client_id", process.env.NEXTECH_CLIENT_ID);
    bodyData.append("username", process.env.NEXTECH_USERNAME);
    bodyData.append("password", process.env.NEXTECH_PASSWORD);
    bodyData.append("resource", process.env.NEXTECH_RESOURCE);

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