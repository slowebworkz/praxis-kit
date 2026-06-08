import { StrictMode } from './config.js';

type Capabilities = {
    readonly createClassPipeline?: (opts: Record<string, unknown>) => (props: Record<string, unknown>) => string;
    readonly AriaEngine?: new (strict?: StrictMode, options?: {
        rules?: readonly unknown[];
    }) => object;
};

export type { Capabilities };
