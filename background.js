'use strict';

const spyUrls = ['*://*.doubleclick.net/gampad/ads*'];

let spy = true; // @TODO off by default
let tabId = null;
const webRequest = chrome.webRequest;
updateBrowserAction();

// Handle icon click
chrome.browserAction.onClicked.addListener(tab => {
	spy = !spy;
	tabId = tab.id;
	updateBrowserAction();
	chrome.tabs.update(tab.id, { url: tab.url, selected: tab.selected }, null);
	webRequest && webRequest.handlerBehaviorChanged();
});

// onCompleted listener
webRequest && webRequest.onCompleted.addListener(details => handleRequest(details, true), { urls: spyUrls });

// onErrorOccurred listener
webRequest && webRequest.onErrorOccurred.addListener(details => handleRequest(details, false), { urls: spyUrls });

function updateBrowserAction() {
	chrome.browserAction.setTitle({
		title: spy ? 'DFP Spy: ON' : 'DFP Spy: OFF'
	});

	chrome.browserAction.setBadgeText({
		text: spy ? 'ON' : ''
	});
}

// Handle requests and output
function handleRequest(details, success) {
	// if (spy && details.tabId === tabId) { // @TODO: does this fix 'Cannot access a chrome:// URL'?
	if (spy) {
		const url = new URL(details.url);
		const banner = success
			? `'%cDFP Spy - Request send', 'font-weight: bold;'`
			: `'%cDFP Spy - Request failed', 'font-weight: bold; color: red;'`

		const settings = {};
		for (const [key, value] of url.searchParams.entries()) {
			settings[key] = value;
		}

		chrome.tabs.executeScript({
			code: `
				${createLogGroup(banner,
					getInterestingSettings(settings)
					+ getAllSettings(settings)
				)}
			`
		});
	}
}

function createLogGroup(label, content) {
	return `
		console.group(${label});
		${content}
		console.groupEnd(${label});
	`;
}

function getInterestingSettings(settings) {
	const groupLabel = 'Interesting DFP Settings';
	let code = `console.group('${groupLabel}');`;

	Object.keys(settings).forEach(key => {
		switch (key) {
			case 'iu_parts':
				const label = 'iu_parts';
				const values = settings[key].split(',');
				const dfpNetworkId = values[0];
				const adUnit = values.slice(1).join('\n\t');

				// @TODO: use 'createLogGroup' here
				code += `console.group('${label}');`;
				code += `console.info('%cdfpNetworkId: %c${dfpNetworkId}', 'font-weight: bold;', 'font-weight: normal;');`;
				code += `console.info(\`%cadUnit: %c${adUnit}\`, 'font-weight: bold;', 'font-weight: normal;');`;
				code += `console.groupEnd('${label}');`;
				break;
			case 'cust_params':
				// cust_params: Supercategory=computers&maincategory=laptops_en_ultrabooks&productgroup=laptop&country=BP
				// cust_params: page_section=xml
				break;
			case 'prev_scp':
				// prev_scp: pos=billboard|pos=rectangle_top|pos=leaderboard_mobile_double_listing|pos=rectangle_bottom|pos=rectangle_top|pos=leaderboard_mobile_double_listing|pos=rectangle_bottom|pos=skyscraper
				// prev_scp: amz_tam=true&_ia=0.00&_snhb=true&_snhb-aurc=0&consent_applies=eea&consent_value=full&hb_format=banner&hb_source=client&hb_size=160x600&hb_pb=0.06&hb_adid=605db2fa644141d&hb_bidder=openx|amz_tam=true&_ia=0.00&_snhb=true&_snhb-aurc=0&consent_applies=eea&consent_value=full
				break;
			case 'prev_iu_szs':
				// prev_iu_szs: 970x250|970x90|728x90,336x280|300x250,728x200|728x90,336x280|300x250,336x280|300x250,728x200|728x90,336x280|300x250,120x600|160x600
				break;
			case 'url':
				code += `console.info('%c${key}: %c${settings[key]}', 'font-weight: bold;', 'font-weight: normal;');`;
				break;
		}
	});

	code += `console.groupEnd('${groupLabel}');`;

	return code;
}

function getAllSettings(settings) {
	const groupLabelAll = 'All DFP Settings';
	let code = `console.groupCollapsed('${groupLabelAll}');`;

	Object.keys(settings).forEach(key => {
		code += `console.info('%c${key}: %c${settings[key]}', 'font-weight: bold;', 'font-weight: normal;');`;
	});

	code += `console.groupEnd('${groupLabelAll}');`;

	return code;
}
