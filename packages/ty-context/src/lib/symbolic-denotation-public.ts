import { denoteDesignResourceSymbolicPoint } from "./design-resource-symbolic-denotation.js";
import {
  compileSymbolicDenotation,
  evaluateCanonicalSymbolicDenotation,
} from "./symbolic-denotation-engine.js";

export const symbolicDenotation = Object.freeze({
  compile: compileSymbolicDenotation,
  evaluate: evaluateCanonicalSymbolicDenotation,
  denoteDesignPoint: denoteDesignResourceSymbolicPoint,
});
