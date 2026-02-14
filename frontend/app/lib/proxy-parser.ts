
export interface ProxyMatch {
    ip: string;
    port: string;
    user?: string;
    pass?: string;
    original: string;
    index: number;
    length: number;
    confidence: "confirmed" | "ambiguous";
    format: "ip:port" | "ip:port:user:pass" | "user:pass@ip:port" | "user:pass:ip:port" | "ip:port:pass:user" | "unknown";
}

export interface ExtractedResult {
    matches: ProxyMatch[];
    duplicatesRemoved: number;
    normalized: string;
}

const IP_REGEX = /(?:^|[^0-9])((?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))(?=[^0-9]|$)/g;

// Heuristics to detect format
export function detectFormat(text: string): string {
    // Simple heuristic based on first few lines
    const lines = text.split('\n').filter(l => l.trim().length > 0).slice(0, 5);
    if (lines.length === 0) return "unknown";

    let counts = {
        "ip:port": 0,
        "ip:port:user:pass": 0,
        "user:pass@ip:port": 0,
        "user:pass:ip:port": 0
    };

    for (const line of lines) {
        if (line.includes("@")) counts["user:pass@ip:port"]++;
        const parts = line.split(":");
        if (parts.length === 2) counts["ip:port"]++;
        if (parts.length === 4) {
            // Hard to distinguish ip:port:user:pass vs user:pass:ip:port without IP check
            // check if part[0] is IP
            if (parts[0].match(/^\d+\.\d+\.\d+\.\d+$/)) counts["ip:port:user:pass"]++;
            else if (parts[2].match(/^\d+\.\d+\.\d+\.\d+$/)) counts["user:pass:ip:port"]++;
        }
    }

    // Return winner
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function extractProxies(text: string): ProxyMatch[] {
    const matches: ProxyMatch[] = [];
    const lines = text.split(/\r?\n/);

    let globalIndex = 0;

    for (const line of lines) {
        const lineTrim = line.trim();

        if (!lineTrim) {
            globalIndex += line.length + 1; // +1 for newline
            continue;
        }

        // Strategy: Find the IP in the line.
        const ipMatches = [...line.matchAll(IP_REGEX)];

        if (ipMatches.length === 0) {
            globalIndex += line.length + 1;
            continue;
        }

        for (const ipMatch of ipMatches) {
            const ip = ipMatch[1]; // The actual IP string group
            // The regex matches a preceding char if present (e.g. '@' or ' ')
            // We need the precise start index of the IP within the line.
            const ipStartOffset = ipMatch[0].indexOf(ip);
            const ipStartIndex = ipMatch.index! + ipStartOffset;

            // Look around the IP
            // Check for Port after IP
            const afterIp = line.slice(ipStartIndex + ip.length);
            const portMatch = afterIp.match(/^:(\d{1,5})/);

            if (portMatch) {
                const port = portMatch[1];
                let user = "";
                let pass = "";
                let confidence: "confirmed" | "ambiguous" = "confirmed";
                let format: ProxyMatch['format'] = "ip:port";

                // Check for user:pass BEFORE IP (user:pass@ip:port or user:pass:ip:port)
                // We check the char immediately before the IP
                const charBefore = ipStartIndex > 0 ? line[ipStartIndex - 1] : "";
                const beforeIp = line.slice(0, ipStartIndex > 0 ? ipStartIndex - 1 : 0);

                // Case: user:pass@ip:port
                if (charBefore === "@") {
                    // Extract auth from beforeIp
                    let authPart = beforeIp.trim();
                    // Remove protocol if present (http://, socks5://)
                    // Simple approach: split by space or just take the last chunk
                    const lastSpace = Math.max(authPart.lastIndexOf(" "), authPart.lastIndexOf("\t"));
                    if (lastSpace !== -1) {
                        authPart = authPart.slice(lastSpace + 1);
                    }
                    // Strip protocol prefix if sticking to it
                    authPart = authPart.replace(/^(?:https?|socks[45]):\/\//i, "");

                    const authSplit = authPart.split(":");
                    if (authSplit.length >= 2) {
                        pass = authSplit.pop()!;
                        user = authSplit.pop()!;
                        format = "user:pass@ip:port";
                    }
                }
                // Case: user:pass:ip:port
                else if (charBefore === ":") {
                    let authPart = beforeIp.trim();
                    const lastSpace = Math.max(authPart.lastIndexOf(" "), authPart.lastIndexOf("\t"));
                    if (lastSpace !== -1) authPart = authPart.slice(lastSpace + 1);

                    const authSplit = authPart.split(":");
                    if (authSplit.length >= 2) {
                        pass = authSplit.pop()!;
                        user = authSplit.pop()!;
                        format = "user:pass:ip:port";
                    }
                }

                // Check for user:pass AFTER IP:Port (ip:port:user:pass)
                // Only if we didn't find auth before
                if (!user && !pass) {
                    const afterPort = afterIp.slice(portMatch[0].length);
                    if (afterPort.startsWith(":")) {
                        const remainder = afterPort.slice(1);
                        // Take everything until space or end
                        const endOfCreds = remainder.match(/^([^:\s]+):([^:\s]+)/);
                        if (endOfCreds) {
                            user = endOfCreds[1];
                            pass = endOfCreds[2];
                            format = "ip:port:user:pass";
                        }
                    }
                }

                // Construct match
                let startIndex = globalIndex + ipStartIndex;
                let fullString = `${ip}:${port}`;

                // Calculate match start/end based on format for highlighting
                if (format === "user:pass@ip:port") {
                    fullString = `${user}:${pass}@${ip}:${port}`;
                    // We need to find where this string is relative to the IP
                    // Since we cleaned protocol, we have to be careful.
                    // Let's just use the known user/pass/ip/port to reconstruct regex search 
                    // or simpler: find strictly the substring ending at IP
                    const searchStr = `${user}:${pass}@`;
                    const idx = line.lastIndexOf(searchStr, ipStartIndex);
                    if (idx !== -1) {
                        startIndex = globalIndex + idx;
                        fullString = `${user}:${pass}@${ip}:${port}`;
                    }
                } else if (format === "user:pass:ip:port") {
                    const searchStr = `${user}:${pass}:`;
                    const idx = line.lastIndexOf(searchStr, ipStartIndex);
                    if (idx !== -1) {
                        startIndex = globalIndex + idx;
                        fullString = `${user}:${pass}:${ip}:${port}`;
                    }
                } else if (format === "ip:port:user:pass") {
                    fullString = `${ip}:${port}:${user}:${pass}`;
                    // Start index is already ipStartIndex
                }

                matches.push({
                    ip,
                    port,
                    user,
                    pass,
                    original: fullString,
                    index: startIndex,
                    length: fullString.length,
                    confidence,
                    format
                });
            } else {
                // IP without port -> Ambiguous
                // We need strict IP start
                matches.push({
                    ip,
                    port: "",
                    original: ip,
                    index: globalIndex + ipStartIndex, // Corrected index
                    length: ip.length,
                    confidence: "ambiguous",
                    format: "unknown"
                });
            }
        }

        globalIndex += line.length + 1;
    }

    return matches;
}


export function normalizeProxies(matches: ProxyMatch[]): string {
    // 1. Filter out ambiguous or invalid?
    // User wants "Clean & Format".
    // We should probably take all "confirmed" matches.
    // What about ambiguous? If it has IP and Port (maybe missing auth), we might treat as confirmed ip:port

    const valid = matches.filter(m => m.port); // Must have port at minimum

    // Deduplicate
    const unique = new Map<string, ProxyMatch>();
    for (const m of valid) {
        const key = `${m.ip}:${m.port}:${m.user || ''}:${m.pass || ''}`;
        if (!unique.has(key)) {
            unique.set(key, m);
        }
    }

    // Format
    return Array.from(unique.values()).map(m => {
        if (m.user && m.pass) {
            return `${m.ip}:${m.port}:${m.user}:${m.pass}`;
        }
        return `${m.ip}:${m.port}`;
    }).join("\n");
}
