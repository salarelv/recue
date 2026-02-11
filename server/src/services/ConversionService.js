const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

// Get ffmpeg binary path from ffmpeg-static
const ffmpegPath = require('ffmpeg-static');

class ConversionService extends EventEmitter {
    constructor() {
        super();
        this.activeConversions = new Map(); // mediaId -> { process, progress }
    }

    /**
     * Check if a video file needs conversion (not already H.264 MP4)
     */
    needsConversion(filename) {
        const ext = path.extname(filename).toLowerCase();
        // Convert all videos to ensure correct codec/web optimization
        return ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.m4v', '.ogv'].includes(ext);
    }

    /**
     * Convert a video file to H.264 MP4 optimized for web playback
     * @param {string} inputPath - Full path to input file
     * @param {string} mediaId - Unique media identifier for tracking
     * @param {string} playlistId - Playlist ID for broadcasting
     * @returns {Promise<string>} - Path to converted file
     */
    async convert(inputPath, mediaId, playlistId) {
        if (!inputPath) {
            console.error('[ConversionService] No input path provided');
            return Promise.reject(new Error('No input path provided'));
        }

        const dir = path.dirname(inputPath);
        const basename = path.basename(inputPath, path.extname(inputPath));
        const finalOutputPath = path.join(dir, `${basename}.mp4`);
        const thumbnailPath = path.join(dir, `${basename}_thumb.jpg`);

        // Handle case where input equals output (e.g. re-encoding mp4)
        let isTempOutput = false;
        let actualOutputPath = finalOutputPath;
        if (inputPath === finalOutputPath) {
            actualOutputPath = path.join(dir, `${basename}_temp.mp4`);
            isTempOutput = true;
        }

        console.log(`[ConversionService] Input: ${inputPath}`);
        console.log(`[ConversionService] Output: ${actualOutputPath}`);

        // Verify input file exists and has size
        try {
            const stats = await fs.promises.stat(inputPath);
            if (stats.size === 0) {
                throw new Error('Input file is empty');
            }
        } catch (e) {
            console.error(`[ConversionService] Input file verification failed: ${e.message}`);
            return Promise.reject(e);
        }

        return new Promise((resolve, reject) => {
            console.log(`[ConversionService] Starting conversion...`);

            this.emit('start', { mediaId, playlistId, inputPath });

            // Get duration
            const probe = spawn(ffmpegPath, ['-i', inputPath, '-f', 'null', '-'], { stdio: ['pipe', 'pipe', 'pipe'] });
            let duration = 0;
            let probeOutput = '';

            probe.stderr.on('data', (data) => probeOutput += data.toString());
            probe.on('close', () => {
                const durationMatch = probeOutput.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
                if (durationMatch) {
                    const hours = parseInt(durationMatch[1]);
                    const minutes = parseInt(durationMatch[2]);
                    const seconds = parseInt(durationMatch[3]);
                    duration = hours * 3600 + minutes * 60 + seconds;
                }

                const args = [
                    '-i', inputPath,
                    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                    '-c:a', 'aac', '-b:a', '128k',
                    '-movflags', '+faststart',
                    '-progress', 'pipe:1',
                    '-y', actualOutputPath
                ];

                const ffmpeg = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
                this.activeConversions.set(mediaId, { process: ffmpeg, progress: 0 });

                let progressData = '';
                ffmpeg.stdout.on('data', (data) => {
                    progressData += data.toString();
                    const lines = progressData.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('out_time_ms=')) {
                            const timeMs = parseInt(line.split('=')[1]) / 1000000;
                            if (duration > 0) {
                                const progress = Math.min(100, Math.round((timeMs / duration) * 100));
                                this.activeConversions.get(mediaId).progress = progress;
                                this.emit('progress', { mediaId, playlistId, progress });
                            }
                        }
                    }
                });

                ffmpeg.stderr.on('data', (data) => {
                    const msg = data.toString();
                    if (msg.includes('Error') || msg.includes('error')) console.error(`[ConversionService] ffmpeg error: ${msg}`);
                });

                ffmpeg.on('close', async (code) => {
                    this.activeConversions.delete(mediaId);
                    if (code === 0) {
                        console.log(`[ConversionService] Conversion complete.`);

                        // Generate thumbnail
                        try {
                            await this.generateThumbnail(actualOutputPath, thumbnailPath);
                        } catch (e) {
                            console.error(`[ConversionService] Thumbnail generation failed: ${e.message}`);
                        }

                        // Handle file moves/deletes
                        if (isTempOutput) {
                            // Overwrite original input with temp output
                            try {
                                await fs.promises.rename(actualOutputPath, finalOutputPath);
                            } catch (e) {
                                console.error(`[ConversionService] Failed to overwrite original: ${e.message}`);
                                reject(e);
                                return;
                            }
                        } else {
                            // Different files. Delete input.
                            if (inputPath !== finalOutputPath) {
                                try {
                                    await fs.promises.unlink(inputPath);
                                } catch (e) {
                                    console.warn(`[ConversionService] Could not delete input: ${e.message}`);
                                }
                            }
                        }

                        const result = {
                            outputPath: finalOutputPath,
                            thumbnailPath: fs.existsSync(thumbnailPath) ? thumbnailPath : null,
                            duration: duration * 1000
                        };

                        this.emit('complete', { mediaId, playlistId, ...result });
                        resolve(result);
                    } else {
                        const error = new Error(`ffmpeg exited with code ${code}`);
                        this.emit('error', { mediaId, playlistId, error: error.message });
                        reject(error);
                    }
                });

                ffmpeg.on('error', (err) => {
                    this.activeConversions.delete(mediaId);
                    this.emit('error', { mediaId, playlistId, error: err.message });
                    reject(err);
                });
            });
        });
    }

    /**
     * Generate a thumbnail from video
     */
    async generateThumbnail(videoPath, thumbnailPath) {
        return new Promise((resolve, reject) => {
            const args = [
                '-i', videoPath,
                '-ss', '00:00:01.000',
                '-vframes', '1',
                '-vf', 'scale=256:-1',
                '-y',
                thumbnailPath
            ];

            const ffmpeg = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'ignore'] });

            ffmpeg.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Thumbnail generation exited with code ${code}`));
            });

            ffmpeg.on('error', (err) => reject(err));
        });
    }

    /**
     * Generate a thumbnail from image
     */
    async generateImageThumbnail(imagePath, thumbnailPath) {
        return new Promise((resolve, reject) => {
            const args = [
                '-i', imagePath,
                '-vf', 'scale=256:-1',
                '-y',
                thumbnailPath
            ];

            const ffmpeg = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'ignore'] });

            ffmpeg.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Thumbnail generation exited with code ${code}`));
            });

            ffmpeg.on('error', (err) => reject(err));
        });
    }

    /**
     * Cancel an active conversion
     */
    cancel(mediaId) {
        const conversion = this.activeConversions.get(mediaId);
        if (conversion && conversion.process) {
            conversion.process.kill('SIGTERM');
            this.activeConversions.delete(mediaId);
            console.log(`[ConversionService] Cancelled conversion: ${mediaId}`);
        }
    }

    /**
     * Get progress for a specific conversion
     */
    getProgress(mediaId) {
        const conversion = this.activeConversions.get(mediaId);
        return conversion ? conversion.progress : null;
    }
}

module.exports = new ConversionService();
