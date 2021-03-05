import * as puppeteer from "puppeteer";

import { IRating } from "./interfaces";

require("dotenv").config();

export const scrapeRecents = async (startPage: number, endPage: number) => {
  const finalArr = [];
  // open the headless browser
  const browser = await puppeteer.launch({ headless: false });

  for (let i = startPage; i <= endPage; i++) {
    try {
      const newPage = await browser.newPage();
      // await newPage.goto(`${process.env.TEST_URL}`);
      await newPage.goto(`${process.env.RYM_URL}/${i}`);
      await newPage.waitForSelector(".footer_inner");
      // newPage.on("console", (consoleObj) => console.log(consoleObj.text()));

      // simple function to artifically add a delay between loop iterations
      function delay(time: number): Promise<void> {
        return new Promise(function (resolve) {
          setTimeout(resolve, time);
        });
      }

      console.log(`waiting before page ${i}…`);
      await delay(6000);
      console.log(`beginning page ${i}`);

      const pageData = await newPage.evaluate(() => {
        const rows = document.querySelectorAll(".mbgen tr:not(:nth-child(1))");
        const rowsArr = Array.from(rows);

        const getScore = (string: string) => {
          const numbersOnly = string.replace(/[^0-9]/g, "");
          // const numbersOnly = "2";
          const baseNum = parseInt(numbersOnly.substring(0, 2).trimEnd());
          return baseNum / 5;
        };

        const rowToObj = (row: HTMLTableRowElement) => {
          let obj: IRating = {} as any;

          const dateAddedCol = row.querySelector(".or_q_rating_date_d");
          const ratingCol = row.querySelector(".or_q_rating_date_s");
          const mainCol: HTMLElement = row.querySelector(
            ".or_q_albumartist_td"
          );

          // see if it's a track review row; if so, just return
          const trackReviewCol = row.querySelector(".or_q_review_td");
          if (trackReviewCol || !ratingCol || !mainCol || !dateAddedCol) {
            return;
          }

          // tagcloud houses the album ID
          const tagCloud = row.querySelector(".or_q_tagcloud");
          const id = parseInt(
            tagCloud.getAttribute("id").replace(/[^0-9]/g, "")
          );
          const artistLinks = mainCol.querySelectorAll(".artist");
          const artistLinksArr = Array.from(artistLinks);
          const artistIdsArr = artistLinksArr.map((link) => {
            if (link.getAttribute("title")) {
              return parseInt(
                link.getAttribute("title").replace(/[^0-9]/g, "")
              );
            } else {
              return 0;
            }
          });
          const artistNamesArr = artistLinksArr.map((link: HTMLAnchorElement) =>
            link.innerText.trim()
          );
          const albumName = (mainCol.querySelector(
            ".album"
          ) as HTMLAnchorElement).innerText.trim();
          const genreLinks = mainCol.querySelectorAll(".genre");
          const genreLinksArr = Array.from(genreLinks);
          const genreArr = genreLinksArr.map((genre: HTMLAnchorElement) =>
            genre.innerText.trim()
          );
          const releaseYearNode = mainCol.querySelector("span.smallgray");
          const releaseYear = releaseYearNode
            ? parseInt(
                (mainCol.querySelector(
                  "span.smallgray"
                ) as HTMLSpanElement).innerText.replace(/[^0-9]/g, "")
              )
            : 0;
          const rymUrl = mainCol
            .querySelector("i a.album")
            .getAttribute("href");
          const RELEASE_REGEX = /(?<=\/release\/)((.*?))(?=\/)/gm;
          const releaseType = rymUrl.match(RELEASE_REGEX)[0];
          const scorePresent = ratingCol.querySelector("img");
          const score = scorePresent
            ? getScore(scorePresent.getAttribute("alt"))
            : 0;
          const month = (dateAddedCol.querySelector(
            ".date_element_month"
          ) as HTMLDivElement).innerText.trim();
          const day = (dateAddedCol.querySelector(
            ".date_element_day"
          ) as HTMLDivElement).innerText.trim();
          const year = (dateAddedCol.querySelector(
            ".date_element_year"
          ) as HTMLDivElement).innerText.trim();
          const dateAddedMilliseconds = Date.parse(`${month} ${day}, ${year}`);
          const dateAdded = new Date(dateAddedMilliseconds);

          obj._id = id;
          obj.artistIds = artistIdsArr;
          obj.artistNames = artistNamesArr;
          obj.albumName = albumName;
          obj.genres = genreArr;
          obj.releaseYear = releaseYear;
          obj.releaseType = releaseType;
          obj.rymUrl = rymUrl;
          obj.score = score;
          obj.dateAdded = dateAddedMilliseconds;

          return obj;
        };

        const objArr = rowsArr.map((row: HTMLTableRowElement) => rowToObj(row));
        return objArr;
      });
      finalArr.push(...pageData);
      await newPage.close();
    } catch (err) {
      console.log(`error trying to scrape page ${i}`);
      console.log(err);
    }
  }
  await browser.close();
  return finalArr;
};
