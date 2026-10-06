const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error('Falta EXPO_PUBLIC_API_URL en .env — debe apuntar al servidor de apps/api.');
}

export const API_URL: string = apiUrl;
