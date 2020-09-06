'use strict';

const spyUrls = ['*://*.doubleclick.net/gampad/ads*'];

let spy = false;
const webRequest = chrome.webRequest;
updateBrowserAction();

// Handle icon click
chrome.browserAction.onClicked.addListener(tab => {
	spy = !spy;
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
	if (spy) {
		const url = new URL(details.url);
		const settings = {};
		for (const [key, value] of url.searchParams.entries()) {
			settings[key] = value;
		}

		const requestUrl = settings.url || '';
		const banner = success
			? `'%cDFP Spy - Request send (${requestUrl})', 'font-weight: bold;'`
			: `'%cDFP Spy - Request failed (${requestUrl})', 'font-weight: bold; color: red;'`

		chrome.tabs.executeScript(details.tabId, {
			code: `
				${createLogGroup(banner,
				getError(details, success)
				+ getInterestingSettings(settings, success)
				+ getAllSettings(settings)
			)}`
		}, event => {
			const lastError = chrome.runtime.lastError;
			if (lastError !== undefined) {
				console.log({ tabId: details.tabId, event, lastError });
			}
		});
	}
}

function getInterestingSettings(settings, success) {
	let code = '';

	Object.keys(settings).forEach(key => {
		switch (key) {
			case 'iu_parts':
				const values = settings[key].split(',');
				const dfpNetworkId = values[0];
				const adUnit = values.slice(1).join('\n\t');

				code += `
					${createLogGroup(`'${key} - Ad path elements'`,
					`console.info('%cdfpNetworkId: %c${dfpNetworkId}', 'font-weight: bold;', 'font-weight: normal;');
					console.info(\`%cadUnit: %c${adUnit}\`, 'font-weight: bold;', 'font-weight: normal;');`,
					true
				)}`;

				break;
			case 'prev_iu_szs':
				const sizes = settings[key].replace(/,/g, ', ').split('|').join('\n');

				code += `
					${createLogGroup(`'${key} - Ad slot sizes'`,
					`console.info(\`${sizes}\`);`,
					true
				)}`;

				break;
			case 'prev_scp':
				let targetContent = '';
				const groups = settings[key].split('|').filter(group => group);

				groups.forEach((group, index) => {
					for (const [key, value] of new URLSearchParams(group).entries()) {
						targetContent += `console.info('%c${key}: %c${value}', 'font-weight: bold;', 'font-weight: normal;');`;
					}
					if (index !== groups.length - 1) {
						targetContent += `console.info(\`\n\`);`;
					}
				});

				code += `
					${createLogGroup(`'${key} - Slot specific targeting parameters'`,
					`${targetContent}`,
					true
				)}`;

				break;
			case 'cust_params':
				const custParams = new URLSearchParams(settings[key]);
				let custContent = '';

				for (const [key, value] of custParams.entries()) {
					custContent += `console.info('%c${key}: %c${value}', 'font-weight: bold;', 'font-weight: normal;');`;
				}

				code += `
					${createLogGroup(`'${key} - Global targeting parameters'`,
					`${custContent}`,
					!success
				)}`;

				break;
			case 'biw':
				// Assuming 'bih' is set if we have 'biw'
				code += `
					${createLogGroup(`'Browser width / height'`,
					`console.info(\`${settings['biw']}x${settings['bih']}\`);`,
					true
				)}`;

				break;
		}
	});

	return code;
}

function getAllSettings(settings) {
	const groupLabelAll = 'All parameters';
	let code = `console.groupCollapsed('${groupLabelAll}');`;

	Object.keys(settings).forEach(key => {
		code += `console.info('%c${key}: %c${settings[key]}', 'font-weight: bold;', 'font-weight: normal;');`;
	});

	code += `console.groupEnd('${groupLabelAll}');`;

	return code;
}

function getError(details, success) {
	let errorDetails = '';

	if (!success) {
		let errorPairs = '';
		Object.keys(details).forEach(key => {
			errorPairs += `console.info('%c${key}: %c${details[key]}', 'font-weight: bold;', 'font-weight: normal;');`;
		});
		errorDetails += `${createLogGroup(`'Error details'`, `${errorPairs}`)}`;
	}

	return errorDetails;
}

function createLogGroup(label, content, collapsed = false) {
	return `
		console[${collapsed ? '\'groupCollapsed\'' : '\'group\''}](${label});
		${content}
		console.groupEnd(${label});
	`;
}
