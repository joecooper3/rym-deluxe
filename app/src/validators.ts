export const validateNum = (inp: any) => {
  if (/^(\d)+$/.test(inp) === false) {
    return "Just enter a number, man.";
  }
  return true;
};
