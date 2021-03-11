import * as mongoose from "mongoose";

import { Rating } from "./models";

module.exports = (app: any) => {
  app.get("/", (req: any, res: any) => {
    res.send("hmmmm");
  });

  app.get("/recent", async (req: any, res: any) => {
    mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    const db = mongoose.connection;
    db.on("error", console.error.bind(console, "connection error:"));
    db.once("open", () => {
      console.log("connection successful!");
    });
    const recents = await Rating.find().sort({ dateAdded: -1 }).limit(25);
    console.log(`pinged recents`);
    db.close();
    res.send(recents);
  });
};
