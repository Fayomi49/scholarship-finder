import type { Opportunity } from "./schema";

const countriesByRegion: Record<string, Set<string>> = {
  europe: new Set(
    "AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM TR UA VA XK".split(
      " ",
    ),
  ),
  "north-america": new Set(
    "US CA MX AG AI AW BB BL BM BQ BS CU CW DM DO GD GL GP HT JM KN KY LC MF MQ MS PM PR SX TC TT VC VG VI".split(
      " ",
    ),
  ),
  "central-america": new Set("BZ CR SV GT HN NI PA".split(" ")),
  "south-america": new Set(
    "AR BO BR CL CO EC FK GF GY PE PY SR UY VE".split(" "),
  ),
};
export function supportedGeography(op: Opportunity) {
  if (op.deliveryMode === "remote" || op.region === "remote") return true;
  return Boolean(op.country && countriesByRegion[op.region]?.has(op.country));
}
