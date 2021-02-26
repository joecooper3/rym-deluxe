import puppeteer from "puppeteer";
import dotenv from "dotenv";
import inquirer from "inquirer";

import { addAllToDb, updateOnePage } from "./db.js";
import { validateNum } from "./validators.js";

dotenv.config();

const scrapeData = async (startPage, endPage) => {
  const finalArr = [];

  // open the headless browser
  var browser = await puppeteer.launch({ headless: false });

  // enter url in page
  // await page.goto(process.env.RYM_URL);
  for (let i = startPage; i <= endPage; i++) {
    try {
      const newPage = await browser.newPage();
      await newPage.goto(`${process.env.RYM_URL}/${i}`);
      await newPage.waitForSelector(".footer_inner");

      function delay(time) {
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

        const getScore = (string) => {
          const numbersOnly = string.replace(/[^0-9]/g, "");
          const baseNum = parseInt(numbersOnly.substring(0, 2).trimEnd());
          return baseNum / 5;
        };

        const rowToObj = (row) => {
          const obj = {};

          const dateAddedCol = row.querySelector(".or_q_rating_date_d");
          const ratingCol = row.querySelector(".or_q_rating_date_s");
          const mainCol = row.querySelector(".or_q_albumartist_td");

          // see if it's a track review row; if so, just return
          const trackReviewCol = row.querySelector(".or_q_review_td");
          if (trackReviewCol || !ratingCol || !mainCol || !dateAddedCol) {
            return;
          }

          const albumLink = mainCol.querySelector(".album");
          const artistLinks = mainCol.querySelectorAll(".artist");
          const artistLinksArr = Array.from(artistLinks);
          const artistIdsArr = artistLinksArr.map((link) =>
            link.getAttribute("title").replace(/[^0-9]/g, "")
          );
          const artistNamesArr = artistLinksArr.map((link) =>
            link.innerText.trim()
          );
          const albumName = mainCol.querySelector(".album").innerText.trim();
          const genreLinks = mainCol.querySelectorAll(".genre");
          const genreLinksArr = Array.from(genreLinks);
          const genreArr = genreLinksArr.map((genre) => genre.innerText.trim());
          const releaseYearNode = mainCol.querySelector("span.smallgray");
          const releaseYear = releaseYearNode
            ? parseInt(
                mainCol
                  .querySelector("span.smallgray")
                  .innerText.replace(/[^0-9]/g, "")
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
          const month = dateAddedCol
            .querySelector(".date_element_month")
            .innerText.trim();
          const day = dateAddedCol
            .querySelector(".date_element_day")
            .innerText.trim();
          const year = dateAddedCol
            .querySelector(".date_element_year")
            .innerText.trim();
          const dateAdded = Date.parse(`${month} ${day}, ${year}`);

          obj._id = albumLink.getAttribute("title").replace(/[^0-9]/g, "");
          obj.artistIds = artistIdsArr;
          obj.artistNames = artistNamesArr;
          obj.albumName = albumName;
          obj.genres = genreArr;
          obj.releaseYear = releaseYear;
          obj.releaseType = releaseType;
          obj.rymUrl = rymUrl;
          obj.score = score;
          obj.dateAdded = dateAdded;

          return obj;
        };

        const objArr = rowsArr.map((row) => rowToObj(row));

        // return rowToObj(rowsArr[2]);
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

const init = async (args) => {
  const deepScrape = args.includes("--deep");

  const cb = async (start, end) => {
    const data = await scrapeData(start, end);
    console.log(data);
    if (deepScrape) {
      addAllToDb(data);
    } else {
      updateOnePage(data);
    }
  };

  if (deepScrape) {
    inquirer
      .prompt([
        {
          type: "input",
          name: "start",
          message: "Start on which page?",
          validate: validateNum,
        },
        {
          type: "input",
          name: "end",
          message: "End on which page?",
          validate: validateNum,
        },
      ])
      .then((obj) => {
        cb(obj.start, obj.end);
      });
  } else {
    cb(1, 1);
  }

  return;
};

init(process.argv.slice(2));
