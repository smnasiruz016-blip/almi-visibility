/**
 * F16 · C25 · THE ADAPTERS BUILT BUT NOT REGISTERED (RR-161) — each one's OPTIONS CHECK only, never its constructor.
 *
 * An adapter built under its owner's issued record, and proved against a fake network exit, is listed here so that a plan naming its
 * provider is refused PRECISELY — PROVIDER_ADAPTER_BUILT_NOT_REGISTERED, with its options checked — rather than as if no adapter existed.
 * Nothing here can construct an adapter or reach a provider: only `optionsRefusals` is exposed. Constructing one happens ONLY through the
 * registry (./index.mjs), and registering is the pilot round's act, with F77's reopening (the owner's RR-82 §2.2 ruling).
 */
import * as anthropic from "./anthropic.mjs";

export const BUILT_ADAPTERS = Object.freeze({
  [anthropic.PROVIDER_ID]: Object.freeze({ optionsRefusals: anthropic.optionsRefusals }),
});
