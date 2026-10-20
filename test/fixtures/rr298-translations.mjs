/**
 * RR-298 · TEST TRANSLATIONS of the RR-296 test project — written by CC's own session, FOR THE TESTS ONLY (the owner's rule: a client's
 * translation runs on the client's own AI connection). Spanish and Arabic (right-to-left); the same facts, numbers, sources and dates.
 */
export const BY = "TEST — translated by CC's own session (tests only; a client's translation runs on the client's own AI connection)";
const t = (lang, question, claims, cards) => Object.freeze({ lang, question, claims, cards, by: BY });

export const TRANSLATIONS = Object.freeze({
  "n-fee": [
    t("es", "¿Cuánto cuesta el examen de licencia Widgetry?", [{ claimId: "w-fee-1", text: "El examen de licencia Widgetry cuesta WB$120." }], [{ claimId: "w-fee-1", value: "WB$120" }]),
    t("ar", "كم تبلغ تكلفة امتحان رخصة Widgetry؟", [{ claimId: "w-fee-1", text: "تبلغ تكلفة امتحان رخصة Widgetry مبلغ WB$120." }], [{ claimId: "w-fee-1", value: "WB$120" }]),
  ],
  "n-valid": [
    t("es", "¿Cuánto tiempo valen los resultados del examen Widgetry?", [{ claimId: "w-valid-1", text: "Los resultados del examen de licencia Widgetry son válidos durante 2 años desde la fecha del examen." }], [{ claimId: "w-valid-1", value: "2 años" }]),
    t("ar", "ما مدة صلاحية نتائج امتحان رخصة Widgetry؟", [{ claimId: "w-valid-1", text: "نتائج امتحان رخصة Widgetry صالحة لمدة 2 سنوات من تاريخ الامتحان." }], [{ claimId: "w-valid-1", value: "2 سنوات" }]),
  ],
  "t-online": [
    t("es", "¿Puedo hacer el examen de licencia Widgetry en línea?", [{ claimId: "w-online-1", text: "El examen de licencia Widgetry se puede hacer en línea desde casa." }], [{ claimId: "w-online-1", value: "en línea desde casa" }]),
    t("ar", "هل يمكنني أداء امتحان رخصة Widgetry عبر الإنترنت؟", [{ claimId: "w-online-1", text: "يمكن أداء امتحان رخصة Widgetry عبر الإنترنت من المنزل." }], [{ claimId: "w-online-1", value: "عبر الإنترنت من المنزل" }]),
  ],
});

/** A BAD translation: it changes the fee's number — it must be refused, and that language not published. */
export const BAD = t("es", "¿Cuánto cuesta el examen de licencia Widgetry?", [{ claimId: "w-fee-1", text: "El examen de licencia Widgetry cuesta WB$102." }], [{ claimId: "w-fee-1", value: "WB$102" }]);
