import * as puppeteer from "puppeteer";
const cloudinary = require("cloudinary").v2;
const chalk = require("chalk");
const emoji = require("node-emoji");

import { pullMostRecents } from "./db";

import {
  IPlayLinks,
  IAlbumArt,
  IRating,
  AlbumPage,
  AlbumScrape,
  RecentsChanges,
  ScrapeOptions,
} from "./interfaces";

require("dotenv").config();

// simple function to artifically add a delay between loop iterations
function delay(time: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

export const scrapeRecents = async (
  startPage: number,
  endPage: number
): Promise<RecentsChanges> => {
  const MULTI_PAGE: boolean = endPage - startPage > 0;
  const recentPageArr = <IRating[]>[];
  // open the headless browser
  const browser = await puppeteer.launch({ headless: false });

  for (let i = startPage; i <= endPage; i++) {
    const recentData = await scrapeRecentRows(i, browser);
    if (typeof recentData !== "string") {
      recentPageArr.push(...recentData);
    } else {
      throw console.error(recentData);
    }
  }

  // multi-page scrapes won't go deeper than just what it can pull from
  // the recent pages view
  if (MULTI_PAGE) {
    await browser.close();
    const multiPageArr: RecentsChanges = {
      newRatings: recentPageArr,
    };
    return multiPageArr;
  }

  console.log(
    emoji.get("shopping_trolley") + " " + chalk.yellow("Pulling most recents…")
  );
  const dbData: IRating[] = await pullMostRecents(startPage);
  const comprehensiveArr = <RecentsChanges>{};

  if (!dbData || dbData.length < 1) {
    throw console.error(
      chalk.red("Has some sort of issue fetching the database data.")
    );
  } else {
    console.log(chalk.cyan("Database data fetched sucessfully!"));
  }

  // assembles RecentChanges object
  const needArtistIds: IRating[] = [];
  const needAlbumArt: IRating[] = [];
  const needPlayLinks: IRating[] = [];
  recentPageArr.forEach((rating) => {
    const inDb = dbData.find((dbRat) => dbRat._id === rating._id);
    if (!inDb) {
      if (comprehensiveArr.hasOwnProperty("newRatings")) {
        comprehensiveArr.newRatings.push(rating);
      } else {
        comprehensiveArr.newRatings = [rating];
      }
    } else {
      if (inDb.score !== rating.score) {
        const newScoreObj = { _id: rating._id, score: rating.score };
        if (comprehensiveArr.hasOwnProperty("updateScore")) {
          comprehensiveArr.updatedScores.push(newScoreObj);
        } else {
          comprehensiveArr.updatedScores = [newScoreObj];
        }
      }
      if (inDb.artistIds[0] === 0) {
        needArtistIds.push(rating);
      }
      if (!inDb.albumArt) {
        needAlbumArt.push(rating);
      }
      if (!inDb.playLinks) {
        needPlayLinks.push(rating);
      }
    }
  });

  const fetchAlbumPageFields = async (
    artArr: IRating[],
    playLinksArr: IRating[],
    artistArr: IRating[]
  ): Promise<AlbumScrape[]> => {
    const uniqueRatings: Set<IRating> = new Set();
    const totalArr = [...artArr, ...playLinksArr, ...artistArr];
    totalArr.forEach((rating) => uniqueRatings.add(rating));
    const uniqueRatingsArr: IRating[] = Array.from(uniqueRatings);
    const albumScrapeArr: AlbumScrape[] = <AlbumScrape[]>[];

    const fetchNecessary = async (rating: IRating): Promise<AlbumScrape> => {
      const fetchArt = artArr.includes(rating);
      const fetchPlaylinks = playLinksArr.includes(rating);
      const fetchArtistIds = artistArr.includes(rating);
      const options = {
        art: fetchArt,
        playLinks: fetchPlaylinks,
        artistIds: fetchArtistIds,
      };
      const scrapedData = await scrapeAlbumPage(rating, options);
      return scrapedData;
    };

    for (let rating of uniqueRatingsArr) {
      await fetchNecessary(rating).then(async (res: AlbumScrape) => {
        await delay(60000);
        console.log(chalk.cyan("just did a fetchNecessary"));
        console.log(res);
        albumScrapeArr.push(res);
      });
    }
    return albumScrapeArr;
  };

  const albumScrapeArrs = await fetchAlbumPageFields(
    needAlbumArt,
    needPlayLinks,
    needArtistIds
  );

  if (albumScrapeArrs.length > 0) {
    comprehensiveArr.updatedRatings = albumScrapeArrs;
  }

  await browser.close();
  return comprehensiveArr;
};

export const scrapeAlbumPage = async (
  rating: IRating,
  options: {
    art: boolean;
    playLinks: boolean;
    artistIds: boolean;
  }
): Promise<AlbumScrape> => {
  const browser = await puppeteer.launch({ headless: false });
  const url = process.env.ALBUM_PREFIX + rating.rymUrl;
  console.log(
    `${rating.albumName} art: ${options.art}, artistIds: ${options.artistIds}, playLinks: ${options.playLinks}`
  );

  const newPage = await browser.newPage();
  await newPage.goto(url);
  await newPage.waitForSelector(".release_descriptors", { timeout: 60000 });
  newPage.on("console", (consoleObj) => console.log(consoleObj.text()));

  const albumPageData = await newPage.evaluate(
    async (
      artistIds: number[],
      albumId: number,
      options: ScrapeOptions
    ): Promise<AlbumPage> => {
      // get play links (e.g. Spotify, YouTube, etc)
      const playLinks: IPlayLinks = <IPlayLinks>{};
      if (options.playLinks) {
        const playLinksContainer: HTMLDivElement = document.querySelector(
          ".ui_media_links_container"
        );

        if (playLinksContainer) {
          const spotifyEl = playLinksContainer.querySelector(
            ".ui_media_link_btn_spotify"
          );
          const spotifyLink = spotifyEl ? spotifyEl.getAttribute("href") : "";
          const youtubeEl = playLinksContainer.querySelector(
            ".ui_media_link_btn_youtube"
          );
          const youtubeLink = youtubeEl ? youtubeEl.getAttribute("href") : "";
          const bandcampEl = playLinksContainer.querySelector(
            ".ui_media_link_btn_bandcamp"
          );
          const bandcampLink = bandcampEl
            ? bandcampEl.getAttribute("href")
            : "";

          playLinks.spotify = spotifyLink;
          playLinks.youtube = youtubeLink;
          playLinks.bandcamp = bandcampLink;
        }
      }

      // get album art URL, upload to cloudinary account
      let albumArtUrl: string = "";
      if (options.art) {
        const albumArtContainer: HTMLDivElement = document.querySelector(
          `.coverart_${albumId}`
        );

        if (albumArtContainer) {
          const imageEl: HTMLImageElement = albumArtContainer.querySelector(
            "img"
          );
          albumArtUrl = "https:" + imageEl.getAttribute("src");
        }
      }

      // if no artist ids, populate artist ids (will need for loop for array)
      const artistUrls: string[] = [];
      if (options.artistIds) {
        for (let i = 0; i < artistIds.length; i++) {
          if (artistIds[i] === 0) {
            const infoContainer: HTMLTableElement = document.querySelector(
              ".album_info"
            );
            const artistLinks: NodeListOf<HTMLAnchorElement> = infoContainer.querySelectorAll(
              ".artist"
            );
            const url: string = artistLinks[i].href;
            artistUrls.push(url);
          } else {
            artistUrls.push(null);
          }
        }
      }

      const albumPageObj: AlbumPage = {
        playLinks: playLinks,
        artistUrls: artistUrls,
        albumArtUrl: albumArtUrl,
      };
      return albumPageObj;
    },
    rating.artistIds,
    rating._id,
    options
  );

  let imageObj: IAlbumArt | null = null;
  if (options.art) {
    imageObj = await uploadToCloudinary(albumPageData.albumArtUrl, "rym");
  }

  let updatedArtistIdArr: number[] | null = null;
  if (options.artistIds) {
    updatedArtistIdArr = await getArtistIdsFromArr(
      rating.artistIds,
      albumPageData.artistUrls,
      browser
    );
  }

  await newPage.close();
  await browser.close();

  const finalObj: AlbumScrape = {
    _id: rating._id,
    playLinks: albumPageData.playLinks,
    artistIds: updatedArtistIdArr,
    albumArt: imageObj,
    options: options,
  };

  return finalObj;
};

export const scrapeArtistPage = async (
  url: string,
  browser?: puppeteer.Browser
): Promise<number> => {
  if (!browser) {
    browser = await puppeteer.launch({ headless: false });
  }
  const artistPage = await browser.newPage();
  await artistPage.goto(url);
  await artistPage.bringToFront();
  await artistPage.waitForSelector(".footer_inner", { timeout: 60000 });
  const newArtistId: number = await artistPage.evaluate(async () => {
    const shortcode: HTMLInputElement = document.querySelector(".rym_shortcut");
    return parseInt(shortcode.value.replace(/[^0-9]/g, ""));
  });
  await artistPage.close();
  return newArtistId;
};

export const uploadToCloudinary = async (
  url: string,
  source: string
): Promise<IAlbumArt> => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
  });
  const cloudUpload = await cloudinary.uploader.upload(
    url,
    (err: any, res: any) => {
      console.log(err, res);
      if (res) {
        return res;
      }
    }
  );
  const finalObj = {
    source: source,
    url: cloudUpload.secure_url,
  };

  return finalObj;
};

