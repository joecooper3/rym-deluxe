const chalk = require("chalk");
const emoji = require("node-emoji");
import * as mongoose from "mongoose";

import { AlbumScrape, IRating, RecentsChanges } from "./interfaces";
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

export const mostRecentPageUpdate = async (data: RecentsChanges) => {
  mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  const db = mongoose.connection;
  const { newRatings, updatedScores, updatedRatings } = data;
  console.log(chalk.blue("inside mostRecentPageUpdate"));

  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", async () => {
    console.log("connection successful!");
    console.log("let us see");
    await addNewRatings();
    await updateOldRatings();
    await db.close();
  });

  const addNewRatings = async () => {
    if (newRatings && newRatings.length > 0) {
      newRatings.forEach(
        async (rating: IRating): Promise<void> => {
          try {
            Rating.create(rating);
            console.log(
              chalk.green(
                `Succesfully added ${rating.artistNames[0]} - ${rating.albumName}.`
              )
            );
          } catch {
            console.log(
              chalk.red(
                `Error trying to add ${rating.artistNames[0]} - ${rating.albumName}.`
              )
            );
          }
        }
      );
    }
  };

  const updateOldRatings = async () => {
    console.log('updating old ratings')
    if (updatedScores && updatedScores.length > 0) {
      updatedScores.forEach(async (obj: { _id: number; score: number }) => {
        const rating = await Rating.findById(obj._id);
        console.log(
          `${rating.artistNames[0]} - ${
            rating.albumName
          } updated from ${chalk.red(rating.score)} to ${chalk.blue(
            obj.score
          )}.`
        );
        rating.score = obj.score;
        await rating.save();
      });
    }
    if (updatedRatings && updatedRatings.length > 0) {
      updatedRatings.forEach(async (obj) => {
        const { art, playLinks, artistIds } = obj.options;
        const rating = await Rating.findById(obj._id);
        if (art) {
          rating.albumArt = obj.albumArt;
          console.log(
            chalk.green(
              `Updated album art for ${rating.artistNames[0]} - ${rating.albumName}.`
            )
          );
        }
        if (playLinks) {
          rating.playLinks = obj.playLinks;
          console.log(
            chalk.green(
              `Updated play links for ${rating.artistNames[0]} - ${rating.albumName}.`
            )
          );
        }
        if (artistIds) {
          rating.artistIds = obj.artistIds;
          console.log(
            chalk.green(
              `Updated album IDs for ${rating.artistNames[0]} - ${rating.albumName}.`
            )
          );
        }
        await rating.save();
        console.log('rating.save() here')
      });
    }
  };
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

export const pullMostRecents = async (page: number = 1) => {
  mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", () => {
    console.log("connection successful!");
  });
  const recents = await Rating.find().sort({ dateAdded: -1 }).limit(25);
  console.log(`pinged recents`);
  await db.close();
  console.log(chalk.yellow(`db.close() should be a thing in pullMostRcents`));
  return recents;
};
