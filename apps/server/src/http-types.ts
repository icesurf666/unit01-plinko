export type HeaderValue = string | string[] | undefined;

export interface HttpRequestLike {
  headers: Record<string, HeaderValue>;
  method: string;
  path?: string;
  route?: {
    path?: string;
  };
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
}

export interface HttpResponseLike {
  statusCode: number;
  on(event: 'finish', listener: () => void): void;
  setHeader(name: string, value: string): void;
  status(code: number): HttpResponseLike;
  json(body: unknown): void;
}

export type NextFunction = () => void;
