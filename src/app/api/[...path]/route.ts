import { NextRequest } from "next/server";

const API_BASE_URL = (
   process.env.YUNIKO_API_URL ??
   process.env.NEXT_PUBLIC_YUNIKO_API_URL ??
   "https://yuniko-api.lafatriniainaallane.workers.dev"
).replace(/\/+$/, "");

async function proxy(request: NextRequest) {
   const url = new URL(request.url);
   const target = `${API_BASE_URL}${url.pathname}${url.search}`;

   const headers = new Headers(request.headers);
   headers.delete("host");
   headers.delete("content-length");

   const method = request.method.toUpperCase();
   const body =
      method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

   const response = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
   });

   const responseHeaders = new Headers(response.headers);
   responseHeaders.delete("content-length");

   return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
   });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
