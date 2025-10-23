export function urlB64ToUint8Array(base64String: string): Uint8Array {
	if (!base64String) {
		throw new Error('Base64 string is required but was undefined or empty');
	}
	
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding)
		.replace(/\-/g, "+")
		.replace(/_/g, "/");
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

// Cookie utilities
export function getCookie(name: string): string | null {
	if (typeof document === 'undefined') return null;
	
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) {
		const cookieValue = parts.pop()?.split(';').shift() || null;
		// Decode URI component to handle Vietnamese text
		return cookieValue ? decodeURIComponent(cookieValue) : null;
	}
	return null;
}

export function setCookie(name: string, value: string, days: number = 30): void {
	if (typeof document === 'undefined') return;
	
	const expires = new Date();
	expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
	document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

export function deleteCookie(name: string): void {
	if (typeof document === 'undefined') return;
	
	document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}