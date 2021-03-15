import React, { useEffect } from "react";
import styled from "styled-components";

import PlayLinks from "./PlayLinks";

const RatingItem = ({ key, data }) => {
  const { albumName, albumArt, artistNames, playLinks } = data;

  return (
    <div>
      <h2>{artistNames[0] } - {albumName}</h2>
      {albumArt?.url && <Image src={albumArt.url} />}
      {playLinks && <PlayLinks data={playLinks} />}
    </div>
  );
};

export default RatingItem;

const Image = styled.img`
  width: 350px;
`
