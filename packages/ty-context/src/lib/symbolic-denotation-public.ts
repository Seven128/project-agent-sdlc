import { denoteDesignResourceSymbolicPoint } from "./design-resource-symbolic-denotation.js";
import {
  compileSymbolicDenotation,
  evaluateCanonicalSymbolicDenotation,
} from "./symbolic-denotation-engine.js";
import {
  DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_MEDIA_TYPE,
  DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_SCHEMA_VERSION,
} from "./design-resource-symbolic-source-ir-types.js";

export const symbolicDenotation = Object.freeze({
  compile: compileSymbolicDenotation,
  evaluate: evaluateCanonicalSymbolicDenotation,
  denoteDesignPoint: denoteDesignResourceSymbolicPoint,
  sourceIr: Object.freeze({
    mediaType: DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_MEDIA_TYPE,
    schemaVersion: DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_SCHEMA_VERSION,
  }),
});
