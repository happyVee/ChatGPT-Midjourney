import {NextRequest, NextResponse} from "next/server";
import {auth} from "@/app/api/auth";

const BASE_URL = process.env.MIDJOURNEY_PROXY_URL ?? null;
const AUTH_TOKEN = process.env.MIDJOURNEY_AUTH_TOKEN ?? null;

async function handle(
    req: NextRequest,
    {params}: { params: { path: string[] } },
) {
    console.log("[Midjourney Route] params ", params);

    const customMjProxyUrl = req.headers.get('midjourney-proxy-url');
    let mjProxyUrl = BASE_URL;
    if(customMjProxyUrl && (customMjProxyUrl.startsWith("http://") || customMjProxyUrl.startsWith("https://"))){
        mjProxyUrl = customMjProxyUrl;
    }

    if (!mjProxyUrl) {
        return NextResponse.json({
            error: true,
            msg: 'please set MIDJOURNEY_PROXY_URL in .env or set midjourney-proxy-url in config'
        }, {
            status: 500,
        });
    }

    const authResult = auth(req);
    if (authResult.error) {
        return NextResponse.json(authResult, {
            status: 401,
        });
    }

    const reqPath = `${req.nextUrl.pathname}${req.nextUrl.search}`.replaceAll(
        "/api/midjourney/mj",
        "",
    );

    let fetchUrl = `${mjProxyUrl}/${reqPath}`;

    console.log("[MJ Proxy] ", fetchUrl);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, 10 * 60 * 1000);

    const fetchOptions: RequestInit = {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AUTH_TOKEN}`
        },
        cache: "no-store",
        method: req.method,
        body: req.body,
        signal: controller.signal,
        //@ts-ignore
        "duplex": "half"
    };

    try {
        const res = await fetch(fetchUrl, fetchOptions);
        if (res.status !== 200) {
            return new Response(res.body, {
                status: res.status,
                statusText: res.statusText,
            });
        }

        return res;
    } finally {
        clearTimeout(timeoutId);
    }
}

export const GET = handle;
export const POST = handle;