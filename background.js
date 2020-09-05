'use strict';

chrome.runtime.onInstalled.addListener(() => {
	console.log('[DEBUG] DFP Spy installed');
});


// onCompleted
chrome.webRequest.onCompleted.addListener(details => {
		const json = JSON.stringify(details);
		chrome.tabs.executeScript({
			code: `console.log('%c${json}', 'font-weight: bold;')`
		});

		return { cancel: true };
	},
	{
		urls: [
			// '*://*.w3schools.com/*', // XHR test url: https://www.w3schools.com/xml/xml_http.asp
			'*://*.doubleclick.net/gampad/ads*'
		]
	},
	[]);


// onErrorOccurred
// @TODO: Handle error
