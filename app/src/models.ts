import { model, Model, Schema } from "mongoose";
import { IRating } from "./interfaces";

const playLinkSchema = new Schema({
  spotify: String,
  youtube: String,
  bandcamp: String,
});

const albumArtSchema = new Schema({
  source: String,
  url: String,
});

const ratingSchema = new Schema(
  {
    _id: Number,
    artistIds: [Number],
    artistNames: [String],
    albumName: String,
    genres: [String],
    releaseYear: Number,
    releaseType: {
      type: String,
      enum: [
        "album",
        "single",
        "ep",
        "comp",
        "djmix",
        "other",
        "unauth",
        "mixtape",
      ],
      default: "other",
    },
    rymUrl: String,
    playLinks: playLinkSchema,
    score: Number,
    dateAdded: Date,
    albumArt: albumArtSchema,
  },
  { timestamps: true }
);

export const Rating: Model<IRating> = model("Rating", ratingSchema);
