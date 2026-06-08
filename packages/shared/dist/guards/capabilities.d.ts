import { Capabilities } from '../types/capabilities.js';
import '../types/config.js';

declare function isCapability(value: unknown): value is Capabilities;
declare function isCapabilityMap(value: unknown): value is Record<string, Capabilities>;
declare function isCapabilities(value: unknown): value is Capabilities;

export { isCapabilities, isCapability, isCapabilityMap };
