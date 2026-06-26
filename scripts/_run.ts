// Generic script dispatcher: `pnpm script <name> [args...]` runs scripts/<name>.ts.
// If a script needs a .env, add `dotenv` and `import "dotenv/config";` at the top here.

const [, , name, ...args] = process.argv;

if (!name) {
    console.error("Usage: pnpm script <script-name> [args...]");
    process.exit(1);
}

(async () => {
    try {
        // Resolve scripts/<name>.ts to an absolute URL (relative to this file) so
        // vite-node loads it regardless of CWD.
        const target = new URL(`./${name}.ts`, import.meta.url).href;
        const mod = await import(target);

        // If the script exports a default function, call it with the remaining args.
        if (typeof mod.default === "function") {
            const result = mod.default(...args);
            if (result instanceof Promise) await result;
        }

        console.log("⭐ Script finished ⭐");
        process.exit(0);
    } catch (err) {
        console.error(`Could not run scripts/${name}.ts`);
        console.error(err);
        process.exit(1);
    }
})();
