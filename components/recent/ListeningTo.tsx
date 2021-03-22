import React, { useEffect } from "react";
import styled from "styled-components";
import { useQuery } from "react-query";

import RatingItem from "./RatingItem";

const ListeningTo = () => {
  const { data } = useQuery(
    "recentData",
    () => fetch(process.env.API_URL + "/recent/").then((res) => res.json()),
    {
      staleTime: 600000,
    }
  );

  useEffect(() => {
    console.log(data);
  }, [data]);

  return (
    <Container>
      been listening to…
      {data &&
        data.length > 0 &&
        data.map((rating) => <RatingItem key={rating._id} data={rating} />)}
    </Container>
  );
};

export default ListeningTo;

const Container = styled.main`
  display: grid;
  max-width: 1200px;
  margin: 0 auto;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
`;
