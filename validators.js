export const validateNum = (inp) => {
  if (/^(\d)+$/.test(inp) === false) {
    return "Just enter a number, man.";
  }
  return true;
};
