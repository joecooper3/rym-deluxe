import mongoose from "mongoose";

import { Rating } from "./models.js";

export const addAllToDb = (data) => {
  mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  const db = mongoose.connection;

  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", () => {
    console.log("connection successful!");
    Rating.insertMany(data, (err, res) => {
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

export const updateOnePage = async (data) => {
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
        });
      } else {
        if (rating.score !== obj.score) {
          console.log(
            `${obj.artistNames[0]} - ${obj.albumName} updated from ${rating.score} to ${obj.score}.`
          );
          rating.score = obj.score;
          await rating.save();
        }
      }
    });
  });
};
