const chalk = require("chalk");
const emoji = require("node-emoji");
import * as inquirer from "inquirer";

import {
  addAllToDb,
  mostRecentPageUpdate,
  getRatingById,
  addAlbumPageData,
} from "./db";
import { scrapeAlbumPage, scrapeRecents } from "./scrapers";
import { IRating, InquirerPages } from "./interfaces";
import { validateNum } from "./validators";

const init = async (args: string[]): Promise<void> => {
  const shallowScrape = args.includes("--shallow");
  const deepScrape = args.includes("--deep");
  const albumPageScrape = args.includes("--album");

  console.log(args);
  if (shallowScrape) {
    const res = await scrapeRecents(1, 1);
    // console.log(res);
    mostRecentPageUpdate(res);
  }
  // NOTE: deep scrape untested in TypeScript
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
      .then((obj: InquirerPages) => {
        return scrapeRecents(obj.start, obj.end);
      })
      .then((obj: IRating[]) => {
        addAllToDb(obj);
      });
  }

  if (albumPageScrape) {
    if (args.length !== 2) {
      console.log(
        emoji.get("tractor") +
          " " +
          chalk.yellow(
            ' Please provide an album ID after running "npm run album".'
          )
      );
    } else {
      const id = parseInt(args[1]);
      const rating: IRating = await getRatingById(id);

      if (rating) {
        console.log(
          `${emoji.get(
            "female_mage"
          )} Beginning query of album page for ${chalk.cyan(rating.albumName)}`
        );
        const updatedData = await scrapeAlbumPage(rating);
        addAlbumPageData(id, updatedData);
      } else {
        console.log(
          emoji.get("oncoming_police_car") +
            " " +
            chalk.red(` No rating found for ID ${id}.`)
        );
      }
    }
  }
};

init(process.argv.slice(2));
