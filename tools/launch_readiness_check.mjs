#!/usr/bin/env node
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const options = { offline: false, json: false, output: null, strictExternal: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--offline") {
      options.offline = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--strict-external") {
      options.strictExternal = true;
    } else if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--output requires a path");
      }
      options.output = path.resolve(value);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`launch_readiness_check.mjs

Checks local launch-readiness surfaces and optionally compares public GitHub/npm
metadata against local package metadata.

Usage:
  node tools/launch_readiness_check.mjs [--offline] [--json] [--output tmp/ty-context/launch-readiness.md]
  node tools/launch_readiness_check.mjs --strict-external
`);
}

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function hasFile(relativePath) {
  return existsSync(path.join(repoRoot, relativePath));
}

function fileSize(relativePath) {
  return statSync(path.join(repoRoot, relativePath)).size;
}

function readBytes(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath));
}

function isGif(relativePath) {
  if (!hasFile(relativePath)) {
    return false;
  }
  const bytes = readBytes(relativePath);
  const header = bytes.subarray(0, 6).toString("ascii");
  return (header === "GIF89a" || header === "GIF87a") && bytes.includes(Buffer.from("NETSCAPE2.0", "ascii"));
}

function pngDimensions(relativePath) {
  if (!hasFile(relativePath)) {
    return null;
  }
  const bytes = readBytes(relativePath);
  const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || !pngHeader.every((value, index) => bytes[index] === value)) {
    return null;
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function pngIs(relativePath, width, height) {
  const dimensions = pngDimensions(relativePath);
  return dimensions?.width === width && dimensions?.height === height;
}

function addCheck(checks, id, ok, detail, severity = "required") {
  checks.push({ id, ok: Boolean(ok), detail, severity });
}

function contains(content, pattern) {
  return pattern.test(content);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function firstLines(content, count) {
  return content.split(/\r?\n/).slice(0, count).join("\n");
}

function hasCjk(content) {
  return /[\u3400-\u9fff]/.test(content);
}

const scorecardBadgePattern =
  /\[!\[OpenSSF Scorecard\]\(https:\/\/api\.securityscorecards\.dev\/projects\/github\.com\/Seven128\/project-tiny-context-harness\/badge\)\]\(https:\/\/securityscorecards\.dev\/viewer\/\?uri=github\.com\/Seven128\/project-tiny-context-harness\)/;
const liveNpmVersionBadgePattern = /https:\/\/img\.shields\.io\/npm\/v\/project-tiny-context-harness\.svg/;

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": "project-tiny-context-harness-launch-readiness",
      Accept: "application/vnd.github+json, application/json"
    };
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token && url.startsWith("https://api.github.com/")) {
      headers.Authorization = `Bearer ${token}`;
    }
    const request = https.get(
      url,
      {
        headers,
        timeout: 20_000
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`${url} returned HTTP ${response.statusCode}: ${body.slice(0, 300)}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    request.on("timeout", () => {
      request.destroy(new Error(`${url} timed out`));
    });
    request.on("error", reject);
  });
}

function localChecks() {
  const checks = [];
  const rootPackage = readJson("package.json");
  const packageJson = readJson("packages/ty-context/package.json");
  const devcontainerConfig = readJson(".devcontainer/devcontainer.json");
  const rootReadme = read("README.md");
  const packageReadme = read("packages/ty-context/README.md");
  const packageGuide = read("packages/ty-context/assets/README.md");
  const spec = read("PROJECT_SPEC.md");
  const zhReadme = read("README.zh-CN.md");
  const codeOfConduct = read("CODE_OF_CONDUCT.md");
  const support = read("SUPPORT.md");
  const governance = read("GOVERNANCE.md");
  const contributing = read("CONTRIBUTING.md");
  const launchKit = read("docs/launch/README.md");
  const githubMetadataRunbook = read("docs/launch/github-metadata.md");
  const launchProfile = read("docs/launch/profile.md");
  const claimsBoundary = read("docs/launch/claims-boundary.md");
  const primaryLaunch = read("docs/launch/primary-launch.md");
  const feedbackTriage = read("docs/launch/feedback-triage.md");
  const reviewerQuickstart = read("docs/launch/reviewer-quickstart.md");
  const privateReview = read("docs/launch/private-review.md");
  const privateReviewShortlist = read("docs/launch/private-review-shortlist.md");
  const privateReviewLogTemplate = read("docs/launch/private-review-log-template.md");
  const adoptionStoryTemplate = read("docs/launch/adoption-story-template.md");
  const npmPublishRunbook = read("docs/launch/npm-publish-runbook.md");
  const npmCredentialUnblock = read("docs/launch/npm-credential-unblock.md");
  const npmTrustedPublishing = read("docs/launch/npm-trusted-publishing.md");
  const githubReleasePacketPath = `docs/launch/github-release-${packageJson.version}.md`;
  const githubReleasePacket = read(githubReleasePacketPath);
  const prelaunchExternalBlockers = read("docs/launch/prelaunch-external-blockers.md");
  const codexForOssApplication = read("docs/launch/codex-for-oss-application.md");
  const openssfBestPractices = read("docs/launch/openssf-best-practices.md");
  const awesomeListSubmissions = read("docs/launch/awesome-list-submissions.md");
  const responseTemplates = read("docs/launch/response-templates.md");
  const agentSurfaceRecipes = read("docs/agent-surface-recipes.md");
  const comparisonGuide = read("docs/comparison.md");
  const benchmarkingGuide = read("docs/benchmarking.md");
  const technicalArticle = read("docs/articles/fresh-agent-project-memory.md");
  const existingRepoAdoption = read("docs/adopt-existing-repo.md");
  const faq = read("docs/faq.md");
  const roadmap = read("docs/roadmap.md");
  const freshAgentWalkthrough = read("docs/examples/fresh-agent-recovery.md");
  const minimalContextSample = read("docs/examples/minimal-context-sample.md");
  const browseableSampleReadme = read("examples/minimal-context-sample/README.md");
  const browseableSamplePackage = readJson("examples/minimal-context-sample/package.json");
  const browseableSampleAgents = read("examples/minimal-context-sample/AGENTS.md");
  const browseableSampleGlobal = read("examples/minimal-context-sample/project_context/global.md");
  const browseableSampleArchitecture = read("examples/minimal-context-sample/project_context/architecture.md");
  const browseableSampleArea = read("examples/minimal-context-sample/project_context/areas/main.md");
  const browseableSampleVerification = read("examples/minimal-context-sample/project_context/areas/main/verification.md");
  const browseableSampleSource = read("examples/minimal-context-sample/src/label-routing/suggest-labels.mjs");
  const browseableSampleTest = read("examples/minimal-context-sample/tests/label-routing.test.mjs");
  const externalPrPacket = read("docs/launch/external-prs/README.md");
  const transcendaPatch = read("docs/launch/external-prs/transcenda-awesome-agentic-coding.patch");
  const jordimasPatch = read("docs/launch/external-prs/jordimas-awesome-agentic-engineering.patch");
  const awesomeOpenCodePatch = read("docs/launch/external-prs/awesome-opencode-project-tiny-context-harness.patch");
  const awesomeAiDevtoolsPatch = read("docs/launch/external-prs/jamesmurdza-awesome-ai-devtools.patch");
  const aiBoostPatch = read("docs/launch/external-prs/ai-boost-awesome-harness-engineering.patch");
  const picrewPatch = read("docs/launch/external-prs/picrew-awesome-agent-harness-data.patch");
  const demoPacket = read("docs/launch/demo.md");
  const metricsPacket = read("docs/launch/metrics.md");
  const metricsScript = read("tools/launch_metrics_snapshot.mjs");
  const hnSnapshotScript = read("tools/launch_hn_snapshot.mjs");
  const feedbackNoteScript = read("tools/launch_feedback_note.mjs");
  const githubMetadataScript = read("tools/github_metadata_update.mjs");
  const npmAccessScript = read("tools/npm_publish_access_check.mjs");
  const launchUnblockScript = read("tools/launch_unblock_check.mjs");
  const launchNextScript = read("tools/launch_next_steps.mjs");
  const externalPrPacketScript = read("tools/external_pr_packet_check.mjs");
  const sourcePreviewScript = read("tools/source_preview_pack.mjs");
  const marketMap = read("docs/launch/market-map.md");
  const outreachTargets = read("docs/launch/outreach-targets.md");
  const sourceWorkflow = read(".github/workflows/harness.yml");
  const maintainerWorkflow = read(".github/workflows/package.yml");
  const npmTrustedPublishWorkflow = read(".github/workflows/npm-publish.yml");
  const scorecardWorkflow = read(".github/workflows/scorecard.yml");
  const issueTemplateConfig = read(".github/ISSUE_TEMPLATE/config.yml");
  const adoptionReportTemplate = read(".github/ISSUE_TEMPLATE/adoption_report.yml");
  const contextGapTemplate = read(".github/ISSUE_TEMPLATE/context_gap.yml");
  const sourcePreviewReportTemplate = read(".github/ISSUE_TEMPLATE/source_preview_report.yml");
  const releaseScript = read("tools/release_npm.mjs");
  const releasePrepareScript = read("tools/release_prepare.mjs");
  const releasePublishScript = read("tools/release_publish.mjs");
  const syncReleaseVersionScript = read("tools/sync_release_version.mjs");
  const githubReleasePublishScript = read("tools/github_release_publish.mjs");
  const managedMakefile = read(".codex/ty-context-managed/make/ty-context.mk");
  const packagedMakefile = read("packages/ty-context/assets/make/ty-context.mk");
  const codespacesUrlPattern = /https:\/\/codespaces\.new\/Seven128\/project-tiny-context-harness/;
  const packageVersionPattern = escapeRegExp(packageJson.version);
  const sourcePreviewTarballPattern = new RegExp(
    `tmp\\/ty-context\\/source-preview\\/package\\/project-tiny-context-harness-${packageVersionPattern}\\.tgz`
  );

  addCheck(checks, "root-package-name", rootPackage.name === "project-tiny-context-harness", "Root package name is project-tiny-context-harness.");
  addCheck(checks, "root-license", rootPackage.license === "MIT" && hasFile("LICENSE"), "Root package has MIT license metadata and LICENSE file.");
  addCheck(
    checks,
    "package-metadata",
    packageJson.license === "MIT" &&
      packageJson.homepage === "https://github.com/Seven128/project-tiny-context-harness#readme" &&
      packageJson.repository?.url === "git+https://github.com/Seven128/project-tiny-context-harness.git" &&
      packageJson.bugs?.url === "https://github.com/Seven128/project-tiny-context-harness/issues",
    "npm package has license, homepage, repository and bugs metadata."
  );
  for (const keyword of [
    "ai-agents",
    "coding-agent",
    "context-engineering",
    "context-management",
    "project-memory",
    "agent-memory",
    "agents-md",
    "claude-code",
    "cursor",
    "gemini-cli",
    "opencode",
    "ai-coding",
    "developer-productivity"
  ]) {
    addCheck(checks, `package-keyword-${keyword}`, packageJson.keywords?.includes(keyword), `npm package keyword includes ${keyword}.`);
  }
  addCheck(checks, "package-license-file", hasFile("packages/ty-context/LICENSE"), "Packaged npm workspace includes LICENSE.");

  const updateModeDocs = [rootReadme, packageReadme, packageGuide, spec];
  addCheck(
    checks,
    "harness-update-mode-contract",
    updateModeDocs.every(
      (content) =>
        contains(content, /upgrade --check/) &&
        contains(content, /sync-only/) &&
        contains(content, /upgrade-required/) &&
        contains(content, /manual-required/) &&
        contains(content, /safe_pending/) &&
        contains(content, /manual_required/) &&
        contains(content, /blocked/) &&
        contains(content, /sync.*does not run migrations|does not run migrations/s)
    ) &&
      contains(rootReadme, /After updating the package, run `ty-context upgrade`/) &&
      contains(packageReadme, /After updating the package, run `ty-context upgrade`/) &&
      contains(spec, /Release update mode is part of the release contract/) &&
      contains(githubReleasePacket, /Update Mode: `(sync-only|upgrade-required|manual-required)`/) &&
      contains(githubReleasePacket, /ty-context upgrade --check/) &&
      contains(syncReleaseVersionScript, /Release update mode for/) &&
      contains(syncReleaseVersionScript, /extractReleaseUpdateMode/) &&
      contains(releasePublishScript, /readReleaseUpdateMode/),
    "README, package README, package asset README, spec, release packet and release report generator expose sync-only / upgrade-required / manual-required update semantics."
  );

  for (const [id, content] of [
    ["root-readme", rootReadme],
    ["package-readme", packageReadme]
  ]) {
    addCheck(
      checks,
      `${id}-positioning`,
      contains(content, /Project Tiny Context Harness/) &&
        contains(content, /repo-native project memory for AI coding agents/i) &&
        contains(content, /keep the memory, drop the ceremony/i),
      `${id} states Project Tiny Context Harness positioning.`
    );
    addCheck(checks, `${id}-why`, contains(content, /Why It Exists/), `${id} includes Why It Exists.`);
    addCheck(checks, `${id}-positioning-table`, contains(content, /Positioning/) && contains(content, /Spec-first kits/) && contains(content, /Task Master-style/), `${id} includes competitor positioning table.`);
    addCheck(
      checks,
      `${id}-fit-boundary`,
      contains(content, /Best for:/) &&
        contains(content, /Not for:/) &&
        contains(content, /durable project memory behind `AGENTS\.md`/) &&
        contains(content, /multiple agents or frequent fresh chats/) &&
        contains(content, /autonomous Tiny Context execution/) &&
        contains(content, /codebase semantic indexing or external docs retrieval/),
      `${id} gives first-visitor fit and non-fit boundaries.`
    );
    addCheck(
      checks,
      `${id}-before-after`,
      contains(content, /Concrete shift:/) &&
        contains(content, /Before: ask a fresh agent to read the repo and tell you what matters\./) &&
        contains(content, /After: ask it to read AGENTS\.md and project_context\/\*\* first/) &&
        contains(content, /validation paths before proposing code/),
      `${id} gives a static before/after recovery example.`
    );
    addCheck(
      checks,
      `${id}-recovery-diagram`,
      contains(content, /What gets added:/) &&
        contains(content, /```mermaid/) &&
        contains(content, /Fresh agent session/) &&
        contains(content, /AGENTS\.md startup router/) &&
        contains(content, /project_context\/\*\* durable facts/) &&
        contains(content, /Tests \/ CI \/ review/) &&
        contains(content, /Product quality evidence/) &&
        contains(content, /does not own/),
      `${id} includes a visual recovery diagram that separates Context recovery from product-quality evidence.`
    );
    addCheck(checks, `${id}-quickstart`, contains(content, /Try It In 60 Seconds/) && contains(content, /make validate-context/), `${id} includes quickstart.`);
    addCheck(checks, `${id}-success-surface`, contains(content, /Expected result/) && contains(content, /Fresh-agent test prompt/), `${id} shows expected generated files and a fresh-agent test prompt.`);
    addCheck(
      checks,
      `${id}-demo-media`,
      contains(content, /demo-terminal\.gif/) &&
        contains(content, /The demo shows the core loop/) &&
        contains(content, /Use the npm install path below, or inspect the no-install previews first/),
      `${id} embeds the launch demo GIF and explains the recovery loop while routing visitors to npm install first.`
    );
    addCheck(
      checks,
      `${id}-no-install-preview`,
      contains(firstLines(content, 70), /No-install preview:/) &&
        contains(firstLines(content, 70), /fresh-agent recovery walkthrough/) &&
        contains(firstLines(content, 70), /Minimal Context sample guide/) &&
        contains(firstLines(content, 70), /examples\/minimal-context-sample/) &&
        contains(launchKit, /No-install preview/) &&
        contains(launchKit, /Visitors can understand the generated recovery surface before local setup, source checkout or Codespaces startup/),
      `${id} gives first-screen no-install links to the walkthrough and browseable sample.`
    );
  }
  addCheck(
    checks,
    "public-language-posture",
    contains(rootReadme, /English-first/) &&
      contains(packageReadme, /English-first/) &&
      !hasCjk(firstLines(rootReadme, 24)) &&
      !hasCjk(firstLines(packageReadme, 24)) &&
      contains(launchKit, /Language Posture/) &&
      contains(launchKit, /GitHub description, README first screen, npm copy/) &&
      contains(primaryLaunch, /Public-facing copy is English-first/) &&
      contains(outreachTargets, /README, npm and launch copy English-first/),
    "Public README, npm README and launch packet keep external promotion English-first, with no CJK text in the README first screen and only secondary localized docs."
  );
  addCheck(
    checks,
    "public-readme-renamed-surfaces",
    !contains(rootReadme, /AI Tiny Context Harness|agent-project-ty-context|project-agent-ty-context|stage-based Tiny Context Harness/) &&
      !contains(packageReadme, /AI Tiny Context Harness|agent-project-ty-context|project-agent-ty-context|stage-based Tiny Context Harness/),
    "Root README and package README use the Project Tiny Context Harness surface without old display, package or repository names."
  );
  addCheck(
    checks,
    "localized-readme",
    hasFile("README.zh-CN.md") &&
      hasFile("packages/ty-context/assets/README.zh-CN.md") &&
      contains(rootReadme, /Translations: \[Chinese \(Simplified\)\]\(README\.zh-CN\.md\)/) &&
      contains(packageReadme, /Translations: \[Chinese \(Simplified\)\]\(https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/blob\/main\/README\.zh-CN\.md\)/) &&
      contains(zhReadme, /Project Tiny Context Harness 是给 AI coding agents 用的轻量项目记忆层/) &&
      contains(zhReadme, /保留项目记忆，丢掉流程仪式感/) &&
      contains(zhReadme, /英文主入口/) &&
      contains(zhReadme, /中文文档作为二级入口/),
    "Localized Chinese README exists as a secondary entry while public launch surfaces remain English-first."
  );
  addCheck(
    checks,
    "english-first-generated-surfaces",
      !hasCjk(managedMakefile) &&
      !hasCjk(packagedMakefile) &&
      !hasCjk(releaseScript) &&
      !hasCjk(releasePrepareScript) &&
      !hasCjk(releasePublishScript) &&
      !hasCjk(syncReleaseVersionScript) &&
      contains(managedMakefile, /Diagnose Harness root, core package and schema version/) &&
      contains(managedMakefile, /Refresh managed assets; does not run migrations/) &&
      contains(packagedMakefile, /Run safe upgrade migrations, sync managed assets and doctor/) &&
      contains(packagedMakefile, /Check whether project_context\/\*\* supports context recovery/) &&
      contains(syncReleaseVersionScript, /# GitHub Release Packet/) &&
      contains(syncReleaseVersionScript, /## What Changed/) &&
      contains(syncReleaseVersionScript, /Update Mode:/) &&
      contains(syncReleaseVersionScript, /## Manual UI Fallback/) &&
      contains(syncReleaseVersionScript, /Do not claim benchmark wins or adoption in the release/) &&
      contains(releaseScript, /release:npm is now a compatibility entrypoint/) &&
      contains(releasePrepareScript, /release_prepare\.mjs/) &&
      contains(releasePublishScript, /release_publish\.mjs/),
    "Generated Makefile help, release packets and release command guidance stay English-first for npm/package users."
  );
  addCheck(
    checks,
    "scorecard-badge",
    scorecardBadgePattern.test(rootReadme) &&
      scorecardBadgePattern.test(packageReadme) &&
      contains(launchKit, /OpenSSF Scorecard badge/),
    "README and package README expose the OpenSSF Scorecard badge as a first-screen trust surface."
  );
  addCheck(
    checks,
    "npm-version-badge",
    liveNpmVersionBadgePattern.test(firstLines(rootReadme, 16)) &&
      liveNpmVersionBadgePattern.test(firstLines(packageReadme, 16)) &&
      !contains(firstLines(rootReadme, 16), /npm-pending/) &&
      !contains(firstLines(packageReadme, 16), /npm-pending/),
    "README and package README show the live npm version badge now that the renamed package is published."
  );
  addCheck(
    checks,
    "root-readme-install-path",
    contains(rootReadme, /Install:/) &&
      contains(rootReadme, /npm install -D project-tiny-context-harness@latest/) &&
      contains(rootReadme, /npx --yes --package project-tiny-context-harness@latest ty-context init/) &&
      !contains(firstLines(rootReadme, 120), /pending registry publication/) &&
      !contains(firstLines(rootReadme, 120), /Post-publish install path:/) &&
      !contains(firstLines(rootReadme, 120), /Try now before npm publish:/),
    "Root README shows the live npm install path without prepublish caveats."
  );
  addCheck(
    checks,
    "root-readme-source-preview",
    contains(rootReadme, /Source checkout preview:/) &&
      contains(rootReadme, /git clone https:\/\/github\.com\/Seven128\/project-tiny-context-harness\.git/) &&
      contains(rootReadme, /npm run smoke:quickstart/) &&
      contains(rootReadme, /npm run preview:pack/) &&
      contains(rootReadme, sourcePreviewTarballPattern) &&
      contains(rootReadme, /npx --no-install ty-context init --adopt/) &&
      contains(rootReadme, /packs the local workspace, installs it into a disposable repo/) &&
      contains(rootReadme, /validates the generated Minimal Context files/) &&
      contains(rootReadme, /Use this path for package development, source-preview testing or private review/) &&
      contains(rootReadme, /source_preview_report\.yml/),
    "Root README gives maintainers and reviewers a source-based preview path without making it the normal install route."
  );
  addCheck(
    checks,
    "package-readme-source-preview",
    contains(packageReadme, /Source checkout preview/) &&
      contains(packageReadme, /git clone https:\/\/github\.com\/Seven128\/project-tiny-context-harness\.git/) &&
      contains(packageReadme, /npm run smoke:quickstart/) &&
      contains(packageReadme, /npm run preview:pack/) &&
      contains(packageReadme, sourcePreviewTarballPattern) &&
      contains(packageReadme, /npx --no-install ty-context init --adopt/) &&
      contains(packageReadme, /For normal installs, use `project-tiny-context-harness@latest` from npm/) &&
      contains(packageReadme, /source_preview_report\.yml/),
    "Package README gives a source-preview tarball path as a fallback for review and package development."
  );
  addCheck(
    checks,
    "source-preview-pack",
    rootPackage.scripts?.["preview:pack"] === "node tools/source_preview_pack.mjs --clean" &&
      hasFile("tools/source_preview_pack.mjs") &&
      contains(sourcePreviewScript, /Packs the local project-tiny-context-harness workspace into an installable tarball/) &&
      contains(sourcePreviewScript, /source-preview-report\.json/) &&
      contains(sourcePreviewScript, /npx --no-install ty-context init --adopt/) &&
      contains(existingRepoAdoption, /npm run preview:pack/) &&
      contains(existingRepoAdoption, /local packed tarball/) &&
      contains(privateReview, /npm run preview:pack/) &&
      contains(privateReview, /disposable copy of your own repo/) &&
      contains(launchProfile, /npm run preview:pack/) &&
      contains(launchProfile, sourcePreviewTarballPattern),
    "Source-preview tarball path lets reviewers and maintainers test a local package build outside the normal npm install route."
  );
  addCheck(
    checks,
    "source-preview-report-template",
    hasFile(".github/ISSUE_TEMPLATE/source_preview_report.yml") &&
      contains(sourcePreviewReportTemplate, /Source preview report/) &&
      contains(sourcePreviewReportTemplate, /Codespaces/) &&
      contains(sourcePreviewReportTemplate, /Local checkout/) &&
      contains(sourcePreviewReportTemplate, /Generated tarball in a disposable repo/) &&
      contains(sourcePreviewReportTemplate, /npm run preview:pack/) &&
      contains(sourcePreviewReportTemplate, /npx --no-install ty-context init --adopt/) &&
      contains(sourcePreviewReportTemplate, /I removed secrets, customer details, private repository names, raw chat logs and private code/) &&
      contains(issueTemplateConfig, /source_preview_report\.yml/) &&
      contains(rootReadme, /source_preview_report\.yml/) &&
      contains(packageReadme, /source_preview_report\.yml/) &&
      contains(privateReview, /source_preview_report\.yml/) &&
      contains(support, /Source preview report issue template/) &&
      contains(launchKit, /source-preview report form/),
    "Source preview report issue template gives reviewers a focused way to report setup failures without sharing private data."
  );
  addCheck(
    checks,
    "codespaces-preview",
    hasFile(".devcontainer/devcontainer.json") &&
      devcontainerConfig.name === "Project Tiny Context Harness" &&
      devcontainerConfig.image === "mcr.microsoft.com/devcontainers/javascript-node:1-24-bookworm" &&
      devcontainerConfig.postCreateCommand === "npm ci" &&
      contains(rootReadme, codespacesUrlPattern) &&
      contains(packageReadme, codespacesUrlPattern) &&
      contains(existingRepoAdoption, codespacesUrlPattern) &&
      contains(privateReview, codespacesUrlPattern) &&
      contains(launchProfile, codespacesUrlPattern) &&
      contains(launchKit, codespacesUrlPattern) &&
      contains(maintainerWorkflow, /\.devcontainer\/\*\*/),
    "Codespaces source preview gives private reviewers and package developers a no-local-setup path."
  );
  addCheck(
    checks,
    "fresh-agent-walkthrough",
    hasFile("docs/examples/fresh-agent-recovery.md") &&
      contains(rootReadme, /fresh-agent recovery walkthrough/) &&
      contains(freshAgentWalkthrough, /Before Minimal Context/) &&
      contains(freshAgentWalkthrough, /After Minimal Context/) &&
      contains(freshAgentWalkthrough, /not benchmark evidence/),
    "Fresh-agent recovery walkthrough exists, is linked from README and avoids benchmark claims."
  );
  addCheck(
    checks,
    "minimal-context-sample",
    hasFile("docs/examples/minimal-context-sample.md") &&
      contains(rootReadme, /Minimal Context sample guide/) &&
      contains(packageReadme, /Minimal Context sample guide/) &&
      contains(rootReadme, /examples\/minimal-context-sample\//) &&
      contains(packageReadme, /examples\/minimal-context-sample/) &&
      contains(minimalContextSample, /Minimal Context Sample Project/) &&
      contains(minimalContextSample, /examples\/minimal-context-sample\//) &&
      contains(minimalContextSample, /AGENTS\.md/) &&
      contains(minimalContextSample, /project_context\/global\.md/) &&
      contains(minimalContextSample, /project_context\/architecture\.md/) &&
      contains(minimalContextSample, /project_context\/areas\/main\.md/) &&
      contains(minimalContextSample, /project_context\/areas\/main\/verification\.md/) &&
      contains(minimalContextSample, /not a benchmark, template requirement or product-quality proof/i),
    "Minimal Context sample project exists, is linked from README and shows concrete Context file shape without benchmark claims."
  );
  addCheck(
    checks,
    "browseable-sample-repository",
    hasFile("examples/minimal-context-sample/README.md") &&
      hasFile("examples/minimal-context-sample/AGENTS.md") &&
      hasFile("examples/minimal-context-sample/.codex/config.yaml") &&
      hasFile("examples/minimal-context-sample/project_context/context.toml") &&
      hasFile("examples/minimal-context-sample/project_context/global.md") &&
      hasFile("examples/minimal-context-sample/project_context/architecture.md") &&
      hasFile("examples/minimal-context-sample/project_context/areas/main.md") &&
      hasFile("examples/minimal-context-sample/project_context/areas/main/verification.md") &&
      hasFile("examples/minimal-context-sample/src/label-routing/suggest-labels.mjs") &&
      hasFile("examples/minimal-context-sample/tests/label-routing.test.mjs") &&
      browseableSamplePackage.scripts?.test === "node --test tests/*.test.mjs" &&
      browseableSamplePackage.scripts?.["validate-context"] === "node ../../packages/ty-context/dist/cli.js validate-context" &&
      contains(browseableSampleReadme, /not a template requirement, benchmark result or product-quality proof/i) &&
      contains(browseableSampleAgents, /Scope: this file demonstrates what a consumer repository might give to coding agents/) &&
      contains(browseableSampleGlobal, /Do not apply labels to GitHub issues automatically/) &&
      contains(browseableSampleArchitecture, /GitHub write behavior is outside this sample/) &&
      contains(browseableSampleArea, /Do not mutate GitHub issue labels in suggestion code/) &&
      contains(browseableSampleVerification, /Context validation checks the sample recovery files without storing execution results/) &&
      contains(browseableSampleSource, /advisoryOnly: true/) &&
      contains(browseableSampleTest, /builds an advisory-only review payload without an apply URL/),
    "Browseable sample repository includes AGENTS.md, project_context/**, tiny source code and tests without benchmark claims."
  );
  addCheck(
    checks,
    "technical-article",
    hasFile("docs/articles/fresh-agent-project-memory.md") &&
      contains(rootReadme, /docs\/articles\/fresh-agent-project-memory\.md/) &&
      contains(packageReadme, /docs\/articles\/fresh-agent-project-memory\.md/) &&
      contains(launchKit, /\.\.\/articles\/fresh-agent-project-memory\.md/) &&
      contains(primaryLaunch, /fresh-agent-project-memory\.md/) &&
      contains(technicalArticle, /Fresh Coding-Agent Sessions Need Project Memory, Not More Ceremony/) &&
      contains(technicalArticle, /repo-native project memory for AI coding agents, not an autonomous Tiny Context system/) &&
      contains(technicalArticle, /Why Drop The Stage Ceremony/) &&
      contains(technicalArticle, /It is not a benchmark-proven productivity multiplier/) &&
      contains(technicalArticle, /Use npm for the normal install path/) &&
      contains(technicalArticle, /Use the source checkout path for private review, source-preview testing or package development/),
    "Long-form technical article exists, is linked from launch surfaces and keeps claims within the project-memory/no-benchmark boundary."
  );
  addCheck(
    checks,
    "launch-faq",
    hasFile("docs/faq.md") &&
      contains(rootReadme, /FAQ]\(docs\/faq\.md\)/) &&
      contains(packageReadme, /FAQ]\(https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/blob\/main\/docs\/faq\.md\)/) &&
      contains(faq, /Is this just AGENTS\.md\?/) &&
      contains(faq, /Why not just write a better README\?/) &&
      contains(faq, /Why did you remove the old stage-based workflow\?/) &&
      contains(faq, /When should Context be updated\?/) &&
      contains(faq, /Does this replace tests or CI\?/) &&
      contains(faq, /Do not publish benchmark speedup claims from old stage-based results/) &&
      contains(faq, /source preview path/),
    "FAQ exists, is linked from README and answers launch/adoption objections without benchmark overclaiming."
  );
  addCheck(
    checks,
    "benchmarking-guide",
    hasFile("docs/benchmarking.md") &&
      contains(rootReadme, /Benchmarking And Evidence]\(docs\/benchmarking\.md\)/) &&
      contains(packageReadme, /Benchmarking And Evidence]\(https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/blob\/main\/docs\/benchmarking\.md\)/) &&
      contains(faq, /Benchmarking And Evidence]\(benchmarking\.md\)/) &&
      contains(launchKit, /\.\.\/benchmarking\.md/) &&
      contains(benchmarkingGuide, /should not be marketed as benchmark-proven faster yet/) &&
      contains(benchmarkingGuide, /Coding-agent delivery benchmarks rarely have a clean single variable/) &&
      contains(benchmarkingGuide, /Context reading and maintenance cost/) &&
      contains(benchmarkingGuide, /reduced rediscovery/) &&
      contains(benchmarkingGuide, /recovery checkpoint/) &&
      contains(benchmarkingGuide, /same product quality bar/) &&
      contains(benchmarkingGuide, /old stage-based Tiny Context results/) &&
      contains(benchmarkingGuide, /break-even curve/) &&
      contains(benchmarkingGuide, /Old stage-based results prove the current Minimal Context package is faster/) &&
      contains(read("examples/delivery-benchmark/RUNBOOK.md"), /docs\/benchmarking\.md/),
    "Benchmarking guide explains the no-speedup-claim boundary, single-variable difficulty and evidence rules for future Minimal Context reruns."
  );
  addCheck(
    checks,
    "launch-response-templates",
    hasFile("docs/launch/response-templates.md") &&
      contains(launchKit, /response-templates\.md/) &&
      contains(primaryLaunch, /response-templates\.md/) &&
      contains(outreachTargets, /Response templates cover/) &&
      contains(responseTemplates, /AGENTS\.md Overlap/) &&
      contains(responseTemplates, /Benchmark Questions/) &&
      contains(responseTemplates, /Stage Ceremony/) &&
      contains(responseTemplates, /Tests And CI Boundary/) &&
      contains(responseTemplates, /Existing Repos/) &&
      contains(responseTemplates, /Do not claim adoption, awards, benchmark wins or productivity multipliers/) &&
      contains(responseTemplates, /Do not say old stage-based results prove the current package is faster/) &&
      contains(responseTemplates, /Adoption report issue form/),
    "Launch response templates exist and keep public replies narrow, factual and non-hype."
  );
  addCheck(
    checks,
    "private-review-packet",
    hasFile("docs/launch/private-review.md") &&
      contains(launchKit, /private-review\.md/) &&
      contains(launchKit, /private-review-shortlist\.md/) &&
      contains(launchKit, /private-review-log-template\.md/) &&
      contains(launchKit, /adoption-story-template\.md/) &&
      contains(launchKit, /Private review packet/) &&
      contains(launchKit, /reviewer-quickstart\.md/) &&
      contains(outreachTargets, /Private review/) &&
      contains(outreachTargets, /5-10 experienced coding-agent users/) &&
      contains(outreachTargets, /reviewer-quickstart\.md/) &&
      contains(privateReview, /Copy-Paste DM/) &&
      contains(privateReview, /reviewer-quickstart\.md/) &&
      contains(privateReview, /No-install preview/) &&
      contains(privateReview, /docs\/examples\/fresh-agent-recovery\.md/) &&
      contains(privateReview, /examples\/minimal-context-sample/) &&
      contains(privateReview, /Source preview/) &&
      contains(privateReview, /private-review-shortlist\.md/) &&
      contains(privateReview, /private-review-log-template\.md/) &&
      contains(privateReview, /adoption story/) &&
      contains(privateReview, /Do not ask private reviewers for stars/) &&
      contains(privateReview, /strict external launch gate/) &&
      contains(privateReview, /after Show HN/) &&
      contains(privateReview, /quote consent: none, anonymous, public name, or public link/) &&
      contains(privateReview, /Private review is for copy and product clarity, not proof of quality/),
    "Private review packet supports small pre-launch feedback before broad promotion, without asking for stars or making proof claims."
  );
  addCheck(
    checks,
    "reviewer-quickstart",
    hasFile("docs/launch/reviewer-quickstart.md") &&
      contains(launchKit, /Reviewer quickstart/) &&
      contains(launchKit, /5-minute no-install path/) &&
      contains(privateReview, /One-page reviewer quickstart/) &&
      contains(outreachTargets, /reviewer-quickstart\.md/) &&
      contains(reviewerQuickstart, /This is the one-page link to send to a private reviewer/) &&
      contains(reviewerQuickstart, /Fastest Review Path/) &&
      contains(reviewerQuickstart, /Hands-On Source Preview/) &&
      contains(reviewerQuickstart, /Open https:\/\/codespaces\.new\/Seven128\/project-tiny-context-harness/) &&
      contains(reviewerQuickstart, /Feedback Questions/) &&
      contains(reviewerQuickstart, /Source preview report/) &&
      contains(reviewerQuickstart, /Consent Boundary/) &&
      contains(reviewerQuickstart, /not benchmark evidence, adoption proof or a request for stars/),
    "Reviewer quickstart gives private reviewers one low-friction page for no-install review, source preview, feedback questions and consent boundaries."
  );
  addCheck(
    checks,
    "private-review-shortlist",
    hasFile("docs/launch/private-review-shortlist.md") &&
      contains(launchKit, /Private review shortlist/) &&
      contains(outreachTargets, /private-review-shortlist\.md/) &&
      contains(privateReview, /private-review-shortlist\.md/) &&
      contains(privateReviewShortlist, /Aim for 5-10 people across at least three profiles/) &&
      contains(privateReviewShortlist, /Do not commit a filled shortlist/) &&
      contains(privateReviewShortlist, /Do not send the review DM to anyone who expects promotion, compensation or a reciprocal star/) &&
      contains(privateReviewShortlist, /Send in two waves/) &&
      contains(privateReviewShortlist, /It is not useful as a popularity signal/),
    "Private review shortlist helps select high-signal reviewers while avoiding private-data commits, star asks and fake adoption proof."
  );
  addCheck(
    checks,
    "private-review-log-template",
    hasFile("docs/launch/private-review-log-template.md") &&
      contains(launchKit, /Private review log template/) &&
      contains(privateReviewLogTemplate, /Keep filled logs under `tmp\/ty-context\/private-review\/\*\*`/) &&
      contains(privateReviewLogTemplate, /not in `project_context\/\*\*`/) &&
      contains(privateReviewLogTemplate, /Do not commit filled logs unless every reviewer explicitly approved/) &&
      contains(privateReviewLogTemplate, /Reviewer Tracker/) &&
      contains(privateReviewLogTemplate, /Consent level/) &&
      contains(privateReviewLogTemplate, /Triage Summary/) &&
      contains(privateReviewLogTemplate, /Conversion Decisions/) &&
      contains(privateReviewLogTemplate, /24-Hour Actions/) &&
      contains(privateReviewLogTemplate, /Do not claim adoption, benchmark wins, productivity gains or production validation/),
    "Private review log template captures consent and repeated feedback without leaking private details or becoming project Context."
  );
  addCheck(
    checks,
    "adoption-story-template",
    hasFile("docs/launch/adoption-story-template.md") &&
      contains(launchKit, /Adoption story template/) &&
      contains(outreachTargets, /adoption-story-template\.md/) &&
      contains(adoptionStoryTemplate, /adoption-report issue form already asks for quote\/story consent/) &&
      contains(adoptionStoryTemplate, /Do not publish a story without explicit consent/) &&
      contains(adoptionStoryTemplate, /Attribution level:/) &&
      contains(adoptionStoryTemplate, /Approved surfaces:/) &&
      contains(adoptionStoryTemplate, /Story Shape/) &&
      contains(adoptionStoryTemplate, /Repo \/ team type:/) &&
      contains(adoptionStoryTemplate, /Still missing:/) &&
      contains(adoptionStoryTemplate, /Only use these after the underlying feedback exists/) &&
      contains(adoptionStoryTemplate, /Do not publish:/) &&
      contains(adoptionStoryTemplate, /Benchmark-backed speedup/) &&
      contains(adoptionStoryTemplate, /Conversion Checklist/),
    "Adoption story template converts consented feedback into concrete recovery evidence without leaking private details or making proof claims."
  );
  addCheck(
    checks,
    "community-starter-issues",
    contains(rootReadme, /Early feedback and starter issues/) &&
      contains(packageReadme, /Early feedback and starter issues/) &&
      contains(rootReadme, /Context recovery gap/) &&
      contains(packageReadme, /Context recovery gap/) &&
      contains(rootReadme, /context_gap\.yml/) &&
      contains(packageReadme, /context_gap\.yml/) &&
      contains(rootReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/4/) &&
      contains(packageReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/4/) &&
      contains(rootReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/5/) &&
      contains(rootReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/6/) &&
      contains(rootReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/7/) &&
      contains(rootReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/8/) &&
      contains(packageReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/5/) &&
      contains(packageReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/6/) &&
      contains(packageReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/7/) &&
      contains(packageReadme, /github\.com\/Seven128\/project-tiny-context-harness\/issues\/8/) &&
      contains(rootReadme, /benchmark speedup claims need fresh Minimal Context benchmark runs/) &&
      contains(packageReadme, /benchmark speedup claims need fresh Minimal Context benchmark runs/),
    "README and package README expose adoption handoff and starter issues without benchmark overclaiming."
  );
  addCheck(
    checks,
    "public-roadmap",
    hasFile("docs/roadmap.md") &&
      contains(rootReadme, /roadmap]\(docs\/roadmap\.md\)/) &&
      contains(packageReadme, /roadmap]\(https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/blob\/main\/docs\/roadmap\.md\)/) &&
      contains(roadmap, /Repo-native project memory for fresh-agent recovery/) &&
      contains(roadmap, /## Now/) &&
      contains(roadmap, /## Next/) &&
      contains(roadmap, /## Later/) &&
      contains(roadmap, /## Not Planned/) &&
      contains(roadmap, /Keep the npm package installable and aligned with README\/package README/) &&
      contains(roadmap, /public adoption stories/) &&
      contains(roadmap, /Re-run delivery benchmarks against the current Minimal Context design/) &&
      contains(roadmap, /Full Tiny Context phase gates, lifecycle state or work-product trees/) &&
      contains(roadmap, /validate-context` proves product quality/),
    "Public roadmap is linked from README/package README and keeps next steps bounded to Minimal Context without proof claims."
  );
  addCheck(
    checks,
    "comparison-guide",
    hasFile("docs/comparison.md") &&
      contains(rootReadme, /comparison guide]\(docs\/comparison\.md\)/) &&
      contains(packageReadme, /comparison guide]\(https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/blob\/main\/docs\/comparison\.md\)/) &&
      contains(faq, /comparison guide]\(comparison\.md\)/) &&
      contains(launchKit, /\.\.\/comparison\.md/) &&
      contains(launchKit, /Comparison guide/) &&
      contains(comparisonGuide, /Project Tiny Context Harness owns durable repo memory for fresh-agent recovery/) &&
      contains(comparisonGuide, /AGENTS\.md.*alone/) &&
      contains(comparisonGuide, /Spec-first kits/) &&
      contains(comparisonGuide, /Task planners/) &&
      contains(comparisonGuide, /Code intelligence \/ retrieval/) &&
      contains(comparisonGuide, /Use Harness When/) &&
      contains(comparisonGuide, /Use Something Else When/) &&
      contains(comparisonGuide, /Common Combinations/) &&
      contains(comparisonGuide, /Would a fresh coding agent need this fact before proposing a safe code change/) &&
      contains(comparisonGuide, /Do not evaluate Harness as/) &&
      contains(comparisonGuide, /benchmark-proven productivity multiplier/),
    "Comparison guide is linked from public docs and explains adjacent-tool fit without superiority or benchmark claims."
  );
  addCheck(
    checks,
    "agent-surface-recipes",
    hasFile("docs/agent-surface-recipes.md") &&
      contains(rootReadme, /agent surface recipes/) &&
      contains(packageReadme, /agent surface recipes/) &&
      contains(agentSurfaceRecipes, /Codex/) &&
      contains(agentSurfaceRecipes, /Claude Code/) &&
      contains(agentSurfaceRecipes, /Cursor/) &&
      contains(agentSurfaceRecipes, /Gemini CLI/) &&
      contains(agentSurfaceRecipes, /OpenCode/) &&
      contains(agentSurfaceRecipes, /--harness-folder \.opencode/) &&
      contains(agentSurfaceRecipes, /root `AGENTS\.md` plus `project_context\/\*\*`/) &&
      contains(agentSurfaceRecipes, /splits the repo memory and creates drift/) &&
      contains(launchKit, /Agent-surface recipes/) &&
      contains(primaryLaunch, /Agent surface recipes are linked/) &&
      contains(outreachTargets, /OpenCode setup note/),
    "Agent-surface recipes explain multi-agent adoption without splitting project_context."
  );
  addCheck(
    checks,
    "existing-repo-adoption-guide",
    hasFile("docs/adopt-existing-repo.md") &&
      contains(rootReadme, /adoption guide]\(docs\/adopt-existing-repo\.md\)/) &&
      contains(packageReadme, /adoption guide]\(https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/blob\/main\/docs\/adopt-existing-repo\.md\)/) &&
      contains(launchKit, /Existing-repo adoption guide/) &&
      contains(roadmap, /existing-repo adoption guide]\(adopt-existing-repo\.md\)/) &&
      contains(existingRepoAdoption, /git switch -c try-project-tiny-context-harness/) &&
      contains(existingRepoAdoption, /init --adopt/) &&
      contains(existingRepoAdoption, /AGENTS\.md \+ project_context\/\*\*/) &&
      contains(existingRepoAdoption, /Tool-specific files can still exist/) &&
      contains(existingRepoAdoption, /Duplicated memory drifts/) &&
      contains(existingRepoAdoption, /validate-context` checks recovery facts; it does not prove product quality/) &&
      contains(existingRepoAdoption, /adoption report/),
    "Existing-repo adoption guide is linked from public docs and explains safe init --adopt use without duplicating project memory."
  );

  addCheck(
    checks,
    "launch-profile-sheet",
    hasFile("docs/launch/profile.md") &&
      contains(launchKit, /profile\.md/) &&
      contains(launchKit, /Launch profile sheet/) &&
      contains(launchProfile, /Launch Profile Sheet/) &&
      contains(launchProfile, /Project Tiny Context Harness/) &&
      contains(launchProfile, /Minimal project memory for AI coding agents/) &&
      contains(launchProfile, /Minimal project memory and validation harness for AI coding agents\./) &&
      contains(launchProfile, /Repo-native project memory for fresh AI coding-agent sessions\./) &&
      contains(launchProfile, /Keep the memory\. Drop the ceremony\./) &&
      contains(launchProfile, /Developer Tools \/ AI coding-agent infrastructure \/ Context engineering/) &&
      contains(launchProfile, /AI coding-agent infrastructure/) &&
      contains(launchProfile, /Minimal Context sample guide/) &&
      contains(launchProfile, /Browseable sample repository/) &&
      contains(launchProfile, /examples\/minimal-context-sample/) &&
      contains(launchProfile, /Avoid using `ty-context` as the first tag/) &&
      contains(launchProfile, /Use GitHub as the primary launch URL for public posts/) &&
      contains(launchProfile, /Use npm as the GitHub repository homepage now that the renamed package is published/) &&
      contains(launchProfile, /Normal install path/) &&
      contains(launchProfile, /Source checkout preview/) &&
      contains(launchProfile, /Benchmark-proven faster/) &&
      contains(launchProfile, /Do not make external submission copy look Chinese-first/),
    "Launch profile sheet centralizes English-first external-submission fields and claims boundaries."
  );

  addCheck(
    checks,
    "launch-kit",
    contains(launchKit, /Launch Kit/) &&
      contains(launchKit, /Do not claim benchmark wins/) &&
      contains(launchKit, /github-metadata\.md/) &&
      contains(launchKit, /Hacker News Draft/) &&
      contains(launchKit, /Use \[primary-launch\.md\]\(primary-launch\.md\) as the canonical Show HN source/) &&
      contains(launchKit, /show-hn` prefill URL/) &&
      !contains(launchKit, /Show HN: Minimal project memory for AI coding agents/) &&
      contains(launchKit, /npm-publish-runbook\.md/) &&
      contains(launchKit, /npm-trusted-publishing\.md/) &&
      contains(launchKit, /awesome-list-submissions\.md/) &&
      contains(launchKit, /npm run launch:external-prs/) &&
      contains(launchKit, /claims-boundary\.md/) &&
      contains(launchKit, /Readiness boundary/) &&
      contains(launchKit, /repo-hosted media/) &&
      contains(launchKit, /Keep the memory\. Drop the ceremony\./) &&
      contains(launchKit, /OpenSSF Scorecard workflow/) &&
      contains(launchKit, /Minimal Context sample project/) &&
      contains(launchKit, /FAQ/) &&
      contains(launchKit, /does not mean Product Hunt, curated-list submissions or awards are ready/),
    "Launch kit has copy-ready channel drafts, media pointers, readiness boundary and no-benchmark boundary."
  );
  addCheck(
    checks,
    "launch-claims-boundary",
    hasFile("docs/launch/claims-boundary.md") &&
      contains(launchKit, /Launch claims boundary/) &&
      contains(launchKit, /no benchmark, adoption, award, test-replacement or Tiny Context-automation overclaim/) &&
      contains(primaryLaunch, /claims-boundary\.md/) &&
      contains(responseTemplates, /claims-boundary\.md/) &&
      contains(outreachTargets, /claims-boundary\.md/) &&
      contains(claimsBoundary, /Launch Claims Boundary/) &&
      contains(claimsBoundary, /minimal repo-native project memory for AI coding agents/) &&
      contains(claimsBoundary, /not benchmark-proven faster/) &&
      contains(claimsBoundary, /not adoption-proven/) &&
      contains(claimsBoundary, /not a replacement for tests, CI, review or issue tracking/) &&
      contains(claimsBoundary, /Claims That Need Evidence First/) &&
      contains(claimsBoundary, /OpenSSF Best Practices \/ Baseline badge/) &&
      contains(claimsBoundary, /Before Show HN/) &&
      contains(claimsBoundary, /Before Product Hunt/) &&
      contains(claimsBoundary, /Before curated-list PRs/) &&
      contains(claimsBoundary, /Before private-review summaries/) &&
      contains(claimsBoundary, /does it ask for feedback instead of stars, upvotes or awards/i),
    "Launch claims boundary gives a single final copy-review surface for avoiding benchmark, adoption, award and replacement overclaims."
  );
  addCheck(
    checks,
    "github-homepage-stage-boundary",
      contains(launchKit, /Primary launch URL/) &&
      contains(launchKit, /GitHub repository homepage/) &&
      contains(launchKit, /https:\/\/www\.npmjs\.com\/package\/project-tiny-context-harness/) &&
      contains(launchKit, /Run `npm run launch:github-metadata` to inspect GitHub description, homepage and topics/) &&
      contains(launchProfile, /Use GitHub as the primary launch URL for public posts/) &&
      contains(launchProfile, /Use npm as the GitHub repository homepage now that the renamed package is published/) &&
      contains(outreachTargets, /GitHub repository homepage points to the npm package page/) &&
      contains(outreachTargets, /primary public post should still link to the GitHub repository/),
    "Launch docs distinguish the public post URL from the GitHub About homepage now that npm is live."
  );
  addCheck(
    checks,
    "github-metadata-runbook",
    hasFile("docs/launch/github-metadata.md") &&
      contains(launchKit, /github-metadata\.md/) &&
      contains(githubMetadataRunbook, /GitHub Metadata Runbook/) &&
      contains(githubMetadataRunbook, /Minimal project memory and validation harness for AI coding agents\./) &&
      contains(githubMetadataRunbook, /Homepage after `project-tiny-context-harness` is published on npm/) &&
      contains(githubMetadataRunbook, /https:\/\/www\.npmjs\.com\/package\/project-tiny-context-harness/) &&
      contains(githubMetadataRunbook, /github-homepage: PASS/) &&
      contains(githubMetadataRunbook, /npm-fetch: PASS/) &&
      contains(githubMetadataRunbook, /GITHUB_TOKEN/) &&
      contains(githubMetadataRunbook, /GH_TOKEN/) &&
      contains(githubMetadataRunbook, /auto-detects whether `project-tiny-context-harness\/latest` is published on npm/) &&
      contains(githubMetadataRunbook, /Do not point GitHub homepage to the npm package while npm returns 404/),
    "GitHub metadata runbook gives exact UI/API steps for fixing About homepage before and after npm publication."
  );
  addCheck(
    checks,
    "github-metadata-script",
    rootPackage.scripts?.["launch:github-metadata"] === "node tools/github_metadata_update.mjs" &&
      hasFile("tools/github_metadata_update.mjs") &&
      contains(githubMetadataScript, /--apply/) &&
      contains(githubMetadataScript, /GITHUB_TOKEN/) &&
      contains(githubMetadataScript, /GH_TOKEN/) &&
      contains(githubMetadataScript, /PATCH/) &&
      contains(githubMetadataScript, /topicsUrl/) &&
      contains(githubMetadataScript, /method: "PUT"/) &&
      contains(githubMetadataScript, /project-tiny-context-harness\/latest/) &&
      contains(githubMetadataRunbook, /npm run launch:github-metadata/) &&
      contains(prelaunchExternalBlockers, /npm run launch:github-metadata -- --apply/) &&
      contains(launchKit, /npm run launch:github-metadata/),
    "GitHub metadata script can dry-run and apply repository About metadata without copying API commands by hand."
  );
  addCheck(
    checks,
    "prelaunch-external-blockers",
    hasFile("docs/launch/prelaunch-external-blockers.md") &&
      contains(launchKit, /prelaunch-external-blockers\.md/) &&
      contains(launchKit, /Prelaunch external blockers/) &&
      contains(launchKit, /npm run launch:unblock/) &&
      contains(outreachTargets, /prelaunch-external-blockers\.md/) &&
      contains(outreachTargets, /strict external launch gate/) &&
      contains(prelaunchExternalBlockers, /Prelaunch External Blockers/) &&
      contains(prelaunchExternalBlockers, /npm run launch:unblock/) &&
      contains(prelaunchExternalBlockers, /node tools\/launch_readiness_check\.mjs --strict-external/) &&
      contains(prelaunchExternalBlockers, /Current expected state/) &&
      contains(prelaunchExternalBlockers, /Fallback failure state/) &&
      contains(prelaunchExternalBlockers, /npm-fetch: TODO/) &&
      contains(prelaunchExternalBlockers, /github-homepage: TODO/) &&
      contains(prelaunchExternalBlockers, /npm-fetch: PASS/) &&
      contains(prelaunchExternalBlockers, /github-homepage: PASS/) &&
      contains(prelaunchExternalBlockers, /https:\/\/registry\.npmjs\.org\/project-tiny-context-harness\/latest/) &&
      contains(prelaunchExternalBlockers, /https:\/\/github\.com\/Seven128\/project-tiny-context-harness/) &&
      contains(prelaunchExternalBlockers, /https:\/\/www\.npmjs\.com\/package\/project-tiny-context-harness/) &&
      contains(prelaunchExternalBlockers, /npm-publish-runbook\.md/) &&
      contains(prelaunchExternalBlockers, /npm-credential-unblock\.md/) &&
      contains(prelaunchExternalBlockers, /github-metadata\.md/) &&
      contains(prelaunchExternalBlockers, /Do not post broad launch copy if either `npm-fetch` or `github-homepage` returns as a TODO/) &&
      contains(prelaunchExternalBlockers, /Allowed while the strict external gate is blocked/) &&
      contains(prelaunchExternalBlockers, /Not allowed while the strict external gate is blocked/) &&
      contains(prelaunchExternalBlockers, /Private review/) &&
      contains(prelaunchExternalBlockers, /No token, OTP, `.npmrc` or account credential/),
    "Prelaunch external blockers checklist centralizes npm-fetch and GitHub homepage stop/go actions for broad launch."
  );
  addCheck(
    checks,
    "launch-unblock-report",
    rootPackage.scripts?.["launch:unblock"] === "node tools/launch_unblock_check.mjs" &&
      hasFile("tools/launch_unblock_check.mjs") &&
      contains(launchUnblockScript, /This script is read-only/) &&
      contains(launchUnblockScript, /tools\/npm_publish_access_check\.mjs/) &&
      contains(launchUnblockScript, /tools\/github_metadata_update\.mjs/) &&
      contains(launchUnblockScript, /tools\/launch_readiness_check\.mjs/) &&
      contains(launchUnblockScript, /Remaining External TODOs/) &&
      contains(launchUnblockScript, /Owner Commands/) &&
      contains(launchUnblockScript, /Broad launch gate is clear/) &&
      contains(launchUnblockScript, /Broad launch remains blocked until the strict external gate has no TODOs/) &&
      contains(launchKit, /npm run launch:unblock/) &&
      contains(prelaunchExternalBlockers, /npm run launch:unblock/),
    "Launch unblock report combines npm access, GitHub metadata and strict external checks into one owner-facing stop/go report."
  );
  addCheck(
    checks,
    "launch-unblock-status-aware",
    contains(launchUnblockScript, /Status: \$\{report\.npm\.summary\.status\}/) &&
      contains(launchUnblockScript, /npm login/) &&
      contains(launchUnblockScript, /After npm auth or token permissions are fixed/) &&
      contains(launchUnblockScript, /docs\/launch\/npm-credential-unblock\.md/) &&
      contains(launchUnblockScript, /actions\/workflows\/npm-publish\.yml/) &&
      contains(launchUnblockScript, /If npm returns E403/) &&
      contains(launchUnblockScript, /packageVersion/),
    "Launch unblock report gives status-aware npm owner commands before broad launch."
  );
  addCheck(
    checks,
    "launch-next-steps",
    rootPackage.scripts?.["launch:next"] === "node tools/launch_next_steps.mjs" &&
      hasFile("tools/launch_next_steps.mjs") &&
      contains(launchNextScript, /This script is read-only/) &&
      contains(launchNextScript, /does not publish to npm/) &&
      contains(launchNextScript, /--live/) &&
      contains(launchNextScript, /applyStatusHints/) &&
      contains(launchNextScript, /recommendedNext/) &&
      contains(launchNextScript, /Recommended Next/) &&
      contains(launchNextScript, /pending-cleanup/) &&
      contains(launchNextScript, /waiting-for-url/) &&
      contains(launchNextScript, /actions\/workflows\/npm-publish\.yml/) &&
      contains(launchNextScript, /releases\/new\?tag=v\$\{packageVersion\}/) &&
      contains(launchNextScript, /news\.ycombinator\.com\/submit/) &&
      contains(launchNextScript, /submitlink\?u=/) &&
      contains(launchNextScript, /prefillUrl/) &&
      contains(launchNextScript, /npm run launch:feedback-note -- --channel show-hn --url <show-hn-url>/) &&
      contains(launchNextScript, /npm run launch:external-prs -- --live --clean/) &&
      contains(launchKit, /npm run launch:next -- --live/) &&
      contains(launchKit, /ordered owner action board with status hints/),
    "Launch next steps command gives maintainers one ordered, read-only action board with status hints for npm, release, first post and follow-up execution."
  );
  addCheck(
    checks,
    "launch-operating-plan",
    contains(launchKit, /Launch Operating Plan/) &&
      contains(launchKit, /Channel Matrix/) &&
      contains(launchKit, /Community Handoff Surface/) &&
      contains(launchKit, /GitHub issues \/ adoption reports/) &&
      !contains(launchKit, /GitHub Discussions/) &&
      contains(launchKit, /issue #4 or the adoption-report template/) &&
      contains(launchKit, /Pinned issue: `Show how Project Tiny Context Harness helped or failed in your repo`/) &&
      contains(launchKit, /adoption handoff issue and starter issues are visible and labeled for discovery/) &&
      contains(launchKit, /good first issue`, `help wanted` and `documentation`/) &&
      contains(launchKit, /#4 uses `question`; #5, #6 and #8 use `documentation`, `good first issue` and `help wanted`; #7 uses `help wanted`/),
    "Launch kit has an operating plan, channel matrix and labeled community handoff surface."
  );
  addCheck(
    checks,
    "primary-launch-packet",
    contains(launchKit, /primary-launch\.md/) &&
      hasFile("docs/launch/primary-launch.md") &&
      contains(primaryLaunch, /Primary Launch Packet/) &&
      contains(primaryLaunch, /Hacker News Show HN/) &&
      !contains(primaryLaunch, /npm run release:npm/) &&
      contains(primaryLaunch, /npm run launch:strict-external/) &&
      contains(primaryLaunch, /project-tiny-context-harness@latest/) &&
      contains(primaryLaunch, /Prefill URL for the HN submit form after login/) &&
      contains(primaryLaunch, /news\.ycombinator\.com\/submitlink\?u=https%3A%2F%2Fgithub\.com%2FSeven128%2Fproject-tiny-context-harness&t=Show%20HN%3A%20Tiny%20project%20memory%20for%20coding%20agents/) &&
      contains(primaryLaunch, /Do not put the long text below in the HN submit form/) &&
      contains(primaryLaunch, /First comment after the story is live/) &&
      contains(primaryLaunch, /final maintainer pass/) &&
      contains(primaryLaunch, new RegExp(`github-release-${escapeRegex(packageJson.version)}\\.md`)) &&
      contains(primaryLaunch, /npm-publish-runbook\.md/) &&
      contains(primaryLaunch, /Product Hunt/) &&
      contains(primaryLaunch, /AGENTS\.md stays a short startup router/) &&
      contains(primaryLaunch, /project_context\/\*\* keeps durable facts/) &&
      contains(primaryLaunch, /Adoption reports \/ missing facts/) &&
      contains(primaryLaunch, /24-Hour Response Playbook/) &&
      contains(primaryLaunch, /feedback-triage\.md/) &&
      contains(primaryLaunch, /Do not ask for stars|Asking for stars/),
    "Primary launch packet has link-first Show HN guidance, copy-ready first-comment copy, Product Hunt follow-up, response playbook and claims boundary."
  );
  addCheck(
    checks,
    "feedback-triage-runbook",
    hasFile("docs/launch/feedback-triage.md") &&
      contains(launchKit, /feedback-triage\.md/) &&
      contains(launchKit, /Feedback triage runbook/) &&
      contains(primaryLaunch, /feedback-triage\.md/) &&
      contains(feedbackTriage, /Launch Feedback Triage/) &&
      contains(feedbackTriage, /tmp\/ty-context\/launch-feedback/) &&
      contains(feedbackTriage, /First Hour/) &&
      contains(feedbackTriage, /Six-Hour Triage/) &&
      contains(feedbackTriage, /Patch Rules/) &&
      contains(feedbackTriage, /Issue Rules/) &&
      contains(feedbackTriage, /Adoption Evidence/) &&
      contains(feedbackTriage, /Channel Decision/) &&
      contains(feedbackTriage, /24-Hour Summary Template/) &&
      contains(feedbackTriage, /Treat stars, upvotes, comments and downloads as distribution telemetry/),
    "Feedback triage runbook turns launch comments into docs, issues or consented evidence without product-proof overclaims."
  );
  addCheck(
    checks,
    "npm-publish-runbook",
    hasFile("docs/launch/npm-publish-runbook.md") &&
      contains(npmPublishRunbook, /project-tiny-context-harness@0\.2\.40/) &&
      contains(npmPublishRunbook, /npm-credential-unblock\.md/) &&
      contains(npmPublishRunbook, /npm-trusted-publishing\.md/) &&
      contains(npmPublishRunbook, /npm run release:npm -- --version 0\.2\.40 --publish --yes --full-gate --registry-smoke/) &&
      contains(npmPublishRunbook, /--otp 123456/) &&
      contains(npmPublishRunbook, /Do not post broad launch copy while the renamed package still returns 404/) &&
      contains(npmPublishRunbook, /You may not perform that action with these credentials/) &&
      contains(npmPublishRunbook, /credential, account policy or token permission issue/) &&
      contains(npmPublishRunbook, /npm profile get name email tfa --json/) &&
      contains(npmPublishRunbook, /npm access list collaborators agent-project-ty-context steve1998 --json/) &&
      contains(npmPublishRunbook, /current token can maintain the legacy package but cannot create or manage the renamed package namespace/) &&
      contains(npmPublishRunbook, /granular access tokens must be created on npmjs\.com, not from the CLI/) &&
      contains(npmPublishRunbook, /npm run launch:strict-external/),
    "npm publish runbook documents first renamed publish, OTP path, npm 404 gate and post-publish verification."
  );
  addCheck(
    checks,
    "npm-credential-unblock",
    hasFile("docs/launch/npm-credential-unblock.md") &&
      contains(launchKit, /npm-credential-unblock\.md/) &&
      contains(launchKit, /npm credential unblock/) &&
      contains(npmCredentialUnblock, /npm-trusted-publishing\.md/) &&
      contains(npmCredentialUnblock, /npm Credential Unblock Checklist/i) &&
      contains(npmCredentialUnblock, /403 Forbidden - PUT https:\/\/registry\.npmjs\.org\/project-tiny-context-harness/) &&
      contains(npmCredentialUnblock, /Official npm References/) &&
      contains(npmCredentialUnblock, /Creating access tokens/) &&
      contains(npmCredentialUnblock, /2FA for publishing/) &&
      contains(npmCredentialUnblock, /Interactive Login With OTP/) &&
      contains(npmCredentialUnblock, /Website-Created Granular Token/) &&
      contains(npmCredentialUnblock, /Enable bypass 2FA only if this non-interactive token publish path requires it/) &&
      contains(npmCredentialUnblock, /npm config set \/\/registry\.npmjs\.org\/:_authToken/) &&
      contains(npmCredentialUnblock, /Post-Publish Gate/) &&
      contains(npmCredentialUnblock, /Do not commit `.npmrc`, tokens, OTP values/),
    "npm credential unblock checklist gives a safe path from 403 credentials failure to publish retry."
  );
  addCheck(
    checks,
    "npm-access-diagnostic",
    rootPackage.scripts?.["launch:npm-access"] === "node tools/npm_publish_access_check.mjs" &&
      hasFile("tools/npm_publish_access_check.mjs") &&
      contains(npmAccessScript, /This script is read-only/) &&
      contains(npmAccessScript, /does not run npm publish/) &&
      contains(npmAccessScript, /No token, OTP, \.npmrc content or credential value/) &&
      contains(npmAccessScript, /npm whoami/) &&
      contains(npmAccessScript, /PACKAGE_NAME/) &&
      contains(npmAccessScript, /\/latest/) &&
      contains(npmAccessScript, /first-publish-needed/) &&
      contains(launchKit, /npm run launch:npm-access/) &&
      contains(npmPublishRunbook, /npm run launch:npm-access/) &&
      contains(npmCredentialUnblock, /npm run launch:npm-access/) &&
      contains(prelaunchExternalBlockers, /npm run launch:npm-access/),
    "npm access diagnostic gives maintainers a read-only way to inspect npm login, registry and package-existence state before retrying publish."
  );
  addCheck(
    checks,
    "npm-trusted-publishing-packet",
    hasFile("docs/launch/npm-trusted-publishing.md") &&
      hasFile(".github/workflows/npm-publish.yml") &&
      contains(launchKit, /npm-trusted-publishing\.md/) &&
      contains(npmPublishRunbook, /npm-trusted-publishing\.md/) &&
      contains(npmCredentialUnblock, /npm-trusted-publishing\.md/) &&
      contains(npmTrustedPublishing, /Official npm Sources Checked/) &&
      contains(npmTrustedPublishing, /https:\/\/docs\.npmjs\.com\/trusted-publishers\//) &&
      contains(npmTrustedPublishing, /https:\/\/docs\.npmjs\.com\/generating-provenance-statements\//) &&
      contains(npmTrustedPublishing, /npm CLI version 11\.5\.1 or later/) &&
      contains(npmTrustedPublishing, /Node version 22\.14\.0 or higher/) &&
      contains(npmTrustedPublishing, /permissions: id-token: write/) &&
      contains(npmTrustedPublishing, /permissions: contents: write/) &&
      contains(npmTrustedPublishing, /Organization or user \| `Seven128`/) &&
      contains(npmTrustedPublishing, /Repository \| `project-tiny-context-harness`/) &&
      contains(npmTrustedPublishing, /Workflow filename \| `npm-publish\.yml`/) &&
      contains(npmTrustedPublishing, /Environment name \| `npm-publish`/) &&
      contains(npmTrustedPublishing, /Allowed actions \| `npm publish`/) &&
      contains(npmTrustedPublishing, /https:\/\/github\.com\/Seven128\/project-tiny-context-harness\/actions\/workflows\/npm-publish\.yml/) &&
      contains(npmTrustedPublishing, /post-first-publish release path/) &&
      contains(npmTrustedPublishing, /package now exists on npm/) &&
      contains(npmTrustedPublishing, /must not define `NPM_TOKEN` or `NODE_AUTH_TOKEN`/) &&
      contains(npmTrustedPublishing, /npm run release:prepare/) &&
      contains(npmTrustedPublishing, /--update-mode/) &&
      contains(npmTrustedPublishing, /npm run release:prepare -- --fast/) &&
      contains(npmTrustedPublishing, /npm run release:publish -- --local-fallback --yes/) &&
      contains(npmTrustedPublishing, /--registry-smoke/) &&
      contains(npmTrustedPublishing, /npm run release:check-version/) &&
      contains(npmTrustedPublishing, /tools\/github_release_publish\.mjs/) &&
      contains(npmTrustedPublishing, /expected_version: <new-version>/) &&
      contains(npmTrustedPublishing, /one real workflow run/) &&
      rootPackage.scripts?.["release:sync-version"] === "node tools/sync_release_version.mjs" &&
      rootPackage.scripts?.["release:check-version"] === "node tools/sync_release_version.mjs --check" &&
      rootPackage.scripts?.["release:prepare"] === "node tools/release_prepare.mjs" &&
      rootPackage.scripts?.["release:publish"] === "node tools/release_publish.mjs" &&
      hasFile("tools/release_prepare.mjs") &&
      hasFile("tools/release_publish.mjs") &&
      contains(npmTrustedPublishWorkflow, /name: npm Trusted Publish/) &&
      contains(npmTrustedPublishWorkflow, /workflow_dispatch:/) &&
      contains(npmTrustedPublishWorkflow, /dry_run:/) &&
      contains(npmTrustedPublishWorkflow, new RegExp(`default:\\s*"${packageVersionPattern}"`)) &&
      contains(npmTrustedPublishWorkflow, /default: true/) &&
      contains(npmTrustedPublishWorkflow, /id-token:\s*write/) &&
      contains(npmTrustedPublishWorkflow, /contents:\s*write/) &&
      contains(npmTrustedPublishWorkflow, /environment:\s*npm-publish/) &&
      contains(npmTrustedPublishWorkflow, /uses: actions\/checkout@[a-f0-9]{40}/) &&
      contains(npmTrustedPublishWorkflow, /uses: actions\/setup-node@[a-f0-9]{40}/) &&
      contains(npmTrustedPublishWorkflow, /node-version:\s*"24"/) &&
      contains(npmTrustedPublishWorkflow, /registry-url:\s*"https:\/\/registry\.npmjs\.org"/) &&
      contains(npmTrustedPublishWorkflow, /npm install -g npm@12\.0\.1/) &&
      !contains(npmTrustedPublishWorkflow, /npm@latest/) &&
      contains(npmTrustedPublishWorkflow, /npm run build --workspace project-tiny-context-harness/) &&
      contains(npmTrustedPublishWorkflow, /Complete package tests/) &&
      contains(npmTrustedPublishWorkflow, /run: npm test --workspace project-tiny-context-harness/) &&
      !contains(npmTrustedPublishWorkflow, /npm run test:long-task-workflow/) &&
      contains(npmTrustedPublishWorkflow, /npm run release:check-version/) &&
      contains(npmTrustedPublishWorkflow, /node packages\/ty-context\/dist\/cli\.js package check-source/) &&
      contains(npmTrustedPublishWorkflow, /make validate-harness/) &&
      contains(npmTrustedPublishWorkflow, /node tools\/quickstart_smoke\.mjs/) &&
      contains(npmTrustedPublishWorkflow, /npm pack --json --workspace project-tiny-context-harness --pack-destination \.artifacts\/releases\/prepared/) &&
      contains(npmTrustedPublishWorkflow, /workflow_release_artifact\.mjs/) &&
      contains(npmTrustedPublishWorkflow, /--source-commit "\$\{\{ github\.sha \}\}"/) &&
      contains(npmTrustedPublishWorkflow, /release_tarball_smoke\.mjs --tarball/) &&
      contains(npmTrustedPublishWorkflow, /uses: actions\/upload-artifact@[a-f0-9]{40}/) &&
      contains(npmTrustedPublishWorkflow, /uses: actions\/download-artifact@[a-f0-9]{40}/) &&
      contains(npmTrustedPublishWorkflow, /name: npm-release-\$\{\{ github\.run_id \}\}/) &&
      contains(npmTrustedPublishWorkflow, /overwrite: true/) &&
      !contains(npmTrustedPublishWorkflow, /github\.run_attempt/) &&
      contains(npmTrustedPublishWorkflow, /needs: prepare/) &&
      contains(npmTrustedPublishWorkflow, /verify_workflow_release_artifact\.mjs/) &&
      contains(npmTrustedPublishWorkflow, /publish_prepared_artifact\.mjs/) &&
      (npmTrustedPublishWorkflow.match(/npm test --workspace project-tiny-context-harness/g)?.length ?? 0) === 1 &&
      (npmTrustedPublishWorkflow.match(/npm pack --json/g)?.length ?? 0) === 1 &&
      (npmTrustedPublishWorkflow.match(/release_tarball_smoke\.mjs/g)?.length ?? 0) === 1 &&
      contains(npmTrustedPublishWorkflow, /NPM_CONFIG_PROVENANCE:\s*"true"/) &&
      contains(npmTrustedPublishWorkflow, /Create or update GitHub Release/) &&
      contains(npmTrustedPublishWorkflow, /GH_TOKEN:\s*\$\{\{ github\.token \}\}/) &&
      contains(npmTrustedPublishWorkflow, /node tools\/github_release_publish\.mjs --version "\$\{\{ inputs\.expected_version \}\}" --target "\$\{\{ github\.sha \}\}"/) &&
      !contains(npmTrustedPublishWorkflow, /NPM_TOKEN|NODE_AUTH_TOKEN/),
    "npm trusted publishing packet documents a one-prepare protected artifact handoff without long-lived npm publish tokens or duplicate full-suite execution."
  );
  addCheck(
    checks,
    "github-release-automation",
    rootPackage.scripts?.["release:github"] === "node tools/github_release_publish.mjs" &&
      hasFile("tools/github_release_publish.mjs") &&
      contains(githubReleasePublishScript, /gh\(\["release", "create"/) &&
      contains(githubReleasePublishScript, /gh\(\["release", "edit"/) &&
      contains(githubReleasePublishScript, /extractReleaseBody/) &&
      contains(githubReleasePublishScript, /--dry-run/) &&
      contains(githubReleasePublishScript, /--target/) &&
      contains(githubReleasePublishScript, /--latest/) &&
      contains(releasePublishScript, /publishGitHubRelease/) &&
      contains(releasePublishScript, /tools\/github_release_publish\.mjs/) &&
      contains(releasePublishScript, /GitHub Release skipped: gh not authenticated/) &&
      contains(npmPublishRunbook, /npm run release:github -- --version <published-version>/) &&
      contains(npmTrustedPublishing, /Dry runs do not create or edit GitHub releases/) &&
      contains(primaryLaunch, /future npm Trusted Publishing real runs create or update this release automatically/),
    "GitHub Release automation creates or updates v<version> from the release packet after successful npm publish, while dry runs remain non-mutating."
  );
  addCheck(
    checks,
    "github-release-packet",
    hasFile(githubReleasePacketPath) &&
      contains(launchKit, new RegExp(`github-release-${escapeRegex(packageJson.version)}\\.md`)) &&
      contains(githubReleasePacket, /Tag:/) &&
      contains(githubReleasePacket, new RegExp(`v${escapeRegex(packageJson.version)}`)) &&
      contains(githubReleasePacket, /Target:/) &&
      contains(githubReleasePacket, new RegExp(`Project Tiny Context Harness ${escapeRegex(packageJson.version)}`)) &&
      contains(githubReleasePacket, /Update Mode: `(sync-only|upgrade-required|manual-required)`/) &&
      contains(githubReleasePacket, /sync-only/) &&
      contains(githubReleasePacket, /upgrade-required/) &&
      contains(githubReleasePacket, /manual-required/) &&
      contains(githubReleasePacket, /safe_pending/) &&
      contains(githubReleasePacket, /manual_required/) &&
      contains(githubReleasePacket, /blocked/) &&
      contains(githubReleasePacket, /ty-context upgrade --check/) &&
      contains(githubReleasePacket, /tools\/github_release_publish\.mjs/) &&
      contains(githubReleasePacket, /Dry runs do not create or edit GitHub releases/) &&
      contains(githubReleasePacket, /npm install -D project-tiny-context-harness@latest/) &&
      contains(githubReleasePacket, /keep the memory, drop the ceremony/i) &&
      contains(githubReleasePacket, new RegExp(`Do not retarget \`v${escapeRegex(packageJson.version)}\``)) &&
      contains(githubReleasePacket, /Do not claim benchmark wins or adoption/),
    `GitHub Release packet provides exact v${packageJson.version} fields, correct tag target and claims boundaries.`
  );
  addCheck(
    checks,
    "codex-for-oss-application",
    hasFile("docs/launch/codex-for-oss-application.md") &&
      contains(launchKit, /codex-for-oss-application\.md/) &&
      contains(outreachTargets, /codex-for-oss-application\.md/) &&
      contains(codexForOssApplication, /Codex For OSS Application Packet/) &&
      contains(codexForOssApplication, /Official sources checked on 2026-06-10/) &&
      contains(codexForOssApplication, /Character count: 384/) &&
      contains(codexForOssApplication, /Character count: 302/) &&
      contains(codexForOssApplication, /Character count: 276/) &&
      contains(codexForOssApplication, /Do not claim official OpenAI integration/) &&
      contains(codexForOssApplication, /Selected for Codex for Open Source/) &&
      contains(codexForOssApplication, /not in `project_context\/\*\*`/),
    "Codex for OSS application packet has maintainer-reviewed copy fields, current-source links and no official-integration overclaim."
  );
  addCheck(
    checks,
    "openssf-best-practices-packet",
    hasFile("docs/launch/openssf-best-practices.md") &&
      contains(launchKit, /openssf-best-practices\.md/) &&
      contains(outreachTargets, /openssf-best-practices\.md/) &&
      contains(outreachTargets, /OpenSSF Best Practices \/ Baseline/) &&
      contains(openssfBestPractices, /OpenSSF Best Practices Badge Packet/) &&
      contains(openssfBestPractices, /Official sources checked on 2026-06-10/) &&
      contains(openssfBestPractices, /https:\/\/openssf\.org\/projects\/best-practices-badge\//) &&
      contains(openssfBestPractices, /https:\/\/www\.bestpractices\.dev\/en/) &&
      contains(openssfBestPractices, /getting-an-openssf-baseline-badge-with-the-best-practices-badge-system/) &&
      contains(openssfBestPractices, /Do not add a Best Practices or Baseline badge to README until the project has actually earned it/) &&
      contains(openssfBestPractices, /OpenSSF Baseline first, then Best Practices metal series/) &&
      contains(openssfBestPractices, /Current Evidence To Reuse/) &&
      contains(openssfBestPractices, /Known Gaps To Review/) &&
      contains(openssfBestPractices, /Do not mark these as met without maintainer review/) &&
      contains(openssfBestPractices, /not `project_context\/\*\*`/) &&
      contains(openssfBestPractices, /Allowed only after the official site grants a badge/) &&
      contains(openssfBestPractices, /Avoid before a badge is granted/) &&
      contains(openssfBestPractices, /Do not use badge progress as benchmark, adoption, award or productivity evidence/),
    "OpenSSF Best Practices packet prepares a maintainer-reviewed self-assessment without premature badge or compliance claims."
  );
  addCheck(
    checks,
    "release-flow-split",
    rootPackage.scripts?.["release:prepare"] === "node tools/release_prepare.mjs" &&
      rootPackage.scripts?.["release:publish"] === "node tools/release_publish.mjs" &&
      rootPackage.scripts?.["release:npm"] === "node tools/release_npm.mjs" &&
      contains(releasePrepareScript, /updatePackageVersion/) &&
      contains(releasePrepareScript, /"package", "sync-source"/) &&
      contains(releasePrepareScript, /--fast/) &&
      contains(releasePrepareScript, /releaseFocusedTests/) &&
      contains(releasePrepareScript, /"package", "check-source"/) &&
      contains(releasePrepareScript, /"release:check-version"/) &&
      contains(releasePrepareScript, /"upgrade", "--check", "--json"/) &&
      contains(releasePrepareScript, /"git", \["diff", "--check"\]/) &&
      contains(releasePublishScript, /assertPublishPrerequisites/) &&
      contains(releasePublishScript, /git", \["status", "--porcelain"\]/) &&
      contains(releasePublishScript, /git", \["branch", "--show-current"\]/) &&
      contains(releasePublishScript, /refs\/remotes\/origin\/main/) &&
      contains(releasePublishScript, /registryHasVersion/) &&
      contains(releasePublishScript, /readReleaseUpdateMode/) &&
      contains(releasePublishScript, /localFallback && !args\.yes/) &&
      contains(releasePublishScript, /publishTarball/) &&
      contains(releasePublishScript, /ensureTag/) &&
      contains(releasePublishScript, /publishGitHubRelease/) &&
      !contains(releasePublishScript, /sync_release_version|sync-source|updatePackageVersion|resolveTargetVersion/) &&
      contains(releaseScript, /compatibility entrypoint/) &&
      contains(releaseScript, /no longer accepts --version, --publish or --full-gate/) &&
      contains(releaseScript, /release:prepare/) &&
      contains(releaseScript, /release:publish/),
    "Release automation is split into a mutating prepare phase, a publish-only phase and a compatibility release:npm entrypoint."
  );
  addCheck(
    checks,
    "awesome-list-submissions",
    hasFile("docs/launch/awesome-list-submissions.md") &&
      contains(awesomeListSubmissions, /Awesome List Submission Packet/) &&
      contains(awesomeListSubmissions, /Recommended Order/) &&
      contains(awesomeListSubmissions, /fit x maintenance activity x audience scale/) &&
      contains(awesomeListSubmissions, /npm run launch:external-prs/) &&
      contains(awesomeListSubmissions, /--live --clean/) &&
      contains(awesomeListSubmissions, /Transcenda\/awesome-agentic-coding/) &&
      contains(awesomeListSubmissions, /jordimas\/awesome-agentic-engineering/) &&
      contains(awesomeListSubmissions, /awesome-opencode\/awesome-opencode/) &&
      contains(awesomeListSubmissions, /awesome-ai-devtools/) &&
      contains(awesomeListSubmissions, /bradAGI\/awesome-cli-coding-agents/) &&
      contains(awesomeListSubmissions, /ai-for-developers\/awesome-ai-coding-tools/) &&
      contains(awesomeListSubmissions, /awesome-ai-devtools\/pull\/636/) &&
      contains(awesomeListSubmissions, /awesome-cli-coding-agents\/pull\/125/) &&
      contains(awesomeListSubmissions, /awesome-ai-coding-tools\/pull\/408/) &&
      contains(awesomeListSubmissions, /ai-boost\/awesome-harness-engineering/) &&
      contains(awesomeListSubmissions, /Picrew\/awesome-agent-harness/) &&
      contains(awesomeListSubmissions, /Agent Infrastructure \/ Configuration & Context Management/) &&
      contains(awesomeListSubmissions, /external-prs\/README\.md/) &&
      contains(awesomeListSubmissions, /Do not claim adoption, benchmark wins, awards/),
    "Awesome-list submission packet has high-score curated-list PR copy and deferred-list gates."
  );
  addCheck(
    checks,
    "external-pr-packet-check",
    rootPackage.scripts?.["launch:external-prs"] === "node tools/external_pr_packet_check.mjs" &&
      hasFile("tools/external_pr_packet_check.mjs") &&
      contains(externalPrPacketScript, /Default mode is local and read-only/) &&
      contains(externalPrPacketScript, /--live clones upstream repositories into tmp/) &&
      contains(externalPrPacketScript, /git apply/) &&
      contains(externalPrPacketScript, /git diff/) &&
      contains(externalPrPacketScript, /No remaining packet should be opened automatically/) &&
      contains(externalPrPacketScript, /benchmark-proven\|proven/) &&
      contains(launchKit, /npm run launch:external-prs/) &&
      contains(launchKit, /Curated-list patch packets/) &&
      contains(awesomeListSubmissions, /npm run launch:external-prs -- --live --clean/) &&
      contains(externalPrPacket, /npm run launch:external-prs/) &&
      contains(externalPrPacket, /Recommended Opening Order/) &&
      contains(externalPrPacket, /fit x maintenance activity x audience scale/) &&
      contains(externalPrPacket, /does not fork repositories, push branches or open PRs/),
    "External PR packet check verifies curated-list packet integrity and offers an optional live patch-apply check before PR creation."
  );
  addCheck(
    checks,
    "external-pr-packets",
    hasFile("docs/launch/external-prs/README.md") &&
      hasFile("docs/launch/external-prs/transcenda-awesome-agentic-coding.patch") &&
      hasFile("docs/launch/external-prs/jordimas-awesome-agentic-engineering.patch") &&
      hasFile("docs/launch/external-prs/awesome-opencode-project-tiny-context-harness.patch") &&
      hasFile("docs/launch/external-prs/jamesmurdza-awesome-ai-devtools.patch") &&
      hasFile("docs/launch/external-prs/ai-boost-awesome-harness-engineering.patch") &&
      hasFile("docs/launch/external-prs/picrew-awesome-agent-harness-data.patch") &&
      contains(externalPrPacket, /Transcenda\/awesome-agentic-coding/) &&
      contains(externalPrPacket, /jordimas\/awesome-agentic-engineering/) &&
      contains(externalPrPacket, /awesome-opencode\/awesome-opencode/) &&
      contains(externalPrPacket, /jamesmurdza\/awesome-ai-devtools/) &&
      contains(externalPrPacket, /ai-boost\/awesome-harness-engineering/) &&
      contains(externalPrPacket, /Picrew\/awesome-agent-harness/) &&
      contains(externalPrPacket, /ai-boost\/awesome-harness-engineering\/pull\/58/) &&
      contains(externalPrPacket, /Picrew\/awesome-agent-harness\/pull\/22/) &&
      contains(externalPrPacket, /Transcenda\/awesome-agentic-coding\/pull\/4/) &&
      contains(externalPrPacket, /jordimas\/awesome-agentic-engineering\/pull\/4/) &&
      contains(externalPrPacket, /jamesmurdza\/awesome-ai-devtools\/pull\/636/) &&
      contains(externalPrPacket, /bradAGI\/awesome-cli-coding-agents\/pull\/125/) &&
      contains(externalPrPacket, /ai-for-developers\/awesome-ai-coding-tools\/pull\/408/) &&
      contains(externalPrPacket, /No remaining packet should be opened automatically/) &&
      contains(externalPrPacket, /gh repo fork Transcenda\/awesome-agentic-coding --clone/) &&
      contains(externalPrPacket, /gh repo fork jordimas\/awesome-agentic-engineering --clone/) &&
      contains(externalPrPacket, /gh repo fork awesome-opencode\/awesome-opencode --clone/) &&
      contains(externalPrPacket, /gh repo fork jamesmurdza\/awesome-ai-devtools --clone/) &&
      contains(externalPrPacket, /gh repo fork ai-boost\/awesome-harness-engineering --clone/) &&
      contains(externalPrPacket, /gh repo fork Picrew\/awesome-agent-harness --clone/) &&
      contains(externalPrPacket, /gh pr create/) &&
      contains(externalPrPacket, /Add Project Tiny Context Harness to agent instructions and skills/) &&
      contains(externalPrPacket, /Add Project Tiny Context Harness to team adoption resources/) &&
      contains(externalPrPacket, /Add Project Tiny Context Harness to projects/) &&
      contains(externalPrPacket, /Add Project Tiny Context Harness/) &&
      contains(externalPrPacket, /Add Project Tiny Context Harness to context delivery resources/) &&
      contains(externalPrPacket, /Add Project Tiny Context Harness to context engineering catalog/) &&
      contains(transcendaPatch, /Agent instructions and Skills/) &&
      contains(transcendaPatch, /minimal project-memory harness for AI coding agents/) &&
      contains(jordimasPatch, /Team Adoption/) &&
      contains(jordimasPatch, /Minimal project-memory and validation harness for teams adopting AI coding agents/) &&
      contains(awesomeOpenCodePatch, /data\/projects\/project-tiny-context-harness\.yaml/) &&
      contains(awesomeOpenCodePatch, /Minimal project memory for coding agents/) &&
      contains(awesomeOpenCodePatch, /OpenCode and other AI coding agents/) &&
      contains(awesomeAiDevtoolsPatch, /Tools that manage and sync AI agent configurations/) &&
      contains(awesomeAiDevtoolsPatch, /AI coding-agent project memory/) &&
      contains(awesomeAiDevtoolsPatch, /Codex, Claude Code, Cursor, Gemini CLI, OpenCode/) &&
      contains(aiBoostPatch, /harness-experimental/) &&
      contains(aiBoostPatch, /Seven128\/project-tiny-context-harness/) &&
      contains(aiBoostPatch, /without adding Tiny Context phase ceremony/) &&
      contains(picrewPatch, /Context & Working-State Engineering/) &&
      contains(picrewPatch, /Seven128\/project-tiny-context-harness/) &&
      contains(picrewPatch, /stars_snapshot: 0/),
    "External PR packet has exact patches, PR copy, manual gh commands and automation-boundary notes."
  );
  addCheck(checks, "launch-demo-storyboard", contains(launchKit, /Demo Storyboard/) && contains(launchKit, /fresh-agent test prompt/i) && contains(launchKit, /make validate-context/), "Launch kit has a demo storyboard tied to the README recovery test.");
  addCheck(
    checks,
    "launch-demo-packet",
    rootPackage.scripts?.["launch:demo"] === "node tools/launch_demo_capture.mjs" &&
      hasFile("tools/launch_demo_capture.mjs") &&
      hasFile("docs/launch/demo.md") &&
      hasFile("docs/launch/assets/demo-terminal.svg") &&
      contains(demoPacket, /Launch Demo Packet/) &&
      contains(demoPacket, /npm run launch:demo/) &&
      contains(demoPacket, /Repo-hosted demo media exists/) &&
      contains(demoPacket, /demo-terminal\.gif/) &&
      contains(demoPacket, /social-preview\.png/) &&
      contains(demoPacket, /product-hunt-gallery-1\.png/) &&
      contains(demoPacket, /Fresh-Agent Prompt/) &&
      contains(demoPacket, /Fresh-Agent Recovery Check/),
    "Launch demo packet has a reproducible capture command, transcript guide and repo-hosted media."
  );
  addCheck(
    checks,
    "launch-metrics-snapshot",
    rootPackage.scripts?.["launch:metrics"] === "node tools/launch_metrics_snapshot.mjs" &&
      rootPackage.scripts?.["launch:hn-snapshot"] === "node tools/launch_hn_snapshot.mjs" &&
      hasFile("tools/launch_metrics_snapshot.mjs") &&
      hasFile("tools/launch_hn_snapshot.mjs") &&
      hasFile("docs/launch/metrics.md") &&
      contains(launchKit, /metrics\.md/) &&
      contains(primaryLaunch, /npm run launch:metrics/) &&
      contains(primaryLaunch, /npm run launch:hn-snapshot/) &&
      contains(feedbackTriage, /npm run launch:hn-snapshot/) &&
      contains(outreachTargets, /npm run launch:metrics/) &&
      contains(metricsPacket, /Launch Metrics Snapshot/) &&
      contains(metricsPacket, /Do not treat stars, forks or downloads as product-quality proof/) &&
      contains(metricsScript, /project-tiny-context-harness/) &&
      contains(metricsScript, /agent-project-ty-context/) &&
      contains(metricsScript, /missing npm download data does not fail the launch/) &&
      contains(hnSnapshotScript, /hacker-news\.firebaseio\.com/) &&
      contains(hnSnapshotScript, /distribution telemetry only/),
    "Launch metrics snapshot scripts and runbook record GitHub, npm and HN distribution telemetry without turning it into product proof."
  );
  addCheck(
    checks,
    "launch-feedback-note",
    rootPackage.scripts?.["launch:feedback-note"] === "node tools/launch_feedback_note.mjs" &&
      hasFile("tools/launch_feedback_note.mjs") &&
      contains(feedbackTriage, /npm run launch:feedback-note/) &&
      contains(launchKit, /npm run launch:feedback-note/) &&
      contains(primaryLaunch, /npm run launch:feedback-note/) &&
      contains(feedbackNoteScript, /tmp\/ty-context\/launch-feedback/) &&
      contains(feedbackNoteScript, /npm run launch:hn-snapshot/) &&
      contains(feedbackNoteScript, /Do not store raw private logs/) &&
      contains(feedbackNoteScript, /adoption reports only for concrete recovery evidence/) &&
      contains(feedbackNoteScript, /Do not ask for stars, upvotes, awards or nominations/),
    "Launch feedback note command creates temporary channel triage notes that capture metrics, repeated themes and adoption evidence without becoming project Context."
  );
  addCheck(
    checks,
    "launch-demo-media",
    isGif("docs/launch/assets/demo-terminal.gif") &&
      fileSize("docs/launch/assets/demo-terminal.gif") > 100_000 &&
      pngIs("docs/launch/assets/social-preview.png", 1280, 640) &&
      pngIs("docs/launch/assets/product-hunt-gallery-1.png", 1270, 760) &&
      pngIs("docs/launch/assets/product-hunt-gallery-2.png", 1270, 760) &&
      pngIs("docs/launch/assets/product-hunt-thumbnail.png", 240, 240),
    "Launch media includes a 1280x640 social preview, animated GIF, two 1270x760 Product Hunt gallery images and a 240x240 thumbnail."
  );
  addCheck(checks, "launch-milestones", contains(launchKit, /Star \/ Adoption Milestones/) && contains(launchKit, /10 stars/) && contains(launchKit, /500 stars/), "Launch kit has star/adoption milestone triggers without treating stars as proof.");
  addCheck(
    checks,
    "market-map",
      contains(marketMap, /Market Map/) &&
      contains(marketMap, /Competitive Snapshot/) &&
      contains(marketMap, /10-100 stars/) &&
      contains(marketMap, new RegExp(`Latest release is \`Project Tiny Context Harness ${escapeRegex(packageJson.version)}\``)) &&
      contains(marketMap, /first public Show HN post and first regular HN comment are live/) &&
      contains(marketMap, /fit x maintenance activity x audience scale/) &&
      contains(marketMap, /jamesmurdza\/awesome-ai-devtools\/pull\/636/) &&
      contains(marketMap, /HN first-comment replies/) &&
      contains(marketMap, /download window is not available yet/),
    "Market map has competitor snapshot, feasibility bands and current release/readiness state."
  );
  addCheck(
    checks,
    "outreach-targets",
    contains(outreachTargets, /Outreach Targets/) &&
      contains(outreachTargets, /Priority Sequence/) &&
      contains(outreachTargets, /Curated Lists/) &&
      contains(outreachTargets, /starter issues #6-#8 remain open/) &&
      contains(outreachTargets, /#5 is closed after the repo-hosted demo packet landed/) &&
      contains(outreachTargets, /OpenSSF Scorecard workflow/) &&
      contains(outreachTargets, /Minimal Context sample project/) &&
      contains(outreachTargets, /FAQ answers/) &&
      contains(outreachTargets, new RegExp(`\`v${escapeRegex(packageJson.version)}\` is published on npm through Trusted Publishing`)) &&
      contains(outreachTargets, /first public post and first regular HN comment are live/) &&
      contains(outreachTargets, /https:\/\/news\.ycombinator\.com\/item\?id=48481205/) &&
      contains(outreachTargets, /Seven curated-list PRs are open/) &&
      contains(outreachTargets, /fit x maintenance activity x audience scale/) &&
      contains(outreachTargets, /awesome-ai-devtools\/pull\/636/) &&
      contains(outreachTargets, /awesome-cli-coding-agents\/pull\/125/) &&
      contains(outreachTargets, /awesome-ai-coding-tools\/pull\/408/) &&
      contains(outreachTargets, /awesome-list-submissions\.md/) &&
      contains(outreachTargets, /Awards/) &&
      contains(outreachTargets, /Do not submit to award programs before the demo and first public feedback exist/),
    "Outreach targets map current launch, curated-list and award gates."
  );
  addCheck(
    checks,
    "community-health-files",
    hasFile("CODE_OF_CONDUCT.md") &&
      hasFile("SUPPORT.md") &&
      hasFile("GOVERNANCE.md") &&
      contains(codeOfConduct, /Expected Behavior/) &&
      contains(codeOfConduct, /Unacceptable Behavior/) &&
      contains(codeOfConduct, /Conduct contact needed/) &&
      contains(codeOfConduct, /Security vulnerabilities should follow \[SECURITY\.md\]/) &&
      contains(support, /Before Opening An Issue/) &&
      contains(support, /Where To Ask/) &&
      contains(support, /Adoption report issue template/) &&
      contains(support, /CODE_OF_CONDUCT\.md/) &&
      contains(support, /SECURITY\.md/) &&
      contains(support, /GOVERNANCE\.md/) &&
      contains(support, /npm install or registry metadata is failing/) &&
      contains(governance, /single-maintainer open source project/) &&
      contains(governance, /Repo-native project memory for fresh-agent recovery/) &&
      contains(governance, /Minimal Context boundary/) &&
      contains(governance, /Maintainers handle releases/) &&
      contains(governance, /Do not create a renamed npm-package GitHub Release or broad launch post if registry verification or the strict external launch gate fails/) &&
      contains(governance, /single-maintainer and evidence-gated/) &&
      contains(contributing, /SUPPORT\.md/) &&
      contains(contributing, /GOVERNANCE\.md/) &&
      contains(contributing, /CODE_OF_CONDUCT\.md/) &&
      contains(launchKit, /CODE_OF_CONDUCT\.md/) &&
      contains(launchKit, /SUPPORT\.md/) &&
      contains(launchKit, /GOVERNANCE\.md/) &&
      contains(openssfBestPractices, /Governance/) &&
      contains(openssfBestPractices, /single-maintainer governance/) &&
      contains(openssfBestPractices, /Conduct standards/) &&
      contains(openssfBestPractices, /Support path/),
    "Community health files route support, conduct, governance, security and adoption feedback for public contributors."
  );
  addCheck(checks, "contributing", hasFile("CONTRIBUTING.md") && contains(contributing, /Do not claim benchmark wins/), "CONTRIBUTING.md exists and preserves benchmark-claim boundary.");
  addCheck(checks, "security-policy", hasFile("SECURITY.md") && contains(read("SECURITY.md"), /Reporting A Vulnerability/) && contains(read("SECURITY.md"), /Unsafe file writes/), "SECURITY.md exists with private reporting and Harness-specific scope.");
  addCheck(checks, "dependabot", hasFile(".github/dependabot.yml") && contains(read(".github/dependabot.yml"), /package-ecosystem: "npm"/) && contains(read(".github/dependabot.yml"), /package-ecosystem: "github-actions"/), "Dependabot checks npm and GitHub Actions ecosystems.");
  addCheck(
    checks,
    "scorecard-workflow",
    hasFile(".github/workflows/scorecard.yml") &&
      contains(scorecardWorkflow, /name: OpenSSF Scorecard/) &&
      contains(scorecardWorkflow, /branches:\s*\n\s+- main/) &&
      contains(scorecardWorkflow, /schedule:\s*\n\s+- cron:/) &&
      contains(scorecardWorkflow, /workflow_dispatch:/) &&
      contains(scorecardWorkflow, /security-events: write/) &&
      contains(scorecardWorkflow, /id-token: write/) &&
      contains(scorecardWorkflow, /uses: actions\/checkout@[a-f0-9]{40}/) &&
      contains(scorecardWorkflow, /uses: ossf\/scorecard-action@[a-f0-9]{40}/) &&
      contains(scorecardWorkflow, /results_format: sarif/) &&
      contains(scorecardWorkflow, /publish_results: true/) &&
      contains(scorecardWorkflow, /uses: actions\/upload-artifact@[a-f0-9]{40}/) &&
      contains(scorecardWorkflow, /uses: github\/codeql-action\/upload-sarif@[a-f0-9]{40}/),
    "OpenSSF Scorecard workflow publishes SARIF results and public scorecard data with narrow permissions."
  );
  addCheck(checks, "issue-templates", hasFile(".github/ISSUE_TEMPLATE/bug_report.yml") && hasFile(".github/ISSUE_TEMPLATE/feature_request.yml"), "Bug and feature issue templates exist.");
  addCheck(
    checks,
    "issue-template-routing",
    hasFile(".github/ISSUE_TEMPLATE/config.yml") &&
      contains(issueTemplateConfig, /blank_issues_enabled:\s*false/) &&
      contains(issueTemplateConfig, /Security vulnerability/) &&
      contains(issueTemplateConfig, /SECURITY\.md/) &&
      contains(issueTemplateConfig, /Support routing/) &&
      contains(issueTemplateConfig, /SUPPORT\.md/) &&
      contains(issueTemplateConfig, /Context recovery gap/) &&
      contains(issueTemplateConfig, /context_gap\.yml/) &&
      contains(issueTemplateConfig, /Source preview report/) &&
      contains(issueTemplateConfig, /source_preview_report\.yml/) &&
      contains(support, /issue chooser/) &&
      contains(launchKit, /issue chooser routing/),
    "Issue chooser disables blank issues and routes security, support and Context recovery feedback to the prepared surfaces."
  );
  addCheck(
    checks,
    "context-gap-template",
    hasFile(".github/ISSUE_TEMPLATE/context_gap.yml") &&
      contains(contextGapTemplate, /Context recovery gap/) &&
      contains(contextGapTemplate, /Missing or unclear recovery fact/) &&
      contains(contextGapTemplate, /README first screen/) &&
      contains(contextGapTemplate, /Browseable sample repository/) &&
      contains(contextGapTemplate, /Package-generated project_context\/\*\*/) &&
      contains(contextGapTemplate, /I removed secrets, customer details, private repository names, raw chat logs and private code/) &&
      contains(support, /Context recovery gap issue template/) &&
      contains(launchKit, /Context recovery gap form/) &&
      contains(rootReadme, /context_gap\.yml/) &&
      contains(packageReadme, /context_gap\.yml/),
    "Context recovery gap issue template gives non-adopters a low-friction way to report unclear recovery facts without sharing private data."
  );
  addCheck(
    checks,
    "adoption-report-template",
    hasFile(".github/ISSUE_TEMPLATE/adoption_report.yml") &&
      contains(adoptionReportTemplate, /What was the agent forgetting or rediscovering/) &&
      contains(adoptionReportTemplate, /Short adoption story/) &&
      contains(adoptionReportTemplate, /Public quote \/ story consent/) &&
      contains(adoptionReportTemplate, /No public quote/) &&
      contains(adoptionReportTemplate, /Anonymous role only/) &&
      contains(adoptionReportTemplate, /GitHub username and public link/) &&
      contains(adoptionReportTemplate, /Approved quote or paraphrase/) &&
      contains(adoptionReportTemplate, /Public link for attribution/) &&
      contains(adoptionReportTemplate, /I removed secrets, customer details, private repository names, raw chat logs and private code/) &&
      contains(rootReadme, /adoption report/),
    "Adoption-report issue template exists, README links to it, and public story consent/privacy fields are present."
  );
  addCheck(checks, "pr-template", hasFile(".github/PULL_REQUEST_TEMPLATE.md"), "Pull request template exists.");
  addCheck(checks, "quickstart-smoke", hasFile("tools/quickstart_smoke.mjs") && rootPackage.scripts?.["smoke:quickstart"], "Quickstart smoke script and npm script exist.");
  addCheck(
    checks,
    "launch-check-script",
    rootPackage.scripts?.["launch:check"] === "node tools/launch_readiness_check.mjs --offline" &&
      rootPackage.scripts?.["launch:strict-external"] === "node tools/launch_readiness_check.mjs --strict-external" &&
      contains(launchKit, /npm run launch:strict-external/) &&
      contains(prelaunchExternalBlockers, /npm run launch:strict-external/),
    "launch:check runs the offline readiness check and launch:strict-external runs the live GitHub/npm gate."
  );

  addCheck(
    checks,
    "consumer-workflow-boundary",
    contains(sourceWorkflow, /Run harness gate/) &&
      contains(sourceWorkflow, /Prepare source workspace CLI/) &&
      contains(sourceWorkflow, /uses: actions\/checkout@[a-f0-9]{40}/) &&
      contains(sourceWorkflow, /uses: actions\/setup-node@[a-f0-9]{40}/) &&
      contains(sourceWorkflow, /hashFiles\('packages\/ty-context\/package\.json'\) != ''/) &&
      contains(sourceWorkflow, /npm run build --workspace project-tiny-context-harness/) &&
      !contains(sourceWorkflow, /npm test --workspace project-tiny-context-harness|package check-source|npm publish/),
    "Consumer workflow runs the Harness gate, allows a source-workspace-only local CLI build, and excludes maintainer package checks."
  );
  addCheck(
    checks,
    "maintainer-workflow",
    contains(maintainerWorkflow, /\.github\/workflows\/npm-publish\.yml/) &&
      contains(maintainerWorkflow, /\.github\/workflows\/scorecard\.yml/) &&
      contains(maintainerWorkflow, /uses: actions\/checkout@[a-f0-9]{40}/) &&
      contains(maintainerWorkflow, /uses: actions\/setup-node@[a-f0-9]{40}/) &&
      contains(maintainerWorkflow, /Check package canonical source drift/) &&
      contains(maintainerWorkflow, /node packages\/ty-context\/dist\/cli\.js package check-source/) &&
      contains(maintainerWorkflow, /Validate Context and touched-source modularity/) &&
      contains(maintainerWorkflow, /make validate-harness/) &&
      contains(maintainerWorkflow, /Typecheck package/) &&
      contains(maintainerWorkflow, /Complete package tests/) &&
      contains(maintainerWorkflow, /npm test --workspace project-tiny-context-harness/) &&
      !contains(maintainerWorkflow, /npm run test:long-task-workflow/) &&
      contains(maintainerWorkflow, /node tools\/quickstart_smoke\.mjs/) &&
      contains(maintainerWorkflow, /npm run preview:pack/),
    "Maintainer package CI runs the complete default and Long-Task Workflow suites on submitted branches, pull requests and main."
  );
  addCheck(
    checks,
    "node-engine-ci-matrix",
    packageJson.engines?.node === ">=24" && contains(maintainerWorkflow, /node-version:\s*"24"/),
    "Package CI uses the declared Node >=24 floor."
  );

  return checks;
}

async function externalChecks(localPackageJson) {
  const checks = [];
  let github = null;
  let latestRelease = null;
  let npmLatest = null;
  let downloads = null;

  try {
    github = await requestJson("https://api.github.com/repos/Seven128/project-tiny-context-harness");
    const requiredTopics = [
      "ai-agents",
      "coding-agent",
      "codex",
      "claude-code",
      "cursor",
      "gemini-cli",
      "opencode",
      "agent-context",
      "context-engineering",
      "context-management",
      "agents-md",
      "project-memory",
      "agent-memory",
      "ai-coding",
      "developer-tools",
      "developer-productivity",
      "cli",
      "ty-context",
      "workflow"
    ];
    const githubTopics = Array.isArray(github.topics) ? github.topics : [];
    addCheck(checks, "github-description", github.description === "Minimal project memory and validation harness for AI coding agents.", `GitHub description: ${github.description ?? "(empty)"}`, "external");
    addCheck(checks, "github-license", github.license?.spdx_id === "MIT", `GitHub detected license: ${github.license?.spdx_id ?? "(none)"}`, "external");
    addCheck(checks, "github-topics", requiredTopics.every((topic) => githubTopics.includes(topic)), `GitHub topics: ${githubTopics.length > 0 ? githubTopics.join(", ") : "(none)"}`, "external");
    addCheck(checks, "github-stars", typeof github.stargazers_count === "number", `GitHub stars: ${github.stargazers_count}`, "external-info");
    addCheck(checks, "github-forks", typeof github.forks_count === "number", `GitHub forks: ${github.forks_count}`, "external-info");
  } catch (error) {
    addCheck(checks, "github-fetch", false, error instanceof Error ? error.message : String(error), "external");
  }

  try {
    latestRelease = await requestJson("https://api.github.com/repos/Seven128/project-tiny-context-harness/releases/latest");
    const latestReleaseName = latestRelease.name ?? "";
    const latestReleaseBody = latestRelease.body ?? "";
    const legacyRenameRelease =
      latestReleaseName === "Project Tiny Context Harness 0.2.39 - legacy npm package" &&
      /predates the npm package rename/i.test(latestReleaseBody) &&
      /agent-project-ty-context version 0\.2\.39/i.test(latestReleaseBody) &&
      /project-tiny-context-harness latest/i.test(latestReleaseBody) &&
      /does not claim benchmark-proven delivery speedups/i.test(latestReleaseBody);
    const currentReleaseTitle = `Project Tiny Context Harness ${localPackageJson.version}`;
    const currentRenamedRelease =
      latestReleaseName === currentReleaseTitle &&
      /current public release line under the renamed npm package/i.test(latestReleaseBody) &&
      /project-tiny-context-harness@latest/i.test(latestReleaseBody) &&
      /keep the memory, drop the ceremony/i.test(latestReleaseBody) &&
      /does not claim benchmark-proven speedups/i.test(latestReleaseBody);
    addCheck(
      checks,
      "github-release-title",
      legacyRenameRelease || currentRenamedRelease,
      `GitHub latest release title: ${latestRelease.name ?? "(empty)"}`,
      "external"
    );
    addCheck(
      checks,
      "github-release-rename-boundary",
      legacyRenameRelease || currentRenamedRelease,
      "GitHub latest release is either the legacy rename-boundary release or the current renamed-package release, with no benchmark/adoption overclaim.",
      "external"
    );
  } catch (error) {
    addCheck(checks, "github-release-fetch", false, error instanceof Error ? error.message : String(error), "external");
  }

  try {
    npmLatest = await requestJson("https://registry.npmjs.org/project-tiny-context-harness/latest");
    addCheck(checks, "npm-description", npmLatest.description === localPackageJson.description, `npm latest description: ${npmLatest.description ?? "(empty)"}`, "external");
    addCheck(checks, "npm-license", npmLatest.license === localPackageJson.license, `npm latest license: ${npmLatest.license ?? "(none)"}`, "external");
    addCheck(checks, "npm-homepage", npmLatest.homepage === localPackageJson.homepage, `npm latest homepage: ${npmLatest.homepage ?? "(none)"}`, "external");
    addCheck(checks, "npm-keywords", localPackageJson.keywords.every((keyword) => npmLatest.keywords?.includes(keyword)), `npm latest keywords: ${npmLatest.keywords?.join(", ") ?? "(none)"}`, "external");
    addCheck(checks, "npm-repository", npmLatest.repository?.url === localPackageJson.repository?.url, `npm latest repository: ${npmLatest.repository?.url ?? "(none)"}`, "external");
    addCheck(checks, "npm-bugs", npmLatest.bugs?.url === localPackageJson.bugs?.url, `npm latest bugs URL: ${npmLatest.bugs?.url ?? "(none)"}`, "external");
    addCheck(checks, "npm-version", npmLatest.version === localPackageJson.version, `npm latest version: ${npmLatest.version}`, "external-info");
    let npmReadme = npmLatest.readme ?? "";
    let npmReadmeSource = "npm latest metadata";
    let npmReadmeFetchError = null;
    if (!npmReadme) {
      try {
        const npmPackage = await requestJson("https://registry.npmjs.org/project-tiny-context-harness");
        npmReadme = npmPackage.readme ?? "";
        npmReadmeSource = "npm package metadata";
      } catch (error) {
        npmReadmeFetchError = error instanceof Error ? error.message : String(error);
      }
    }
    const npmReadmeHasOldSurface = contains(
      npmReadme,
      /AI Tiny Context Harness|agent-project-ty-context|project-agent-ty-context|stage-based Tiny Context Harness/
    );
    addCheck(
      checks,
      "npm-readme-renamed-surfaces",
      Boolean(npmReadme) && !npmReadmeHasOldSurface,
      !npmReadme
        ? `npm registry did not return README content${npmReadmeFetchError ? `: ${npmReadmeFetchError}` : "."}`
        : npmReadmeHasOldSurface
          ? `npm README from ${npmReadmeSource} still contains a pre-rename phrase from the immutable published version; publish a new patch version after local README changes to refresh the npm page.`
          : `npm README from ${npmReadmeSource} has no old display, package or repository names.`,
      "external-info"
    );
  } catch (error) {
    addCheck(checks, "npm-fetch", false, error instanceof Error ? error.message : String(error), "external");
  }

  if (github) {
    const prepublishHomepage = "https://github.com/Seven128/project-tiny-context-harness";
    const postpublishHomepage = "https://www.npmjs.com/package/project-tiny-context-harness";
    const expectedHomepage = npmLatest ? postpublishHomepage : prepublishHomepage;
    const expectedState = npmLatest ? "published npm package page" : "GitHub repository while npm returns 404";
    addCheck(
      checks,
      "github-homepage",
      github.homepage === expectedHomepage,
      `GitHub homepage: ${github.homepage ?? "(empty)"}; expected ${expectedHomepage} (${expectedState}).`,
      "external"
    );
  }

  try {
    downloads = await requestJson("https://api.npmjs.org/downloads/point/last-week/project-tiny-context-harness");
    addCheck(checks, "npm-downloads", typeof downloads.downloads === "number", `npm downloads last week: ${downloads.downloads} (${downloads.start} to ${downloads.end})`, "external-info");
  } catch (error) {
    addCheck(checks, "npm-downloads-fetch", false, error instanceof Error ? error.message : String(error), "external-info");
  }
  return { checks, github, latestRelease, npmLatest, downloads };
}

function summarize(checks, options) {
  const requiredFailures = checks.filter((check) => !check.ok && check.severity === "required");
  const externalFailures = checks.filter((check) => !check.ok && check.severity === "external");
  const exitOk = requiredFailures.length === 0 && (!options.strictExternal || externalFailures.length === 0);
  let status = "pass";
  if (requiredFailures.length > 0 || (options.strictExternal && externalFailures.length > 0)) {
    status = "fail";
  } else if (externalFailures.length > 0) {
    status = "local-pass-external-action-needed";
  }
  return { status, exitOk, requiredFailures, externalFailures };
}

function nextActionForFailedCheck(check) {
  if (check.id === "npm-fetch") {
    return `Run \`npm run launch:npm-access\` to inspect npm auth and package state, prepare ordinary Skill/assets patch releases with \`npm run release:prepare -- --fast --version ${localPackageJson.version} --update-mode sync-only\`, commit and push it, then publish with [docs/launch/npm-trusted-publishing.md](docs/launch/npm-trusted-publishing.md); if local fallback returns E403, use [docs/launch/npm-credential-unblock.md](docs/launch/npm-credential-unblock.md).`;
  }
  if (check.id === "github-homepage") {
    return "Run `npm run launch:github-metadata` to inspect the GitHub About drift; from a trusted shell with `GITHUB_TOKEN` or `GH_TOKEN`, run `npm run launch:github-metadata -- --apply`, or use [docs/launch/github-metadata.md](docs/launch/github-metadata.md) manually.";
  }
  return `Update external metadata or publish a new package for \`${check.id}\`.`;
}

function renderMarkdown(report) {
  const lines = [
    "# Launch Readiness Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.offline ? "offline" : "online"}`,
    `Status: ${report.summary.status}`,
    "",
    "## Local Checks",
    ""
  ];

  for (const check of report.localChecks) {
    lines.push(`- ${check.ok ? "PASS" : "FAIL"} ${check.id}: ${check.detail}`);
  }

  if (report.externalChecks.length > 0) {
    lines.push("", "## External Checks", "");
    for (const check of report.externalChecks) {
      const label = check.severity === "external-info" ? "INFO" : check.ok ? "PASS" : "TODO";
      lines.push(`- ${label} ${check.id}: ${check.detail}`);
    }
  } else {
    lines.push("", "## External Checks", "", "- Skipped because --offline was set.");
  }

  lines.push("", "## Next Actions", "");
  if (report.summary.requiredFailures.length > 0) {
    for (const check of report.summary.requiredFailures) {
      lines.push(`- Fix local readiness check: ${check.id}.`);
    }
  } else {
    lines.push("- Local launch surface is ready for review.");
  }
  if (report.summary.externalFailures.length > 0) {
    for (const check of report.summary.externalFailures) {
      lines.push(`- ${check.id}: ${nextActionForFailedCheck(check)}`);
    }
  }
  if (report.offline) {
    lines.push("- Run without --offline before launch to compare public GitHub/npm metadata.");
  }

  return `${lines.join("\n")}\n`;
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const localPackageJson = readJson("packages/ty-context/package.json");
const local = localChecks();
let external = { checks: [] };
if (!options.offline) {
  try {
    external = await externalChecks(localPackageJson);
  } catch (error) {
    addCheck(external.checks, "external-fetch", false, error instanceof Error ? error.message : String(error), "external");
  }
}

const allChecks = [...local, ...external.checks];
const summary = summarize(allChecks, options);
const report = {
  generatedAt: new Date().toISOString(),
  offline: options.offline,
  strictExternal: options.strictExternal,
  summary,
  localChecks: local,
  externalChecks: external.checks
};

const output = options.json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report);
if (options.output) {
  writeFileSync(options.output, output, "utf8");
}
process.stdout.write(output);
process.exitCode = summary.exitOk ? 0 : 1;
