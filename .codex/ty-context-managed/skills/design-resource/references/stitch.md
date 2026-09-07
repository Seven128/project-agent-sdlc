# Stitch MCP operations

Use this reference when generating or visually revising design resources. Stitch is the selected provider: prefer its official MCP connection, with its authenticated official website as a fallback for a needed operation. Keep project style, business and interaction requirements in their existing Context owners. Reading or adopting existing resources does not require a new Stitch submission.

## Connect and discover

Discover the host's available Stitch tools and read their descriptions and input schemas before calling them. Tool prefixes vary by host; the operation names below are discovery targets, not a promise that a particular prefixed function exists. If the host offers deferred tool discovery, use it before concluding that the connection is absent. With an existing MCP client, use its normal initialization and `tools/list`; do not build a new adapter or install another agent CLI just for this capability.

The endpoint is `https://stitch.googleapis.com/mcp` over Streamable HTTP. The official extension supports a Stitch API key through `X-Goog-Api-Key`, or Google credentials with a quota project. Reuse an authorized connection and the host's supported secret storage; do not copy keys, tokens or authentication headers into prompts, resource records, code or terminal output. `agents/openai.yaml` provides a dependency hint for supporting hosts; copying this Skill does not authenticate a connection or modify host configuration. See [API-key connection](https://github.com/gemini-cli-extensions/stitch/blob/e22b3aac9a43bce2d740c5172844e9a2eebba37f/gemini-extension-apikey.json), [Google-credentials connection](https://github.com/gemini-cli-extensions/stitch/blob/e22b3aac9a43bce2d740c5172844e9a2eebba37f/gemini-extension-adc.json) and [current setup](https://stitch.withgoogle.com/docs/mcp/setup).

Verify the needed connection through a relevant read, such as the known project or its screens, before submitting generation. A listed tool is not evidence of account access. If connection setup is needed, follow the current official instructions and task authorization. If a missing login or permission cannot be resolved, explain the exact prerequisite and continue independent work. Do not silently use a different generator.

## Choose the operation and target

The Google Labs published SDK manifest provides the following call shapes. It is a reference snapshot, not a guaranteed live service schema; use the connected tool's current schema and supported values. Do not hardcode a model list or create a design system merely because an optional parameter exists. [Published tool manifest](https://github.com/google-labs-code/stitch-sdk/blob/575a9fb6319bd9d1ce8175e4a89e5958e024bbfd/packages/sdk/generated/tools-manifest.json)

| Intent | Operation and arguments to verify |
| --- | --- |
| Find the intended existing project | `list_projects` with optional `filter`; `get_project` with `name: projects/{projectId}` |
| Create a project when the task needs one | `create_project` with optional `title`; retain its returned identity |
| Find and read selected screens | `list_screens` with `projectId`; `get_screen` with `name: projects/{projectId}/screens/{screenId}` |
| Generate an initial screen | `generate_screen_from_text` with `projectId`, `prompt`; optional `deviceType`, `modelId`, `designSystem` only when appropriate and supported |
| Revise the chosen screen | `edit_screens` with `projectId`, `selectedScreenIds`, `prompt`; optional supported device/model settings |
| Explore requested alternatives of selected screens | `generate_variants` with `projectId`, `selectedScreenIds`, `prompt`, `variantOptions` |

Use returned identities and the user's selected scope. Names are resource paths; project and selected-screen IDs are bare IDs where the live schema requests them. The published `get_screen` schema also requires deprecated `projectId` and `screenId` alongside `name`; if the live schema does too, supply consistent values for all three. Never guess an ID or use the most recent unrelated screen as the target. Inspect selected screens before editing and retain the before version.

For a new design, reuse the intended project or create a task-appropriate one. For continuation, edit the selected screen instead of restarting generation. Variants are an explicit exploration choice: choose any `variantCount`, `creativeRange` and `aspects` from the user's requested scope and live schema, not a fixed comparison ritual. Preserve additional returned candidates without silently adopting or expanding work to them. [Stitch generation and revision examples](https://github.com/google-labs-code/stitch-skills/blob/0337446dadde6f8c94210444e2aa9d546126480f/plugins/stitch-design/skills/generate-design/SKILL.md)

## Submit useful inputs

Separate content/actions that must remain, confirmed visual direction, requested changes, disliked problems and still-open exploration. Identify a reference's relevant region and purpose; liking one region does not approve the whole candidate. Label agent inferences and technical findings separately from user preferences. Send these focused inputs to Stitch, preserving confirmed design values without inventing a full typography/spacing system as a prerequisite. Do not include unrelated task history or another tool's commands.

