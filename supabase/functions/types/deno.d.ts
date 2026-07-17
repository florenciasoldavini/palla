declare namespace Deno {
  const env: {
    get(key: string): string | undefined;
  };
}

declare module "npm:@supabase/supabase-js@2.50.3" {
  export function createClient(...args: any[]): any;
}

declare module "npm:react@19.1.0" {
  const React: typeof import("react");
  export = React;
}

declare module "npm:react-email@6.6.6" {
  import type { ReactElement } from "react";

  export const Body: any;
  export const Container: any;
  export const Head: any;
  export const Heading: any;
  export const Hr: any;
  export const Html: any;
  export const Link: any;
  export const Preview: any;
  export const Section: any;
  export const Text: any;

  export function render(element: ReactElement): Promise<string>;
}
