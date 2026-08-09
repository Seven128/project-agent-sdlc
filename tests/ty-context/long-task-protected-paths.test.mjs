import assert from "node:assert/strict";
import {
  link,
  mkdir,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  createDeliveryFixture,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("runner target symlink is rejected", async (t) => {
  const fixture = await createDeliveryFixture();
  try {
    if (
      !(await replaceWithSymlink(
        t,
        path.join(
          fixture.root,
          ...fixture.contract.outcomes[0].acceptance.checks[0].runner.target.split(
            "/",
          ),
        ),
      ))
    )
      return;
    await assert.rejects(
      compileFixture(fixture),
      /protected_input_symlink_not_allowed:first-check\.runner_target/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("verification input symlink is rejected", async (t) => {
  const fixture = await createDeliveryFixture();
  try {
    const helper = path.join(fixture.root, "tests", "helper.mjs");
    await writeFile(helper, "export {};\n");
    if (!(await replaceWithSymlink(t, helper))) return;
    fixture.contract.outcomes[0].acceptance.checks[0].verification_inputs.push(
      "tests/helper.mjs",
    );
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileFixture(fixture),
      /protected_input_symlink_not_allowed:first-check\.verification_input/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Source file symlink is rejected", async (t) => {
  const fixture = await createDeliveryFixture();
  try {
    if (!(await replaceWithSymlink(t, path.join(fixture.root, "source.md"))))
      return;
    await assert.rejects(
      compileFixture(fixture),
      /protected_input_symlink_not_allowed:source\[0\]/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Outcome fragment symlink is rejected", async (t) => {
  const fixture = await createDeliveryFixture();
  try {
    const folder = path.join(fixture.workdir, "outcomes");
    await mkdir(folder, { recursive: true });
    const rootContract = structuredClone(fixture.contract);
    const [outcome] = rootContract.outcomes;
    delete rootContract.outcomes;
    rootContract.outcome_files = ["outcomes/first.yaml"];
    await writeContract(fixture.workdir, rootContract);
    const fragment = path.join(folder, "first.yaml");
    await writeFile(fragment, YAML.stringify(outcome));
    if (!(await replaceWithSymlink(t, fragment))) return;
    await assert.rejects(
      compileFixture(fixture),
      /protected_input_symlink_not_allowed:outcome_fragment:outcomes\/first\.yaml/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("detectable hardlink for a protected Source file is rejected", async (t) => {
  const fixture = await createDeliveryFixture();
  try {
    const source = path.join(fixture.root, "source.md");
    const original = path.join(fixture.root, "source-original.md");
    await rename(source, original);
    try {
      await link(original, source);
    } catch (error) {
      if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) {
        t.skip(`hardlink unsupported: ${error.code}`);
        return;
      }
      throw error;
    }
    if ((await stat(source)).nlink <= 1) {
      t.skip("filesystem does not expose a detectable hardlink count");
      return;
    }
    await assert.rejects(
      compileFixture(fixture),
      /protected_input_hardlink_not_allowed:source\[0\]/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("ordinary protected files and source.md#anchor compile successfully", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const compiled = await compileFixture(fixture);
    assert.equal(compiled.source_hashes["source.md"].length, 64);
    assert.equal(
      compiled.source_claims[0].source_ref,
      "source.md#fixture-source",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function compileFixture(fixture) {
  return compileDeliveryContract(fixture.workdir, fixture.root, {
    require_completion_gate: false,
  });
}

async function replaceWithSymlink(t, file) {
  const real = `${file}.real`;
  await rename(file, real);
  try {
    await symlink(path.basename(real), file, "file");
    return true;
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error.code)) {
      t.skip(`symlink unsupported: ${error.code}`);
      return false;
    }
    throw error;
  }
}
