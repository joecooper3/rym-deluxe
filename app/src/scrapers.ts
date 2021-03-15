import * as puppeteer from "puppeteer";
const cloudinary = require("cloudinary").v2;

import {
  IPlayLinks,
  IAlbumArt,
  IRating,
  AlbumPage,
  AlbumScrape,
} from "./interfaces";

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

export const scrapeAlbumPage = async (
  rating: IRating
): Promise<AlbumScrape> => {
  const browser = await puppeteer.launch({ headless: true });
  const url = process.env.ALBUM_PREFIX + rating.rymUrl;

  const newPage = await browser.newPage();
  await newPage.goto(url);
  await newPage.waitForSelector(".release_descriptors", { timeout: 60000 });
  newPage.on("console", (consoleObj) => console.log(consoleObj.text()));

  const albumPageData = await newPage.evaluate(
    async (artistIds: number[], albumId: number) => {
      // get play links (e.g. Spotify, YouTube, etc)
      const playLinksContainer: HTMLDivElement = document.querySelector(
        ".ui_media_links_container"
      );

      const playLinks: IPlayLinks = {
        spotify: "",
        youtube: "",
        bandcamp: "",
      };

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
        const bandcampLink = bandcampEl ? bandcampEl.getAttribute("href") : "";

        playLinks.spotify = spotifyLink;
        playLinks.youtube = youtubeLink;
        playLinks.bandcamp = bandcampLink;
      }

      // get album art URL, upload to cloudinary account
      let albumArtUrl: string = "";
      const albumArtContainer: HTMLDivElement = document.querySelector(
        `.coverart_${albumId}`
      );

      if (albumArtContainer) {
        const imageEl: HTMLImageElement = albumArtContainer.querySelector(
          "img"
        );
        albumArtUrl = "https:" + imageEl.getAttribute("src");
      }

      // if no artist ids, populate artist ids (will need for loop for array)
      const artistUrls: string[] = [];
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

      const albumPageObj: AlbumPage = {
        playLinks: playLinks,
        artistUrls: artistUrls,
        albumArtUrl: albumArtUrl,
      };
      return albumPageObj;
    },
    rating.artistIds,
    rating._id
  );

  const imageObj: IAlbumArt = await uploadToCloudinary(
    albumPageData.albumArtUrl,
    "rym"
  );

  const getArtistIdsFromArr = async (
    origIdArr: number[],
    urlArr: string[]
  ): Promise<number[]> => {
    const idArr: number[] = [];
    for (let i = 0; i < origIdArr.length; i++) {
      if (origIdArr[i] === 0) {
        const newId = await fetchArtistId(urlArr[i], browser);
        idArr[i] = newId;
      } else {
        idArr[i] = origIdArr[i];
      }
    }
    return idArr;
  };

  const updatedArtistIdArr: number[] = await getArtistIdsFromArr(
    rating.artistIds,
    albumPageData.artistUrls
  );

  await newPage.close();
  await browser.close();

  const finalObj: AlbumScrape = {
    playLinks: albumPageData.playLinks,
    artistIds: updatedArtistIdArr,
    albumArt: imageObj,
  };

  return finalObj;
};

export const fetchArtistId = async (
  url: string,
  browser?: puppeteer.Browser
): Promise<number> => {
  if (!browser) {
    browser = await puppeteer.launch({ headless: false });
  }
  const artistPage = await browser.newPage();
  await artistPage.goto(url);
  await artistPage.bringToFront();
  await artistPage.waitForSelector(".footer_inner");
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
