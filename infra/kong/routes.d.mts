// Types for routes.mjs, so the TypeScript gateway tests can import it
export declare const ROLES: string[];
export declare const SERVICES: string[];
export declare const PUBLIC_PATHS: Record<string, string[]>;
export declare const ROUTES: {
  service: string;
  name: string;
  methods: string[];
  path: string;
  sample?: string;
  roles?: string[];
  internalOnly?: boolean;
}[];
