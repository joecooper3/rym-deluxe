const chalk = require("chalk");
const emoji = require("node-emoji");
import * as mongoose from "mongoose";

import { AlbumScrape, IRating } from "./interfaces";
import { Rating } from "./models";
import { scrapeAlbumPage } from "./scrapers";

export const addAllToDb = (data: IRating[]) => {
  mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  const db = mongoose.connection;

  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", () => {
    console.log("connection successful!");
    (Rating as any).insertMany(data, (err: any, res: any) => {
      if (err) {
        console.log(err);
        return;
      } else {
        console.log("went through");
        console.log(res);
        return;
      }
    });
  });
};

export const mostRecentPageUpdate = async (data: IRating[]) => {
  mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  const db = mongoose.connection;

  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", () => {
    console.log("connection successful!");
    data.map(async (obj) => {
      const rating = await Rating.findById(obj._id);

      if (!rating) {
        Rating.create(obj, (err, res) => {
          if (err) {
            console.log(err);
          } else {
            console.log(
              `Added ${obj._id}: ${obj.artistNames[0]} - ${obj.albumName}`
            );
            console.log(res);
          }
          return res;
        });
        const updatedData = await scrapeAlbumPage(obj);
        addAlbumPageData(obj._id, updatedData);
      } else {
        if (rating.score !== obj.score) {
          console.log(
            `${obj.artistNames[0]} - ${obj.albumName} updated from ${chalk.red(
              rating.score
            )} to ${chalk.blue(obj.score)}.`
          );
          rating.score = obj.score;
          await rating.save();
        }
        // if (!rating?.playLinks?.spotify || !rating?.albumArt?.url) {
        //   const updatedData = await scrapeAlbumPage(rating);
        //   addAlbumPageData(rating._id, updatedData);
        // }
      }
    });
  });
};

export const getRatingById = async (id: number): Promise<IRating> => {
  mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", async () => {
    console.log("connection successful!");
  });
  const rating = await Rating.findById(id).exec();
  db.close();
  return rating;
};

export const addAlbumPageData = async (
  id: number,
  obj: AlbumScrape
): Promise<void> => {
  mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  const db = mongoose.connection;
  db.on("error", console.error.bind(console, chalk.red("connection error:")));
  db.once("open", async () => {
    console.log("connection successful!");
  });
  const rating = await Rating.findById(id);
  rating.artistIds = obj.artistIds;
  rating.playLinks = obj.playLinks;
  rating.albumArt = obj.albumArt;
  await rating.save();
  console.log(
    `${emoji.get("wind_chime")} ${chalk.green(
      "Successfully updated artist IDs, play links, and album art for rating with ID"
    )} ${chalk.cyan(id)} ${chalk.green(".")}`
  );
  db.close();
};
