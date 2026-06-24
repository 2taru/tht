import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Замість realtime — легкий пулінг: дані команди підтягуються самі раз на
      // 2 хв (лише коли вкладка активна — refetchIntervalInBackground за замовч.
      // false) + при поверненні на вкладку. Плюс ручна кнопка «Оновити».
      refetchInterval: 120_000,
      refetchOnWindowFocus: true,
    },
  },
});
