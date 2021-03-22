import React, { useEffect } from "react";
import styled from "styled-components";

import PlayLinks from "./PlayLinks";

const RatingItem = ({ key, data }) => {
  const { _id, albumName, albumArt, artistNames, playLinks, score } = data;

  const generateScore = (inp: number): string => {
    return (inp / 2).toString() + " Stars";
  };

  return (
    <Container>
      {albumArt?.url && <Image src={albumArt.url} />}
      <CopyContainer>
        <h2>
          {artistNames[0]} - {albumName}
        </h2>
        {score > 0 && <h3>Rating:<br/> {generateScore(score)}</h3>}
        {playLinks && <PlayLinks data={playLinks} />}
      </CopyContainer>
    </Container>
  );
};

export default RatingItem;

const Container = styled.div`
  display: grid;
  grid-template-columns: 350px 1fr;
  background: white;
  border-radius: 12px;
  column-gap: 20px;
  padding: 20px;
`;

const CopyContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-flow: column nowrap;
  text-align: center;
`;

const Image = styled.img`
  width: 350px;
`;
