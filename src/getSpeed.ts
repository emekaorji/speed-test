'use strict';
// import { isDeepStrictEqual } from 'node:util';

import delay from 'delay';
import locateChrome from 'locate-chrome';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer';
import Observable from 'zen-observable';

export interface Result {
	downloadSpeed: number;
	uploadSpeed: number;
	downloadUnit: string | undefined;
	downloaded: number;
	uploadUnit: string | undefined;
	uploaded: number;
	latency: number;
	bufferBloat: number;
	userLocation: string | undefined;
	userIp: string | undefined;
	isDone: boolean;
}

async function init(
	browser: Browser,
	page: Page,
	observer: ZenObservable.SubscriptionObserver<Result>,
) {
	while (true) {
		// eslint-disable-next-line no-await-in-loop
		const result: Result = await page.evaluate(() => {
			const $ = document.querySelector.bind(document);

			return {
				downloadSpeed: Number($('#speed-value')?.textContent),
				uploadSpeed: Number($('#upload-value')?.textContent),
				downloadUnit: $('#speed-units')?.textContent?.trim(),
				downloaded: Number($('#down-mb-value')?.textContent?.trim()),
				uploadUnit: $('#upload-units')?.textContent?.trim(),
				uploaded: Number($('#up-mb-value')?.textContent?.trim()),
				latency: Number($('#latency-value')?.textContent?.trim()),
				bufferBloat: Number($('#bufferbloat-value')?.textContent?.trim()),
				userLocation: $('#user-location')?.textContent?.trim(),
				userIp: $('#user-ip')?.textContent?.trim(),
				isDone: Boolean($('#speed-value.succeeded') && $('#upload-value.succeeded')),
			};
		});

		observer.next(result);

		if (result.isDone) {
			browser.close();
			observer.complete();
			return;
		}

		// eslint-disable-next-line no-await-in-loop
		await delay(100);
	}
}

export const getSpeed = () =>
	new Observable<Result>((observer) => {
		// Wrapped in async IIFE as `new Observable` can't handle async function
		(async () => {
			const chromePath = await locateChrome();
			console.log(chromePath);
			const browser = await puppeteer.launch({
				args: ['--no-sandbox'],
				executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
				headless: true,
			});
			const page = await browser.newPage();
			await page.goto('https://fast.com');
			await init(browser, page, observer);
		})().catch(observer.error.bind(observer));
	});
