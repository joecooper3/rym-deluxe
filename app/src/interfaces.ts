import { Document } from "mongoose";

interface IPlayLinks {
  spotify: string,
  youtube: string,
  bandcamp: string
}

interface IAlbumArt {
  source: string,
  url: string
}

export interface IRating extends Document {
  _id: number;
  artistIds: number[];
  artistNames: string[];
  albumName: string;
  genres: string[];
  releaseYear: number;
  releaseType: string,
  rymUrl: string,
  playLinks: IPlayLinks,
  score: number,
  dateAdded: Date | Number,
  albumArt: IAlbumArt
}

export interface InquirerPages {
  start: number;
  end: number;
}