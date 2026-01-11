type RetryOptions = {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
};

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        maxDelay = 10000
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt === maxRetries) {
                break;
            }

            const delay = Math.min(
                baseDelay * Math.pow(2, attempt),
                maxDelay
            );

            console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
            await sleep(delay);
        }
    }

    throw lastError!;
}

export default retryWithBackoff;