const getArtistIdsFromArr = async (
  origIdArr: number[],
  urlArr: string[],
  browser: puppeteer.Browser
): Promise<number[]> => {
  const idArr: number[] = [];
  for (let i = 0; i < origIdArr.length; i++) {
    if (origIdArr[i] === 0) {
      const newId = await scrapeArtistPage(urlArr[i], browser);
      idArr[i] = newId;
    } else {
      idArr[i] = origIdArr[i];
    }
  }
  return idArr;
};

const scrapeRecentRows = async (
  i: number,
  browser: puppeteer.Browser
): Promise<IRating[] | string> => {
  try {
    const newPage = await browser.newPage();
    // await newPage.goto(`${process.env.TEST_URL}`);
    await newPage.goto(`${process.env.RYM_URL}/${i}`);
    await newPage.waitForSelector(".footer_inner", { timeout: 60000 });
    // newPage.on("console", (consoleObj) => console.log(consoleObj.text()));

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
        const mainCol: HTMLElement = row.querySelector(".or_q_albumartist_td");

        // see if it's a track review row; if so, just return
        const trackReviewCol = row.querySelector(".or_q_review_td");
        if (trackReviewCol || !ratingCol || !mainCol || !dateAddedCol) {
          return;
        }

        // tagcloud houses the album ID
        const tagCloud = row.querySelector(".or_q_tagcloud");
        const id = parseInt(tagCloud.getAttribute("id").replace(/[^0-9]/g, ""));
        const artistLinks = mainCol.querySelectorAll(".artist");
        const artistLinksArr = Array.from(artistLinks);
        const artistIdsArr = artistLinksArr.map((link) => {
          if (link.getAttribute("title")) {
            return parseInt(link.getAttribute("title").replace(/[^0-9]/g, ""));
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
        const rymUrl = mainCol.querySelector("i a.album").getAttribute("href");
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
        const dateAdded = Date.parse(`${month} ${day}, ${year}`);

        obj._id = id;
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

      const objArr = rowsArr.map((row: HTMLTableRowElement) => rowToObj(row));
      return objArr;
    });
    await newPage.close();
    return pageData;
  } catch (err) {
    console.log(`error trying to scrape page ${i}`);
    console.log(err);
    return err.message;
  }
};
