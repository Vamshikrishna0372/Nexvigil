import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error));

    try {
        await page.goto('http://localhost:8080/dashboard/analytics', { waitUntil: 'networkidle2' });
        console.log("Navigation complete.");
    } catch (err) {
        console.error("Navigation error:", err);
    }

    await browser.close();
})();
