/// <reference types="jest" />

// Jest globals for TypeScript
declare const global: any;

declare global {
  function test(name: string, fn: jest.EmptyFunction): void;
  function describe(name: string, fn: jest.EmptyFunction): void;
  function it(name: string, fn: jest.EmptyFunction): void;
  const expect: jest.Expect;

  function beforeAll(fn: jest.EmptyFunction): void;
  function afterAll(fn: jest.EmptyFunction): void;
  function beforeEach(fn: jest.EmptyFunction): void;
  function afterEach(fn: jest.EmptyFunction): void;

  namespace NodeJS {
    interface Global {
      test: typeof test;
      describe: typeof describe;
      it: typeof it;
      expect: typeof expect;
      beforeAll: typeof beforeAll;
      afterAll: typeof afterAll;
      beforeEach: typeof beforeEach;
      afterEach: typeof afterEach;
      jest: jest.MockedObject<CustomMatchers>;
    }
  }
}

// Additional types for Supertest
declare module 'supertest' {
  interface SuperAgent<Req = request.SuperAgentRequest> {
    set(cookie: string): Req;
    set(cookie: object): Req;
  }
}

export {};