A path written into a text prompt does not upload an image. When image input is required, inspect the actual upload or attachment capability. Use a supported Stitch upload and its returned asset/screen identity, or the official website's real upload/paste flow. Confirm the correct reference reached the target. Do not add invented local-file or image-data parameters to text-generation/edit tools. If the operation cannot be automated, retain a ready-to-submit prompt, reference files and their intended use; report what was not submitted. [Upstream image-import route](https://github.com/google-labs-code/stitch-skills/blob/0337446dadde6f8c94210444e2aa9d546126480f/plugins/stitch-design/skills/upload-to-stitch/SKILL.md)

Use the request's page/state count and budget. Keep already selected directions and unchanged requirements. A user's selection without a requested modification does not require another generation or revision. Tool choice itself grants no additional publication, purchase or production-edit authority.

## Observe writes and recover uncertain outcomes

Before a write, retain the target project, selected screen identities, submitted input and known before state. Read the tool result, including MCP `isError`, service messages and available structured content. Transport success is not design success. Preserve returned project/session/screen identifiers, relevant progress and every produced design; suggestions in a response are not authorization to launch more work.

Generation and visual-edit calls may keep running after a timeout or connection loss. Do not automatically resubmit an uncertain write. Retain and follow any live host operation handle. When an output screen is known, refresh it; when none was returned, inspect the target project's screens to locate the actual output. An empty or unchanged read alone does not prove the write never ran. Use the current tool's recovery instructions: the published generation/variant guidance describes reads at 30-second intervals, bounded to ten checks. If that bound ends without a resolved outcome, report it as unresolved, retain the recovery identifiers and continue independent work. Do not turn a monitoring timeout into a new generation. [Tool recovery descriptions](https://github.com/google-labs-code/stitch-sdk/blob/575a9fb6319bd9d1ce8175e4a89e5958e024bbfd/packages/sdk/generated/tools-manifest.json)

For a confirmed rejection before submission, fix the specific cause and retry only if safe, within the task budget and allowed by the live tool. Keep technical recovery distinct from a requested visual revision; stop repeating a failed technical attempt. A retry allowance does not override Stitch's no-resubmission guidance for uncertain generation/edit outcomes.

## Retrieve, inspect and preserve real outputs

Refresh edited screens before judging the result. Some clients cache screen data; an old URL or success message does not prove that the requested change persisted. The published result shape can contain `outputComponents[].design.screens[]`; `get_screen` returns screen data directly. Inspect the actual result shape, preserve every returned design and use returned `htmlCode.downloadUrl` and `screenshot.downloadUrl` when present. These are URLs, not already saved files. Use available download capabilities to materialize the exact files and verify the saved content. [Screen result handling](https://github.com/google-labs-code/stitch-sdk/blob/575a9fb6319bd9d1ce8175e4a89e5958e024bbfd/packages/sdk/generated/src/screen.ts), [SDK resource access](https://github.com/google-labs-code/stitch-sdk/blob/575a9fb6319bd9d1ce8175e4a89e5958e024bbfd/README.md)

Keep original Stitch files, actual submitted prompts, reference origins/purpose and needed before/after versions. Record stable project links when actually available; do not manufacture share links or publish a project to obtain one. Use transient download credentials only for retrieval and redact them from saved transport records. Preserve original generation dimensions and explain any difference from the requested comparison conditions. View current screenshots and render current HTML when relevant; inspect completeness, clipping, readability, assets, hit regions and supported interaction against the task's requirements. Do not remove information or shrink an entire design merely to make a comparison look cleaner.

For an edit, verify both the requested change and the features that should have stayed. Save subsequent manual or agent code repairs as distinct revisions, not as untouched Stitch output. HTML can be editable without being a native design-node document. Report screenshot-only delivery or missing exports honestly. A requested downstream conversion is separate work: preserve the Stitch original and open/check the converted result before claiming that format. Another design tool is not a prerequisite or substitute for Stitch generation.

Keep optional model/mode and usage observations task-local when they help. The host model and Stitch service model are different; do not infer the latter from the former. Unknown usage remains unknown, and an account-wide quota change is not evidence of the cost of one screen. Product defects, user preference, source editability, adoption and production verification remain separate conclusions. Use [adoption and Context ownership](adoption.md) when applying an authorized adoption.
