const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

export async function fetchClient(endpoint, options) {
    const headers = new Headers(options.headers);

    if (!(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    try {
        const formattedEndpoint = endpoint.startsWith("/")
            ? endpoint
            : `/${endpoint}`;

        const response = await fetch(`${baseUrl}${formattedEndpoint}`, {
            ...options,
            headers,
        });

        const contentType = response.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) {
            console.error(
                `API Returned Non-JSON Content (${response.status}):`,
                `${baseUrl}${formattedEndpoint}`,
            );

            return {
                error: true,
                message: `Server returned non-JSON response (${response.status})`,
            };
        }

        const resp = await response.json();

        if (!response.ok) {
            console.error("API HTTP Error:", resp);

            return {
                error: true,
                message: resp.message ?? "Something went wrong",
            };
        }

        return {
            error: false,
            data: resp,
        };
    } catch (error) {
        console.error("Fetch Error:", error);

        return {
            error: true,
            message: error instanceof Error ? error.message : "Network error",
        };
    }
}
