import { Document } from "mongoose";

export interface IPlayLinks {
  spotify: string;
  youtube: string;
  bandcamp: string;
}

export interface IAlbumArt {
  source: string;
  url: string;
}

export interface IRating extends Document {
  _id: number;
  artistIds: number[];
  artistNames: string[];
  albumName: string;
  genres: string[];
  releaseYear: number;
  releaseType: string;
  rymUrl: string;
  playLinks: IPlayLinks;
  score: number;
  dateAdded: Date | Number;
  albumArt: IAlbumArt;
}

export interface InquirerPages {
  start: number;
  end: number;
}

export interface AlbumPage {
  playLinks: IPlayLinks;
  artistUrls?: string[];
  albumArtUrl?: string;
}

export interface ScrapeOptions {
  art: boolean,
  playLinks: boolean,
  artistIds: boolean
}

export interface AlbumScrape {
  _id: number,
  playLinks?: IPlayLinks;
  artistIds?: number[];
  albumArt?: IAlbumArt;
  options: ScrapeOptions;
}

export interface RecentsChanges {
  newRatings?: IRating[];
  updatedScores?: { _id: number, score: number}[];
  updatedRatings?: AlbumScrape[];
}
