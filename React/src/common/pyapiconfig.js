// Production URL - Reads from .env and ensures no trailing slash
//const rawUrl = process.env.REACT_APP_PYTHON_API_URL;
const rawUrl = "http://127.0.0.1:8000";

if (!rawUrl) {
    throw new Error("REACT_APP_PYTHON_API_URL is not defined in .env file");
}

export const PYTHON_API_URL = rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;