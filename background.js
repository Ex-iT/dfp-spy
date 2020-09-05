'use strict';

let spy = true; // @TODO off by default
updateBrowserAction();

const spyUrls = ['*://*.doubleclick.net/gampad/ads*'];

// Handle icon click
chrome.browserAction.onClicked.addListener(tab => {
	spy = !spy;
	updateBrowserAction();
	chrome.tabs.update(tab.id, { url: tab.url, selected: tab.selected }, null);
});

function updateBrowserAction() {
	chrome.browserAction.setTitle({
		title: spy ? 'DFP Spy: ON' : 'DFP Spy: OFF'
	});

	chrome.browserAction.setBadgeText({
		text: spy ? 'ON' : ''
	});
}

// onCompleted listener
chrome.webRequest.onCompleted.addListener(details => handleRequest(details, true), { urls: spyUrls });

// onErrorOccurred listener
chrome.webRequest.onErrorOccurred.addListener(details => handleRequest(details, false), { urls: spyUrls });

// Handle requests and output
function handleRequest(details, success) {
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
				console.group(${banner});
				${getInterestingSettings(settings)}
				${getAllSettings(settings)}
				console.groupEnd(${banner});
			`
		});
	}
}

function getInterestingSettings(settings) {
	const groupLabel = 'Interesting DFP Settings';
	let code = `console.group('${groupLabel}');`;

	// @TODO: make sense of these values
	// iu_parts: 112233044,Dummy_CorpNL
	// prev_iu_szs: 970x250|970x90|728x90,336x280|300x250,728x200|728x90,336x280|300x250,336x280|300x250,728x200|728x90,336x280|300x250,120x600|160x600
	// prev_scp: pos=billboard|pos=rectangle_top|pos=leaderboard_mobile_double_listing|pos=rectangle_bottom|pos=rectangle_top|pos=leaderboard_mobile_double_listing|pos=rectangle_bottom|pos=skyscraper
	// cust_params: Supercategory=computers&maincategory=laptops_en_ultrabooks&productgroup=laptop&country=BP

	Object.keys(settings).forEach(key => {
		if (key === 'url') {
			code += `console.info('%c${key}%c: ${settings[key]}', 'font-weight: bold;', 'font-weight: normal;');`;
		}
	});

	code += `console.groupEnd('${groupLabel}');`;

	return code;
}

function getAllSettings(settings) {
	const groupLabelAll = 'All DFP Settings';
	let code = `console.groupCollapsed('${groupLabelAll}');`;

	Object.keys(settings).forEach(key => {
		code += `console.info('%c${key}%c: ${settings[key]}', 'font-weight: bold;', 'font-weight: normal;');`;
	});

	code += `console.groupEnd('${groupLabelAll}');`;

	return code;
}
