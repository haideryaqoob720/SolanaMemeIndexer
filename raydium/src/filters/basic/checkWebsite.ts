import puppeteer from "puppeteer";
export async function checkWebsite(
  socials: string[],
  name: string,
  symbol: string
) {
  let isWebsiteVaild = false;
  await Promise.all(
    socials.map(async (link: string) => {
      if (link.startsWith("https://www.")) {
        let browser;
        try {
          browser = await puppeteer.launch({ headless: true });
          const page = await browser.newPage();
          // Navigate to the website
          await page.goto(link, { waitUntil: "networkidle2" });

          // Extract the body content
          const bodyContent = await page.evaluate(() => {
            return document.body.innerText.toLowerCase(); // Convert to lowercase for case-insensitive search
          });

          const normalizedData = name.toLowerCase();
          const normalizedSymbol = symbol.toLowerCase();

          const includesName = bodyContent.includes(normalizedData);
          const includesSymbol = bodyContent.includes(normalizedSymbol);
          console.log(link, "link");
          console.log(includesName, includesSymbol, "website includes");
          isWebsiteVaild = includesName || includesSymbol;
          return includesName || includesSymbol;
        } catch (error: any) {
          console.error("Error scraping website:", error);
          return false;
        } finally {
          if (browser) {
            await browser.close();
          }
        }
      }
    })
  );
  return isWebsiteVaild;
}
