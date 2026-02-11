export const getBaseUrl = () => {
    // If we are in dev mode (Vite typically runs on 5173), fallback to port 3000 on the same host
    if (window.location.port === '5173') {
        return `http://${window.location.hostname}:3000`;
    }
    // In production/electron where server serves the manager, use origin
    return window.location.origin;
};

export const getThumbnailUrl = (item) => {
    const baseUrl = getBaseUrl();
    if (item.thumbnailPath) return `${baseUrl}${item.thumbnailPath}`;
    if (item.thumbnail) {
        if (item.thumbnail.startsWith('data:')) return item.thumbnail;
        if (item.thumbnail.startsWith('/')) return `${baseUrl}${item.thumbnail}`;
        // If it's just a filename and we have a path property (which decorated library items have)
        if (item.path) {
            const dir = item.path.substring(0, item.path.lastIndexOf('/') + 1);
            return `${baseUrl}${dir}${item.thumbnail}`;
        }
    }
    return '';
};
