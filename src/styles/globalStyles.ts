import { createGlobalStyle } from "styled-components";
import QuartoBoldWoff from "../fonts/Quarto-Bold.woff";
import QuartoBoldWoff2 from "../fonts/Quarto-Bold.woff2";

const GlobalStyle = createGlobalStyle`
@font-face {
  font-family: 'Quarto';
  src: url(${QuartoBoldWoff2}) format('woff2'),
      url(${QuartoBoldWoff}) format('woff');
  font-weight: bold;
  font-style: normal;
  font-display: swap;
}

  body {
    margin: 0;
    padding: 0;
    font-family: "Quarto", Open-Sans, Helvetica, Sans-Serif;
    background: #F7E7CE;
    color: #0c3cb4;
  }
`;

export default GlobalStyle;
