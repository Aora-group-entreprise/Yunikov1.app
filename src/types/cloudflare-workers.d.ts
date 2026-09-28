declare module 'cloudflare:workers' {
  interface CloudflareServiceBinding {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  }

  export const env: {
    YUNIKO_API?: CloudflareServiceBinding;
  };
}
