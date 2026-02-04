const https = require('https');

class YouTubeManager {
    getVideoInfo(url) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.isValidUrl(url)) {
                    return reject(new Error('Invalid YouTube URL'));
                }

                // 1. Fetch Basic Info via oEmbed
                const oEmbedData = await this.fetchOEmbed(url);

                // 2. Fetch Duration via Page Scraping (oEmbed doesn't provide it)
                let duration = 0;
                try {
                    duration = await this.scrapeDuration(url);
                } catch (e) {
                    console.warn('[YouTubeManager] Failed to scrape duration:', e.message);
                }

                resolve({
                    title: oEmbedData.title,
                    thumbnail: oEmbedData.thumbnail_url,
                    author: oEmbedData.author_name,
                    duration: duration
                });

            } catch (error) {
                console.error('[YouTubeManager] Error getting info:', error);
                reject(error);
            }
        });
    }

    isValidUrl(url) {
        return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
    }

    fetchOEmbed(videoUrl) {
        return new Promise((resolve, reject) => {
            const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;

            https.get(oEmbedUrl, (res) => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`oEmbed failed with status ${res.statusCode}`));
                }

                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', (e) => reject(e));
        });
    }

    scrapeDuration(videoUrl) {
        return new Promise((resolve, reject) => {
            // Helper to parse ISO 8601 duration (PT#M#S) to ms
            const parseDuration = (isoDuration) => {
                const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
                if (!match) return 0;

                const hours = (parseInt(match[1]) || 0);
                const minutes = (parseInt(match[2]) || 0);
                const seconds = (parseInt(match[3]) || 0);

                return (hours * 3600 + minutes * 60 + seconds) * 1000;
            };

            https.get(videoUrl, (res) => {
                if (res.statusCode !== 200) {
                    // Start reading but reject if status is bad? 
                    // Actually if we can't load page, we can't scrape.
                    res.resume(); // consume 
                    return reject(new Error(`Page fetch failed with status ${res.statusCode}`));
                }

                let data = '';
                // We only need the head mostly, but duration might be further down.
                // YouTube pages are huge. Let's try to grab enough.

                res.on('data', (chunk) => {
                    data += chunk;
                    // Early exit if we found the duration meta tag
                    if (data.includes('itemprop="duration"')) {
                        const match = data.match(/<meta itemprop="duration" content="([^"]+)">/);
                        if (match && match[1]) {
                            res.destroy(); // Stop fetching
                            resolve(parseDuration(match[1]));
                        }
                    }
                });

                res.on('end', () => {
                    // If we finished without destroying, maybe we missed it or it wasn't there
                    // Try regex one last time on whole data if feasible, or just fail
                    const match = data.match(/<meta itemprop="duration" content="([^"]+)">/);
                    if (match && match[1]) {
                        resolve(parseDuration(match[1]));
                    } else {
                        resolve(0); // Failed to find
                    }
                });

            }).on('error', (e) => reject(e));
        });
    }
}

module.exports = new YouTubeManager();
