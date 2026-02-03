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

// Cookie utilities with iOS compatibility
export function getCookie(name: string): string | null {
	if (typeof document === 'undefined') return null;

	try {
		const value = `; ${document.cookie}`;
		const parts = value.split(`; ${name}=`);
		if (parts.length === 2) {
			const cookieValue = parts.pop()?.split(';').shift() || null;
			// Decode URI component to handle Vietnamese text
			return cookieValue ? decodeURIComponent(cookieValue) : null;
		}
		return null;
	} catch (error) {
		console.warn('Error reading cookie:', error);
		return null;
	}
}

export function setCookie(name: string, value: string, days: number = 30): void {
	if (typeof document === 'undefined') return;

	try {
		const expires = new Date();
		expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
		document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
	} catch (error) {
		console.warn('Error setting cookie:', error);
	}
}

export function deleteCookie(name: string): void {
	if (typeof document === 'undefined') return;

	try {
		document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
	} catch (error) {
		console.warn('Error deleting cookie:', error);
	}
}

export const formatNumberInput = (value: number | '' | null | undefined): string => {
	if (value === '' || value === null || value === undefined) return '';
	if (typeof value !== 'number') return '';
	
	// Tách phần nguyên và phần thập phân
	const parts = value.toString().split('.');
	const integerPart = parts[0];
	const decimalPart = parts[1];
	
	// Format phần nguyên với dấu phẩy ngăn cách hàng nghìn
	const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	
	// Nếu có phần thập phân thì giữ lại với dấu chấm
	return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

export const parseNumberInput = (input: string): number | '' => {
	if (!input) return '';
	
	// Bỏ tất cả dấu phẩy (hàng nghìn), giữ lại dấu chấm (thập phân)
	const cleaned = input.replace(/,/g, '');
	
	if (!cleaned || cleaned === '.') return '';
	
	const num = Number(cleaned);
	return Number.isNaN(num) ? '' : num;
};

export const printHtmlContent = (html: string): void => {
	const iframe = document.createElement('iframe');
	iframe.style.position = 'fixed';
	iframe.style.right = '0';
	iframe.style.bottom = '0';
	iframe.style.width = '0';
	iframe.style.height = '0';
	iframe.style.border = '0';
	document.body.appendChild(iframe);

	const win = iframe.contentWindow;
	if (!win) return;
	win.document.open();
	win.document.write(html);
	win.document.close();

	iframe.onload = () => {
		win.focus();
		win.print();

		setTimeout(() => {
			document.body.removeChild(iframe);
		}, 1000);
	};
};
