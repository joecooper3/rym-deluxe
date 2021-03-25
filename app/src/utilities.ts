const chalk = require("chalk");
const emoji = require("node-emoji");

export async function asyncForEach(array: any[], callback: any) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

export const emojiLog = (
  msg: string,
  emojiString: string,
  color: string = "white"
): void => {
  console.log(emoji.get(emojiString) + " • " + chalk[color](msg));
};
