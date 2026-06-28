import OpenAI from "openai";
import z from "zod";

const WebfetchArgs = z.object({
    url: z.string().url(),
    format: z.enum(["text", "markdown", "html"]).default("markdown"),
    timeout: z.number().int().min(1).max(120).optional(),
});

export const webfetchDefinition: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "webfetch",
        description:
            "Fetch content from a URL and return it as text, markdown, or HTML. " +
            "Markdown is the default format. " +
            "This tool is read-only. " +
            "Use a more targeted tool when one is available. " +
            "Large results may be truncated. " +
            "HTTP URLs are automatically upgraded to HTTPS.",
        parameters: {
            type: "object",
            properties: {
                url: { type: "string", description: "The URL to fetch content from" },
                format: {
                    type: "string",
                    enum: ["text", "markdown", "html"],
                    description: "The format to return the content in. Defaults to markdown.",
                },
                timeout: {
                    type: "integer",
                    description: "Optional timeout in seconds (max 120)",
                },
            },
            required: ["url"],
        },
    },
};

const MAX_BYTES = 500_000;
const DEFAULT_TIMEOUT = 30_000;

function convertHTMLToText(html: string): string {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

export async function runWebfetch(args: unknown): Promise<string> {
    const parsed = WebfetchArgs.safeParse(args);
    if (!parsed.success) return `Error: ${parsed.error.message}`;
    const { url, format, timeout } = parsed.data;

    const safeUrl = url.replace(/^http:/, "https:");

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), (timeout ?? DEFAULT_TIMEOUT / 1000) * 1000);

        const response = await fetch(safeUrl, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; AsukaCode/1.0)",
                "Accept": "text/html,text/plain,text/markdown,*/*",
            },
        });

        clearTimeout(timer);

        if (!response.ok) {
            return `Error: HTTP ${response.status} ${response.statusText}`;
        }

        const contentType = response.headers.get("content-type") || "";
        const text = await response.text();

        let output: string;
        if (format === "html") {
            output = text;
        } else if (format === "text") {
            output = contentType.includes("text/html") ? convertHTMLToText(text) : text;
        } else {

            output = contentType.includes("text/html") ? convertHTMLToText(text) : text;
        }

        return output.slice(0, MAX_BYTES);
    } catch (err: any) {
        if (err.name === "AbortError") {
            return "Error: Request timed out";
        }
        return `Error: ${err.message}`;
    }
}
