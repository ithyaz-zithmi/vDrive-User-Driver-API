declare module 'xss-clean' {
  import { RequestHandler } from 'express';

  // xss-clean acts like a middleware function
  function xssClean(): RequestHandler;

  export = xssClean;
}
