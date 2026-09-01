import { after, test } from "node:test";
import { cleanupFixtures } from "./required-critical-sentinel-runner-fixture.mjs";
import { assertPassingProjection } from "./required-critical-sentinel-runner-basics.mjs";
import { assertBoundedProcessTree } from "./required-critical-sentinel-runner-basics.mjs";
import { assertMarkerMutationRejection } from "./required-critical-sentinel-runner-basics.mjs";
import { assertRuntimeAttributionRejection } from "./required-critical-sentinel-runner-basics.mjs";
import { assertSuiteWideOwnerUniqueness } from "./required-critical-sentinel-runner-basics.mjs";
import { assertDynamicTitleRejection } from "./required-critical-sentinel-runner-declarations.mjs";
import { assertAliasAndImportedDeclarationResolution } from "./required-critical-sentinel-runner-declarations.mjs";
import { assertModuleInitializationAttribution } from "./required-critical-sentinel-runner-declarations.mjs";
import { assertTestContextAndSuiteClosure } from "./required-critical-sentinel-runner-declarations.mjs";
import { assertEscapedCallableAndOpaqueCallbackRejection } from "./required-critical-sentinel-runner-reference-guards.mjs";
import { assertHiddenNodeTestAcquisition } from "./required-critical-sentinel-runner-acquisition.mjs";
import { assertStaticLocalLoaderClosure } from "./required-critical-sentinel-runner-local-loaders.mjs";
import { assertConstructorCapabilityProvenance } from "./required-critical-sentinel-runner-constructor.mjs";
import { assertLexicalShadowingAndInertSource } from "./required-critical-sentinel-runner-constructor.mjs";
import { assertParameterBodyEnvironmentBoundary } from "./required-critical-sentinel-runner-terminal.mjs";
import { assertDynamicModuleLoadingRejection } from "./required-critical-sentinel-runner-terminal.mjs";
import { assertNonPassingSentinelRejection } from "./required-critical-sentinel-runner-terminal.mjs";
import { assertPlatformApplicability } from "./required-critical-sentinel-runner-terminal.mjs";
import { assertReporterFailureHandling } from "./required-critical-sentinel-runner-terminal.mjs";
import { assertClosedRunnerArguments } from "./required-critical-sentinel-runner-terminal.mjs";

after(cleanupFixtures);

test("required sentinel runner accepts one applicable, selected-owner passing occurrence", async () => {
  await assertPassingProjection();
});

test("required sentinel runner bounds registration projection time and settles descendants", async () => {
  await assertBoundedProcessTree();
});

test("required sentinel runner rejects removed, renamed, and duplicate markers", async () => {
  await assertMarkerMutationRejection();
});

test("required sentinel runner rejects wrong-owner, imported, and unattributed events", async () => {
  await assertRuntimeAttributionRejection();
});

test("required sentinel runner rejects suite-wide wrong owners and unloaded duplicates", async () => {
  await assertSuiteWideOwnerUniqueness();
});

test("required sentinel runner fails closed on every dynamic node:test title form", async () => {
  await assertDynamicTitleRejection();
});

test("required sentinel runner resolves immutable aliases and imported helper declarations", async () => {
  await assertAliasAndImportedDeclarationResolution();
});

test("required sentinel runtime attributes module-initialization tests outside declaration ownership", async () => {
  await assertModuleInitializationAttribution();
});

test("required sentinel inventory closes TestContext and suite registration paths", async () => {
  await assertTestContextAndSuiteClosure();
});

test("required sentinel inventory rejects escaped callables and opaque test callbacks", async () => {
  await assertEscapedCallableAndOpaqueCallbackRejection();
});

test("required sentinel inventory rejects hidden node:test acquisition and follows static local loaders", async () => {
  await assertHiddenNodeTestAcquisition();
  await assertStaticLocalLoaderClosure();
});

test("required sentinel inventory preserves module.constructor capability provenance", async () => {
  await assertConstructorCapabilityProvenance();
});

test("required sentinel inventory permits lexical shadowing and inert critical source text", async () => {
  await assertLexicalShadowingAndInertSource();
});

test("required sentinel inventory preserves the parameter/body environment boundary", async () => {
  await assertParameterBodyEnvironmentBoundary();
});

test("required sentinel inventory rejects unresolved and nonlocal dynamic module loading", async () => {
  await assertDynamicModuleLoadingRejection();
});

test("required sentinel runner rejects skipped and failed sentinel results", async () => {
  await assertNonPassingSentinelRejection();
});

test("required sentinel runner derives and enforces current platform applicability", async () => {
  await assertPlatformApplicability();
});

test("required sentinel runner rejects missing and corrupt reporter output", async () => {
  await assertReporterFailureHandling();
});

test("required sentinel runner accepts no caller-selected owner, platform, reporter, or test options", async () => {
  await assertClosedRunnerArguments();
});
