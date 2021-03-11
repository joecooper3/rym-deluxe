import React, { useEffect } from "react";
import styled from "styled-components";

import PlayLinks from "./PlayLinks";

const RatingItem = ({ key, data }) => {
  const { albumName, playLinks } = data;

  return (
    <div>
      <h2>{albumName}</h2>
      {playLinks && <PlayLinks data={playLinks} />}
    </div>
  );
};

export default RatingItem;
