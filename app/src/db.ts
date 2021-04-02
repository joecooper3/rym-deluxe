import * as mongoose from "mongoose";
const chalk = require("chalk");
const emoji = require("node-emoji");

import { emojiLog } from "./utilities";

import {
  AlbumScrape,
  IRating,
  RecentsChanges,
  ScoreUpdate,
} from "./interfaces";
import { Rating } from "./models";
import { scrapeAlbumPage } from "./scrapers";
import { asyncForEach } from "./utilities";
import axios from "../../node_modules/axios/index";

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
    await addNewRatings(newRatings);
    await updateOldRatings(updatedScores, updatedRatings);
    await db.close();
  });

  const addNewRatings = async (arr: IRating[]) => {
    if (arr && arr.length > 0) {
      emojiLog(
        `Adding ${arr.length} new rating(s).`,
        "fishing_pole_and_fish",
        "cyan"
      );
      await asyncForEach(
        arr,
        async (rating: IRating): Promise<void> => {
          try {
            await Rating.create(rating);
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

  const updateOldRatings = async (
    scoreArr: ScoreUpdate[],
    ratingArr: AlbumScrape[]
  ) => {
    const updateScores = async (arr: ScoreUpdate[]) => {
      if (arr && arr.length > 0) {
        emojiLog(`Updating ${arr.length} score(s).`, "medal", "cyan");
        await asyncForEach(arr, async (obj: { _id: number; score: number }) => {
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
    };
    const updateRatings = async (arr: AlbumScrape[]) => {
      if (updatedRatings && updatedRatings.length > 0) {
        emojiLog(
          `Adding ${arr.length} new ratings.`,
          "admission_tickets",
          "cyan"
        );
        await asyncForEach(updatedRatings, async (obj: AlbumScrape) => {
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
          console.log("rating.save() here");
        });
      }
    };
    await updateScores(scoreArr);
    await updateRatings(ratingArr);
    if (newRatings || updatedScores || updatedRatings) {
      emojiLog("All ratings succesfully updated~!", "burrito", "green");
      axios.post(process.env.NETLIFY_DEPLOY);
    } else {
      emojiLog("No ratings need to be updated.", "boar", "yellow");
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
