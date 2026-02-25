const RAW_BACKEND_BASE =
  process.env.API_URL ||
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3000/api";

const BACKEND_BASE = RAW_BACKEND_BASE.replace(/\/+$/, "");

export const dynamic = "force-dynamic";

const buildUpstreamUrl = (params, search) => {
  const joinedPath = Array.isArray(params?.path) ? params.path.join("/") : "";
  return `${BACKEND_BASE}/${joinedPath}${search || ""}`;
};

const withForwardHeaders = (requestHeaders) => {
  const headers = new Headers(requestHeaders);

  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  return headers;
};

const proxyRequest = async (request, { params }) => {
  const upstreamUrl = buildUpstreamUrl(params, request.nextUrl.search);
  const method = request.method.toUpperCase();

  const init = {
    method,
    headers: withForwardHeaders(request.headers),
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  const upstreamResponse = await fetch(upstreamUrl, init);
  const responseHeaders = new Headers(upstreamResponse.headers);

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
};

export async function GET(request, context) {
  return proxyRequest(request, context);
}

export async function POST(request, context) {
  return proxyRequest(request, context);
}

export async function PUT(request, context) {
  return proxyRequest(request, context);
}

export async function PATCH(request, context) {
  return proxyRequest(request, context);
}

export async function DELETE(request, context) {
  return proxyRequest(request, context);
}

export async function OPTIONS(request, context) {
  return proxyRequest(request, context);
}
