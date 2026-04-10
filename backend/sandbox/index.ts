import vm from 'vm';

/**
 * Executes a dynamically generated JavaScript function string within an isolated Node.js context.
 *
 * @param functionCode The string representation of the JavaScript code to execute.
 * @param args Arguments to pass to the function.
 * @returns The result of the execution.
 */
export async function executeToolSandbox(functionCode: string, args: any = {}): Promise<any> {
    try {
        // Create an isolated context
        const sandbox = {
            console: {
                log: (...logs: any[]) => console.log('[SANDBOX LOG]', ...logs),
                error: (...logs: any[]) => console.error('[SANDBOX ERROR]', ...logs),
                warn: (...logs: any[]) => console.warn('[SANDBOX WARN]', ...logs),
            },
            // Include basic built-ins and some helpful async utilities
            Math,
            Date,
            JSON,
            String,
            Number,
            Boolean,
            Array,
            Object,
            setTimeout,
            clearTimeout,
            Promise,
            fetch: fetch, // Allow fetching external APIs from the sandbox
            // Pass the arguments to the sandbox context
            args: args
        };

        const context = vm.createContext(sandbox);

        // Allow 'await' in the functionCode by wrapping it in an async function
        // and calling it. The function takes the 'args' object.
        const wrappedCode = `
            (async function(args) {
                ${functionCode}
            })(args);
        `;

        const script = new vm.Script(wrappedCode);

        // Execute the script within the isolated context
        const promiseResult = script.runInContext(context, {
            timeout: 5000 // 5 seconds timeout to prevent infinite loops (synchronous blocks)
        });

        // Wait for the async code to finish.
        // Node's vm context timeout only applies to synchronous code.
        // We'll wrap the promise in a timeout Promise to ensure async code doesn't hang forever.
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Async execution timed out after 5000ms')), 5000)
        );

        const result = await Promise.race([promiseResult, timeoutPromise]);

        return result;

    } catch (error: any) {
        console.error('[SANDBOX ERROR]', error);
        throw new Error(`Tool execution failed: ${error.message}`);
    }
}
