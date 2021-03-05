import * as inquirer from "inquirer";

import { addAllToDb, updateOnePage } from "./db";
import { scrapeRecents } from "./scrapers";
import { IRating, InquirerPages } from "./interfaces";
import { validateNum } from "./validators";

const init = async (args: string[]): Promise<void> => {
  const shallowScrape = args.includes("--shallow");
  const deepScrape = args.includes("--deep");
  if (shallowScrape) {
    const res = await scrapeRecents(1, 1);
    // console.log(res);
    updateOnePage(res);
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
};

init(process.argv.slice(2));
