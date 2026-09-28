interface PortfolioApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface PortfolioApiResponse {
  setHeader(name: string, value: string): void;
  status(code: number): PortfolioApiResponse;
  json(value: unknown): PortfolioApiResponse;
  end(): void;
}

declare function portfolioApi(req: PortfolioApiRequest, res: PortfolioApiResponse): Promise<void>;

export default portfolioApi;