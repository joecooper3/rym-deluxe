import React from "react";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";

import GlobalStyle from "../src/styles/globalStyles"
import ListentingTo from "./recent/ListeningTo";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalStyle />
      <ListentingTo />
    </QueryClientProvider>
  );
};

export default App;

