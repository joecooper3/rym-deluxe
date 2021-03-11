import React from "react";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";

import ListentingTo from "./recent/ListeningTo";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ListentingTo />
    </QueryClientProvider>
  );
};

export default App;

